import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PlanLimitsService } from '../common/plan-limits.service';
import { assetLocation, spaceLabel } from '../building/building-plan';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';

type AssetStatusValue = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeAssetStatus(value?: string | null): AssetStatusValue | undefined {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) return undefined;
  if (normalized === 'ACTIVE') return 'ACTIVE';
  if (normalized === 'INACTIVE') return 'INACTIVE';
  if (normalized === 'MAINTENANCE') return 'MAINTENANCE';
  if (normalized === 'RETIRED') return 'RETIRED';

  throw new BadRequestException('status inválido para asset');
}

const ASSET_INCLUDE = {
  site: {
    select: {
      id: true,
      name: true,
      customerId: true,
    },
  },
  space: {
    select: {
      id: true,
      kind: true,
      name: true,
      floor: { select: { id: true, name: true, level: true } },
    },
  },
} satisfies Prisma.AssetInclude;

type AssetWithRelations = Prisma.AssetGetPayload<{ include: typeof ASSET_INCLUDE }>;

@Injectable()
export class AssetsService {
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

  private serializeAsset(item: AssetWithRelations) {
    return {
      id: item.id,
      companyId: item.companyId,
      customerId: item.customerId ?? item.site?.customerId ?? null,
      siteId: item.siteId,
      spaceId: item.spaceId,
      name: item.name,
      code: item.code,
      category: item.category,
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      serial: item.serialNumber,
      internalCode: item.internalCode,
      status: item.status,
      installationAt: item.installationAt,
      location: item.location,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      site: item.site
        ? {
            id: item.site.id,
            name: item.site.name,
            customerId: item.site.customerId,
          }
        : null,
      space: item.space
        ? {
            id: item.space.id,
            kind: item.space.kind,
            name: item.space.name,
            label: spaceLabel(item.space.kind, item.space.name),
            floor: item.space.floor,
          }
        : null,
    };
  }

  // La habitación o zona tiene que ser del mismo sitio que el equipo.
  private async findSpaceInSite(companyId: string, siteId: string, spaceId: string) {
    const space = await this.prisma.space.findFirst({
      where: { id: spaceId, companyId, siteId },
      select: { id: true, kind: true, name: true, floor: { select: { name: true } } },
    });

    if (!space) {
      throw new BadRequestException('La habitación o zona no es de este sitio.');
    }

    return space;
  }

  async list(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const items = await this.prisma.asset.findMany({
      where: { companyId: normalizedCompanyId },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      include: ASSET_INCLUDE,
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
      include: ASSET_INCLUDE,
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
        customerId: true,
      },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company.');
    }

    const space = dto.spaceId
      ? await this.findSpaceInSite(normalizedCompanyId, site.id, dto.spaceId)
      : null;

    await this.planLimits.assertAssetLimit(normalizedCompanyId);

    const installationAt = dto.installationAt ? new Date(dto.installationAt) : null;

    if (installationAt && Number.isNaN(installationAt.getTime())) {
      throw new BadRequestException('installationAt inválida');
    }

    const resolvedSerialNumber =
      normalizeNullableString(dto.serialNumber) ?? normalizeNullableString(dto.serial);

    const resolvedStatus = normalizeAssetStatus(dto.status);

    const item = await this.prisma.asset.create({
      data: {
        companyId: normalizedCompanyId,
        customerId: site.customerId,
        siteId: dto.siteId,
        spaceId: space?.id ?? null,
        name: dto.name.trim(),
        category: normalizeNullableString(dto.category),
        brand: normalizeNullableString(dto.brand),
        model: normalizeNullableString(dto.model),
        serialNumber: resolvedSerialNumber,
        internalCode: normalizeNullableString(dto.internalCode),
        ...(resolvedStatus ? { status: resolvedStatus } : {}),
        installationAt,
        // Si está en una habitación o zona, la ubicación sale de ahí.
        location: space
          ? assetLocation(space.floor.name, space.kind, space.name)
          : normalizeNullableString(dto.location),
        notes: normalizeNullableString(dto.notes),
      },
      include: ASSET_INCLUDE,
    });

    return this.serializeAsset(item);
  }

  async update(companyId: string, id: string, dto: UpdateAssetDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const current = await this.prisma.asset.findFirst({
      where: { id, companyId: normalizedCompanyId },
      select: { id: true, siteId: true },
    });

    if (!current) {
      throw new NotFoundException('Equipo no encontrado.');
    }

    const data: Prisma.AssetUncheckedUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.category !== undefined) data.category = normalizeNullableString(dto.category);
    if (dto.brand !== undefined) data.brand = normalizeNullableString(dto.brand);
    if (dto.model !== undefined) data.model = normalizeNullableString(dto.model);
    if (dto.serialNumber !== undefined) {
      data.serialNumber = normalizeNullableString(dto.serialNumber);
    }
    if (dto.internalCode !== undefined) {
      data.internalCode = normalizeNullableString(dto.internalCode);
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = normalizeNullableString(dto.notes);

    // Mover el equipo a otra habitación o zona del mismo sitio, o sacarlo.
    if (dto.spaceId !== undefined) {
      if (dto.spaceId === null) {
        data.spaceId = null;
        data.location = null;
      } else {
        if (!current.siteId) {
          throw new BadRequestException(
            'El equipo no está en ningún sitio: no se puede colocar en una habitación.',
          );
        }
        const space = await this.findSpaceInSite(normalizedCompanyId, current.siteId, dto.spaceId);
        data.spaceId = space.id;
        data.location = assetLocation(space.floor.name, space.kind, space.name);
      }
    }

    const item = await this.prisma.asset.update({
      where: { id: current.id },
      data,
      include: ASSET_INCLUDE,
    });

    return this.serializeAsset(item);
  }
}