import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    const items = await this.prisma.asset.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
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
      items: items.map((asset) => ({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        serial: asset.serialNumber,
        internalCode: asset.internalCode,
        status: asset.status,
        installationAt: asset.installationAt,
        notes: asset.notes,
        location: null,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        siteId: asset.siteId,
        site: asset.site
          ? {
              id: asset.site.id,
              name: asset.site.name,
              customerId: asset.site.customerId,
            }
          : null,
        customerId: asset.site?.customerId ?? null,
      })),
      count: items.length,
    };
  }

  async create(companyId: string, dto: CreateAssetDto) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: dto.siteId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company.');
    }

    const legacyDto = dto as CreateAssetDto & {
      serial?: string;
      location?: string;
      category?: string;
      internalCode?: string;
      status?: string;
      installationAt?: string | Date;
    };

    return this.prisma.asset.create({
      data: {
        companyId,
        siteId: dto.siteId,
        name: dto.name,
        category: legacyDto.category ?? null,
        brand: dto.brand ?? null,
        model: dto.model ?? null,
        serialNumber: legacyDto.serial ?? null,
        internalCode: legacyDto.internalCode ?? null,
        status: legacyDto.status ?? null,
        installationAt: legacyDto.installationAt
          ? new Date(legacyDto.installationAt)
          : null,
        notes: dto.notes ?? null,
      },
    });
  }
}