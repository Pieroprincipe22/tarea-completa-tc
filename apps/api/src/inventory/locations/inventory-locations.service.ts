import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InventoryLocationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LOCATION_PARENT_TYPE } from '../inventory.constants';
import {
  CreateInventoryLocationDto,
  normalizeLocationCode,
  UpdateInventoryLocationDto,
} from './dto/location.dto';

const PARENT_REQUIRED_MESSAGE: Partial<Record<InventoryLocationType, string>> = {
  RACK: 'Una estantería tiene que estar dentro de un almacén.',
  SHELF: 'Una balda tiene que estar dentro de una estantería.',
};

const NO_PARENT_MESSAGE: Partial<Record<InventoryLocationType, string>> = {
  WAREHOUSE: 'Un almacén no puede ir dentro de otra ubicación.',
  VAN: 'Una furgoneta no puede ir dentro de otra ubicación.',
};

type ParentSummary = { id: string; code: string; name: string; type: InventoryLocationType };

type LocationRow = {
  id: string;
  parentId: string | null;
  type: InventoryLocationType;
  code: string;
  name: string;
  assignedUserId: string | null;
  notes: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignedUser?: { id: string; name: string } | null;
  _count?: { children?: number; stocks?: number };
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class InventoryLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serialize(row: LocationRow, parent: ParentSummary | null, path: string[]) {
    return {
      id: row.id,
      type: row.type,
      code: row.code,
      name: row.name,
      parentId: row.parentId,
      parent,
      path,
      assignedUser: row.assignedUser ?? null,
      notes: row.notes,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      childrenCount: row._count?.children ?? 0,
      partsWithStock: row._count?.stocks ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async assertParent(
    companyId: string,
    type: InventoryLocationType,
    parentId: string | null | undefined,
  ): Promise<string | null> {
    const expectedParentType = LOCATION_PARENT_TYPE[type];

    if (expectedParentType === null) {
      if (parentId) {
        throw new BadRequestException(NO_PARENT_MESSAGE[type]);
      }
      return null;
    }

    if (!parentId) {
      throw new BadRequestException(PARENT_REQUIRED_MESSAGE[type]);
    }

    const parent = await this.prisma.inventoryLocation.findFirst({
      where: { id: parentId, companyId },
      select: { id: true, type: true, isActive: true },
    });

    if (!parent) {
      throw new NotFoundException('Ubicación padre no encontrada.');
    }

    if (parent.type !== expectedParentType) {
      throw new BadRequestException(PARENT_REQUIRED_MESSAGE[type]);
    }

    if (!parent.isActive) {
      throw new BadRequestException('La ubicación padre está archivada.');
    }

    return parent.id;
  }

  private async assertAssignableUser(
    companyId: string,
    type: InventoryLocationType,
    userId: string | null | undefined,
  ) {
    if (!userId) return;

    if (type !== 'VAN') {
      throw new BadRequestException('Solo se puede asignar un técnico a una furgoneta.');
    }

    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { active: true },
    });

    if (!membership?.active) {
      throw new BadRequestException('Ese usuario no pertenece a la empresa.');
    }
  }

  private async assertCodeIsFree(companyId: string, code: string, exceptId?: string) {
    const existing = await this.prisma.inventoryLocation.findFirst({
      where: { companyId, code, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una ubicación con el código ${code}.`);
    }
  }

  async list(companyId: string, includeInactive = false) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const rows: LocationRow[] = await this.prisma.inventoryLocation.findMany({
      where: {
        companyId: normalizedCompanyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      include: {
        assignedUser: { select: { id: true, name: true } },
        _count: {
          select: {
            children: { where: { isActive: true } },
            stocks: { where: { quantity: { gt: 0 } } },
          },
        },
      },
    });

    const byId = new Map(rows.map((row) => [row.id, row]));

    return rows.map((row) => {
      const parentRow = row.parentId ? byId.get(row.parentId) : undefined;
      const path: string[] = [row.name];
      let cursor = parentRow;
      let guard = 0;

      while (cursor && guard < 5) {
        path.unshift(cursor.name);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
        guard += 1;
      }

      const parent = parentRow
        ? { id: parentRow.id, code: parentRow.code, name: parentRow.name, type: parentRow.type }
        : null;

      return this.serialize(row, parent, path);
    });
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const row = await this.prisma.inventoryLocation.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            parent: { select: { id: true, code: true, name: true, type: true } },
          },
        },
        assignedUser: { select: { id: true, name: true } },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          select: { id: true, code: true, name: true, type: true },
        },
        _count: {
          select: {
            children: { where: { isActive: true } },
            stocks: { where: { quantity: { gt: 0 } } },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Ubicación no encontrada.');
    }

    const path = [row.parent?.parent?.name, row.parent?.name, row.name].filter(
      (name): name is string => typeof name === 'string',
    );

    const parent = row.parent
      ? { id: row.parent.id, code: row.parent.code, name: row.parent.name, type: row.parent.type }
      : null;

    return { ...this.serialize(row, parent, path), children: row.children };
  }

  async getByCode(companyId: string, code: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const normalizedCode = normalizeLocationCode(code ?? '');

    const row = await this.prisma.inventoryLocation.findFirst({
      where: { companyId: normalizedCompanyId, code: normalizedCode },
      select: { id: true },
    });

    if (!row) {
      throw new NotFoundException(`No hay ninguna ubicación con el código ${normalizedCode}.`);
    }

    return this.get(normalizedCompanyId, row.id);
  }

  async create(companyId: string, dto: CreateInventoryLocationDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const code = normalizeLocationCode(dto.code);

    const parentId = await this.assertParent(normalizedCompanyId, dto.type, dto.parentId);
    await this.assertAssignableUser(normalizedCompanyId, dto.type, dto.assignedUserId);
    await this.assertCodeIsFree(normalizedCompanyId, code);

    try {
      const row = await this.prisma.inventoryLocation.create({
        data: {
          companyId: normalizedCompanyId,
          type: dto.type,
          code,
          name: dto.name.trim(),
          parentId,
          assignedUserId: dto.assignedUserId || null,
          notes: dto.notes?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
        },
        select: { id: true },
      });

      return this.get(normalizedCompanyId, row.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Ya existe una ubicación con el código ${code}.`);
      }
      throw error;
    }
  }

  async update(companyId: string, id: string, dto: UpdateInventoryLocationDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const existing = await this.prisma.inventoryLocation.findFirst({
      where: { id, companyId: normalizedCompanyId },
      select: {
        id: true,
        type: true,
        parentId: true,
        isActive: true,
        parent: { select: { isActive: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Ubicación no encontrada.');
    }

    const data: Record<string, unknown> = {};

    if (dto.code !== undefined) {
      const code = normalizeLocationCode(dto.code);
      await this.assertCodeIsFree(normalizedCompanyId, code, existing.id);
      data.code = code;
    }

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.parentId !== undefined) {
      data.parentId = await this.assertParent(normalizedCompanyId, existing.type, dto.parentId);
    }

    if (dto.assignedUserId !== undefined) {
      await this.assertAssignableUser(normalizedCompanyId, existing.type, dto.assignedUserId);
      data.assignedUserId = dto.assignedUserId || null;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (dto.isActive === false && existing.isActive) {
      const [activeChildren, partsWithStock] = await Promise.all([
        this.prisma.inventoryLocation.count({
          where: { companyId: normalizedCompanyId, parentId: existing.id, isActive: true },
        }),
        this.prisma.inventoryStock.count({
          where: { companyId: normalizedCompanyId, locationId: existing.id, quantity: { gt: 0 } },
        }),
      ]);

      if (activeChildren > 0) {
        throw new BadRequestException('Primero archiva las ubicaciones que tiene dentro.');
      }

      if (partsWithStock > 0) {
        throw new BadRequestException('No se puede archivar: todavía tiene material.');
      }

      data.isActive = false;
    }

    if (dto.isActive === true && !existing.isActive) {
      if (existing.parentId && existing.parent && !existing.parent.isActive) {
        throw new BadRequestException('Primero reactiva la ubicación que la contiene.');
      }

      data.isActive = true;
    }

    try {
      await this.prisma.inventoryLocation.update({
        where: { id: existing.id },
        data,
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una ubicación con ese código.');
      }
      throw error;
    }

    return this.get(normalizedCompanyId, existing.id);
  }
}
