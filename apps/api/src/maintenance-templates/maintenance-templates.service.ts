import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceTemplateDto } from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';

type MaintenanceItemTypeValue =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'CHECKBOX'
  | 'CHECKLIST'
  | 'PHOTO'
  | 'SIGNATURE';

type LegacyTemplateItemInput = {
  title?: string;
  label?: string;
  description?: string;
  hint?: string;
  helpText?: string;
  placeholder?: string;
  valueType?: string;
  type?: string;
  required?: boolean;
  itemOrder?: number;
  sortOrder?: number;
  unit?: string;
  options?: unknown;
};

type LegacyTemplateDto = {
  title?: string;
  name?: string;
  description?: string;
  intervalDays?: number;
  isActive?: boolean;
  items?: LegacyTemplateItemInput[];
};

function normalizeItemType(value?: string | null): MaintenanceItemTypeValue {
  if (!value?.trim()) return 'TEXT';

  const normalized = value.trim().toUpperCase();

  if (normalized === 'TEXT') return 'TEXT';
  if (normalized === 'LONG_TEXT') return 'LONG_TEXT';
  if (normalized === 'TEXTAREA') return 'TEXTAREA';
  if (normalized === 'NUMBER') return 'NUMBER';
  if (normalized === 'BOOLEAN') return 'BOOLEAN';
  if (normalized === 'DATE') return 'DATE';
  if (normalized === 'CHECKBOX') return 'CHECKBOX';
  if (normalized === 'CHECKLIST') return 'CHECKLIST';
  if (normalized === 'PHOTO') return 'PHOTO';
  if (normalized === 'SIGNATURE') return 'SIGNATURE';

  if (normalized === 'SHORT_TEXT') return 'TEXT';
  if (normalized === 'MULTILINE') return 'TEXTAREA';
  if (normalized === 'INTEGER') return 'NUMBER';
  if (normalized === 'DECIMAL') return 'NUMBER';
  if (normalized === 'YES_NO') return 'BOOLEAN';
  if (normalized === 'SWITCH') return 'BOOLEAN';

  return 'TEXT';
}

@Injectable()
export class MaintenanceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeItems(items: LegacyTemplateItemInput[] = []) {
    return items.map((it, idx) => {
      const resolvedTitle = (it.title ?? it.label ?? `Item ${idx + 1}`).trim();
      const resolvedType = normalizeItemType(it.type ?? it.valueType);

      return {
        label: (it.label ?? it.title ?? resolvedTitle).trim(),
        title: resolvedTitle,
        description: it.description ?? null,
        type: resolvedType,
        valueType: it.valueType ?? resolvedType,
        required: it.required ?? false,
        sortOrder: it.sortOrder ?? it.itemOrder ?? idx + 1,
        itemOrder: it.itemOrder ?? it.sortOrder ?? idx + 1,
        unit: it.unit ?? null,
        helpText: it.helpText ?? it.hint ?? null,
        placeholder: it.placeholder ?? null,
      };
    });
  }

  create(companyId: string, dto: CreateMaintenanceTemplateDto) {
    const input = dto as CreateMaintenanceTemplateDto & LegacyTemplateDto;
    const items = this.normalizeItems(input.items ?? []);
    const resolvedName = (input.title ?? input.name ?? 'Template').trim();

    return this.prisma.maintenanceTemplate.create({
      data: {
        companyId,
        name: resolvedName,
        title: resolvedName,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        items: { create: items },
      },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
        },
      },
    });
  }

  findAll(companyId: string, includeArchived = false) {
    return this.prisma.maintenanceTemplate.findMany({
      where: {
        companyId,
        ...(includeArchived ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
        },
      },
    });
  }

  async findOne(companyId: string, id: string) {
    const found = await this.prisma.maintenanceTemplate.findFirst({
      where: { id, companyId },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
        },
      },
    });

    if (!found) {
      throw new NotFoundException('MaintenanceTemplate not found');
    }

    return found;
  }

  async update(companyId: string, id: string, dto: UpdateMaintenanceTemplateDto) {
    await this.findOne(companyId, id);

    const input = dto as UpdateMaintenanceTemplateDto & LegacyTemplateDto;
    const hasItems = Array.isArray(input.items);
    const hasNameUpdate = input.title !== undefined || input.name !== undefined;
    const resolvedName = hasNameUpdate
      ? (input.title ?? input.name ?? 'Template').trim()
      : undefined;

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        ...(resolvedName !== undefined
          ? {
              name: resolvedName,
              title: resolvedName,
            }
          : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(hasItems
          ? {
              items: {
                deleteMany: {},
                create: this.normalizeItems(input.items ?? []),
              },
            }
          : {}),
      },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
        },
      },
    });
  }

  async archive(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
        },
      },
    });
  }
}
