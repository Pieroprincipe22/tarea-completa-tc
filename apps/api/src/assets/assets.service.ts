import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serializeAsset(item: {
    id: string;
    companyId: string;
    siteId: string;
    name: string;
    category: string | null;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    internalCode: string | null;
    status: string | null;
    installationAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    site?: { id: string; name: string; customerId: string } | null;
  }) {
    return {
      id: item.id,
      companyId: item.companyId,
      siteId: item.siteId,
      customerId: item.site?.customerId ?? null,
      name: item.name,
      category: item.category,
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      serial: item.serialNumber,
      internalCode: item.internalCode,
      status: item.status,
      installationAt: item.installationAt,
      notes: item.notes,
      location: null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      site: item.site
        ? {
            id: item.site.id,
            name: item.site.name,
            customerId: item.site.customerId,
          }
        : null,
    };
  }

  async list(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const items = await this.prisma.asset.findMany({
      where: { companyId: normalizedCompanyId },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      include: {
        site: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
      },
    });

    return {
      items: items.map((asset) => this.serializeAsset(asset)),
      count: items.length,
    };
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const item = await this.prisma.asset.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Asset no encontrado para esta company.');
    }

    return this.serializeAsset(item);
  }

  async create(companyId: string, dto: CreateAssetDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const site = await this.prisma.site.findFirst({
      where: {
        id: dto.siteId,
        companyId: normalizedCompanyId,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company.');
    }

    const installationAt = dto.installationAt ? new Date(dto.installationAt) : null;

    if (installationAt && Number.isNaN(installationAt.getTime())) {
      throw new BadRequestException('installationAt inválida');
    }

    const resolvedSerialNumber =
      normalizeNullableString(dto.serialNumber) ??
      normalizeNullableString(dto.serial);

    const item = await this.prisma.asset.create({
      data: {
        companyId: normalizedCompanyId,
        siteId: dto.siteId,
        name: dto.name.trim(),
        category: normalizeNullableString(dto.category),
        brand: normalizeNullableString(dto.brand),
        model: normalizeNullableString(dto.model),
        serialNumber: resolvedSerialNumber,
        internalCode: normalizeNullableString(dto.internalCode),
        status: normalizeNullableString(dto.status),
        installationAt,
        notes: normalizeNullableString(dto.notes),
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
      },
    });

    return this.serializeAsset(item);
  }
}