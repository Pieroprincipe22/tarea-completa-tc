import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceTemplateDto } from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';

@Injectable()
export class MaintenanceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private asJson(value: unknown): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
  }

  create(companyId: string, dto: CreateMaintenanceTemplateDto) {
    const items = dto.items.map((it, idx) => ({
      label: it.label,
      type: it.type,
      required: it.required ?? false,
      sortOrder: it.sortOrder ?? idx + 1,
      unit: it.unit,
      hint: it.hint,
      options: this.asJson(it.options),
    }));

    return this.prisma.maintenanceTemplate.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        intervalDays: dto.intervalDays,
        isActive: dto.isActive ?? true,
        items: { create: items },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findAll(companyId: string, includeArchived = false) {
    return this.prisma.maintenanceTemplate.findMany({
      where: {
        companyId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findOne(companyId: string, id: string) {
    const found = await this.prisma.maintenanceTemplate.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!found) {
      throw new NotFoundException('MaintenanceTemplate not found');
    }

    return found;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateMaintenanceTemplateDto,
  ) {
    await this.findOne(companyId, id);

    const hasItems = Array.isArray(dto.items);

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        intervalDays: dto.intervalDays,
        isActive: dto.isActive,
        ...(hasItems
          ? {
              items: {
                deleteMany: {},
                create: (dto.items ?? []).map((it, idx) => ({
                  label: it.label,
                  type: it.type,
                  required: it.required ?? false,
                  sortOrder: it.sortOrder ?? idx + 1,
                  unit: it.unit,
                  hint: it.hint,
                  options: this.asJson(it.options),
                })),
              },
            }
          : {}),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async archive(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        isActive: false,
      },
    });
  }
}
