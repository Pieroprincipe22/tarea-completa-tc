import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serializeSite(item: {
    id: string;
    companyId: string;
    customerId: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer?: { id: string; name: string } | null;
  }) {
    return {
      id: item.id,
      companyId: item.companyId,
      customerId: item.customerId,
      name: item.name,
      address: item.address,
      city: item.city,
      state: item.state,
      postalCode: item.postalCode,
      country: item.country,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      customer: item.customer
        ? {
            id: item.customer.id,
            name: item.customer.name,
          }
        : null,
    };
  }

  async create(companyId: string, dto: CreateSiteDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId: normalizedCompanyId },
      select: { id: true, name: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const item = await this.prisma.site.create({
      data: {
        companyId: normalizedCompanyId,
        customerId: dto.customerId,
        name: dto.name.trim(),
        address: normalizeNullableString(dto.address),
        city: normalizeNullableString(dto.city),
        state: normalizeNullableString(dto.state),
        postalCode: normalizeNullableString(dto.postalCode),
        country: normalizeNullableString(dto.country),
        notes: normalizeNullableString(dto.notes),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.serializeSite(item);
  }

  async list(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const items = await this.prisma.site.findMany({
      where: { companyId: normalizedCompanyId },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return items.map((item) => this.serializeSite(item));
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const item = await this.prisma.site.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Site not found');
    }

    return this.serializeSite(item);
  }
}