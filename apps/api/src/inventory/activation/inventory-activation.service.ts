import { BadRequestException, Injectable } from '@nestjs/common';
import type { CompanyPlan } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { INVENTORY_PRODUCT } from '../inventory.constants';

export type InventoryStatus = {
  enabled: boolean;
  plan: CompanyPlan | null;
  role: string | null;
};

@Injectable()
export class InventoryActivationService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  async status(companyId: string, role?: string | null): Promise<InventoryStatus> {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const product = await this.prisma.companyProduct.findUnique({
      where: {
        companyId_product: { companyId: normalizedCompanyId, product: INVENTORY_PRODUCT },
      },
      select: { isActive: true, plan: true },
    });

    return {
      enabled: product?.isActive === true,
      plan: product?.isActive ? product.plan : null,
      role: role ?? null,
    };
  }

  async activate(companyId: string, plan?: CompanyPlan) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const product = await this.prisma.companyProduct.upsert({
      where: {
        companyId_product: { companyId: normalizedCompanyId, product: INVENTORY_PRODUCT },
      },
      update: { isActive: true, ...(plan ? { plan } : {}) },
      create: {
        companyId: normalizedCompanyId,
        product: INVENTORY_PRODUCT,
        isActive: true,
        ...(plan ? { plan } : {}),
      },
      select: { isActive: true, plan: true },
    });

    return { enabled: product.isActive, plan: product.plan };
  }

  /** Desactiva el acceso sin borrar datos: se puede volver a activar. */
  async deactivate(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    await this.prisma.companyProduct.updateMany({
      where: { companyId: normalizedCompanyId, product: INVENTORY_PRODUCT },
      data: { isActive: false },
    });

    return { enabled: false, plan: null };
  }
}
