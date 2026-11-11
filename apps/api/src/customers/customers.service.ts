import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanLimitsService } from '../common/plan-limits.service';
import { PrismaService } from '../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serializeCustomer(item: {
    id: string;
    companyId: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      companyId: item.companyId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Da de alta un cliente y, si se pide, su primer hotel o edificio a la
   * vez: o se crean los dos o ninguno.
   */
  async create(companyId: string, dto: CreateCustomerDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const site = dto.site ?? null;

    if (site) await this.planLimits.assertSiteLimit(normalizedCompanyId);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.customer.create({
        data: {
          companyId: normalizedCompanyId,
          name: dto.name.trim(),
          email: normalizeNullableString(dto.email),
          phone: normalizeNullableString(dto.phone),
          address: normalizeNullableString(dto.address),
          notes: normalizeNullableString(dto.notes),
        },
      });

      const createdSite = site
        ? await tx.site.create({
            data: {
              companyId: normalizedCompanyId,
              customerId: item.id,
              name: site.name.trim(),
              address: normalizeNullableString(site.address),
              city: normalizeNullableString(site.city),
              notes: normalizeNullableString(site.notes),
            },
            select: { id: true, name: true },
          })
        : null;

      return { ...this.serializeCustomer(item), site: createdSite };
    });
  }

  async list(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const items = await this.prisma.customer.findMany({
      where: { companyId: normalizedCompanyId },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map((item) => this.serializeCustomer(item));
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const item = await this.prisma.customer.findFirst({
      where: { id, companyId: normalizedCompanyId },
    });

    if (!item) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return this.serializeCustomer(item);
  }
}