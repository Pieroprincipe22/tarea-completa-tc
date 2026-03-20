import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceTemplateDto } from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';

type LegacyTemplateItemInput = {
  title?: string;
  label?: string;
  description?: string;
  hint?: string;
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

@Injectable()
export class MaintenanceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeItems(items: LegacyTemplateItemInput[] = []) {
    return items.map((it, idx) => ({
      title: (it.title ?? it.label ?? `Item ${idx + 1}`).trim(),
      description: it.description ?? it.hint ?? null,
      valueType: it.valueType ?? it.type ?? null,
      required: it.required ?? false,
      itemOrder: it.itemOrder ?? it.sortOrder ?? idx + 1,
      unit: it.unit ?? null,
    }));
  }

  create(companyId: string, dto: CreateMaintenanceTemplateDto) {
    const input = dto as CreateMaintenanceTemplateDto & LegacyTemplateDto;
    const items = this.normalizeItems(input.items ?? []);

    return this.prisma.maintenanceTemplate.create({
      data: {
        companyId,
        title: (input.title ?? input.name ?? 'Template').trim(),
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        items: { create: items },
      },
      include: { items: { orderBy: { itemOrder: 'asc' } } },
    });
  }

  findAll(companyId: string, includeArchived = false) {
    return this.prisma.maintenanceTemplate.findMany({
      where: {
        companyId,
        ...(includeArchived ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { itemOrder: 'asc' } } },
    });
  }

  async findOne(companyId: string, id: string) {
    const found = await this.prisma.maintenanceTemplate.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { itemOrder: 'asc' } } },
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

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        ...(input.title !== undefined || input.name !== undefined
          ? { title: (input.title ?? input.name ?? 'Template').trim() }
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
      include: { items: { orderBy: { itemOrder: 'asc' } } },
    });
  }

  async archive(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: { items: { orderBy: { itemOrder: 'asc' } } },
    });
  }
}