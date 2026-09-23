import { BadRequestException, Injectable } from '@nestjs/common';
import type { CompanyPlan } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PLAN_LIMITS, type PlanLimits } from './plan-limits';

export type PlanUsage = {
  plan: CompanyPlan;
  limits: PlanLimits;
  usage: {
    technicians: number;
    admins: number;
    sites: number;
    assets: number;
    storageMb: number;
  };
};

const BYTES_PER_MB = 1024 * 1024;

// Centraliza la comprobación de límites por plan. Antes cada módulo
// repetía su propia consulta "company.plan -> comparar" (solo existía
// para técnicos, en company-users.service.ts); esto lo deja en un único
// sitio testeable y hace que aplicar un límite nuevo sea una línea.
@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPlan(companyId: string): Promise<CompanyPlan> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { plan: true },
    });

    return company.plan;
  }

  private async assertCount(
    companyId: string,
    resourceLabel: string,
    max: number,
    plan: CompanyPlan,
    count: () => Promise<number>,
  ): Promise<void> {
    const current = await count();

    if (current >= max) {
      throw new BadRequestException(
        `Tu plan ${plan} permite hasta ${max} ${resourceLabel}.`,
      );
    }
  }

  async assertTechnicianLimit(companyId: string): Promise<void> {
    const plan = await this.getPlan(companyId);

    await this.assertCount(
      companyId,
      'técnicos',
      PLAN_LIMITS[plan].maxTechnicians,
      plan,
      () =>
        this.prisma.userCompany.count({
          where: {
            companyId,
            role: 'TECHNICIAN',
            active: true,
            user: { isActive: true },
          },
        }),
    );
  }

  async assertAdminLimit(companyId: string): Promise<void> {
    const plan = await this.getPlan(companyId);

    await this.assertCount(
      companyId,
      'administradores',
      PLAN_LIMITS[plan].maxAdmins,
      plan,
      () =>
        this.prisma.userCompany.count({
          where: {
            companyId,
            role: 'ADMIN',
            active: true,
            user: { isActive: true },
          },
        }),
    );
  }

  async assertSiteLimit(companyId: string): Promise<void> {
    const plan = await this.getPlan(companyId);

    await this.assertCount(
      companyId,
      'sitios',
      PLAN_LIMITS[plan].maxSites,
      plan,
      () => this.prisma.site.count({ where: { companyId } }),
    );
  }

  async assertAssetLimit(companyId: string): Promise<void> {
    const plan = await this.getPlan(companyId);

    await this.assertCount(
      companyId,
      'activos',
      PLAN_LIMITS[plan].maxAssets,
      plan,
      () => this.prisma.asset.count({ where: { companyId } }),
    );
  }

  // A diferencia de los demás (que comparan un conteo), el almacenamiento
  // compara bytes ya usados + lo que se va a subir contra el límite del
  // plan — se comprueba ANTES de subir el archivo a MinIO.
  async assertStorageLimit(companyId: string, incomingBytes: number): Promise<void> {
    const plan = await this.getPlan(companyId);
    const maxBytes = PLAN_LIMITS[plan].maxStorageMb * BYTES_PER_MB;

    const agg = await this.prisma.attachment.aggregate({
      where: { companyId },
      _sum: { sizeBytes: true },
    });

    const currentBytes = agg._sum.sizeBytes ?? 0;

    if (currentBytes + incomingBytes > maxBytes) {
      const usedMb = (currentBytes / BYTES_PER_MB).toFixed(1);
      throw new BadRequestException(
        `Tu plan ${plan} permite ${PLAN_LIMITS[plan].maxStorageMb} MB de almacenamiento. Ya usas ${usedMb} MB.`,
      );
    }
  }

  async getUsage(companyId: string): Promise<PlanUsage> {
    const plan = await this.getPlan(companyId);
    const limits = PLAN_LIMITS[plan];

    const [technicians, admins, sites, assets, storageAgg] = await Promise.all([
      this.prisma.userCompany.count({
        where: { companyId, role: 'TECHNICIAN', active: true, user: { isActive: true } },
      }),
      this.prisma.userCompany.count({
        where: { companyId, role: 'ADMIN', active: true, user: { isActive: true } },
      }),
      this.prisma.site.count({ where: { companyId } }),
      this.prisma.asset.count({ where: { companyId } }),
      this.prisma.attachment.aggregate({
        where: { companyId },
        _sum: { sizeBytes: true },
      }),
    ]);

    return {
      plan,
      limits,
      usage: {
        technicians,
        admins,
        sites,
        assets,
        storageMb: Math.round(((storageAgg._sum.sizeBytes ?? 0) / BYTES_PER_MB) * 10) / 10,
      },
    };
  }
}
