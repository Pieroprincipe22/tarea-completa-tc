import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_INVENTORY_CATEGORIES } from '../inventory.constants';
import { normalizeForSearch } from '../search-text';
import { CreateInventoryCategoryDto, UpdateInventoryCategoryDto } from './dto/category.dto';

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { parts: number };
};

const SORT_STEP = 10;

@Injectable()
export class InventoryCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serialize(row: CategoryRow) {
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      partsCount: row._count?.parts ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async assertNameIsFree(companyId: string, name: string, exceptId?: string) {
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una categoría llamada "${name}".`);
    }
  }

  private async nextSortOrder(companyId: string): Promise<number> {
    const result = await this.prisma.inventoryCategory.aggregate({
      where: { companyId },
      _max: { sortOrder: true },
    });

    return (result._max.sortOrder ?? 0) + SORT_STEP;
  }

  async list(companyId: string, includeInactive = false) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const rows = await this.prisma.inventoryCategory.findMany({
      where: {
        companyId: normalizedCompanyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { parts: { where: { isArchived: false } } } },
      },
    });

    return rows.map((row) => this.serialize(row));
  }

  async create(companyId: string, dto: CreateInventoryCategoryDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const name = dto.name.trim();

    await this.assertNameIsFree(normalizedCompanyId, name);

    const row = await this.prisma.inventoryCategory.create({
      data: {
        companyId: normalizedCompanyId,
        name,
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder(normalizedCompanyId)),
      },
    });

    return this.serialize(row);
  }

  async update(companyId: string, id: string, dto: UpdateInventoryCategoryDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { id, companyId: normalizedCompanyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    const name = dto.name?.trim();

    if (name) {
      await this.assertNameIsFree(normalizedCompanyId, name, existing.id);
    }

    const row = await this.prisma.inventoryCategory.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.serialize(row);
  }

  /** Crea las categorías iniciales que falten, sin duplicar las que ya existen. */
  async createDefaults(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const existing = await this.prisma.inventoryCategory.findMany({
      where: { companyId: normalizedCompanyId },
      select: { name: true },
    });

    const existingNames = new Set(existing.map((row) => normalizeForSearch(row.name)));
    const missing = DEFAULT_INVENTORY_CATEGORIES.filter(
      (name) => !existingNames.has(normalizeForSearch(name)),
    );

    if (missing.length > 0) {
      const start = await this.nextSortOrder(normalizedCompanyId);

      await this.prisma.inventoryCategory.createMany({
        data: missing.map((name, index) => ({
          companyId: normalizedCompanyId,
          name,
          sortOrder: start + index * SORT_STEP,
        })),
        skipDuplicates: true,
      });
    }

    return {
      created: missing.length,
      items: await this.list(normalizedCompanyId),
    };
  }
}
