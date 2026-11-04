import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateMaintenanceTemplateDto,
  TemplateItemDto,
} from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';
import { MEASUREMENT_TYPE } from './template-item-types';

// Los puntos siempre salen en el orden en que la empresa los colocó.
const TEMPLATE_INCLUDE = {
  items: {
    orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
  },
} satisfies Prisma.MaintenanceTemplateInclude;

const NAME_MAX = 120;

function formatNumber(value: number): string {
  return String(value).replace('.', ',');
}

@Injectable()
export class MaintenanceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, includeArchived = false) {
    return this.prisma.maintenanceTemplate.findMany({
      where: {
        companyId,
        ...(includeArchived ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: TEMPLATE_INCLUDE,
    });
  }

  async findOne(companyId: string, id: string) {
    const found = await this.prisma.maintenanceTemplate.findFirst({
      where: { id, companyId },
      include: TEMPLATE_INCLUDE,
    });

    if (!found) {
      throw new NotFoundException('Plantilla no encontrada.');
    }

    return found;
  }

  async create(companyId: string, dto: CreateMaintenanceTemplateDto) {
    const items = this.toItemRows(dto.items);

    return this.prisma.maintenanceTemplate.create({
      data: {
        companyId,
        // "title" se mantiene igual que "name" para las pantallas antiguas.
        name: dto.name,
        title: dto.name,
        category: dto.category ?? null,
        description: dto.description ?? null,
        isActive: true,
        items: { create: items },
      },
      include: TEMPLATE_INCLUDE,
    });
  }

  async update(companyId: string, id: string, dto: UpdateMaintenanceTemplateDto) {
    await this.findOne(companyId, id);

    const data: Prisma.MaintenanceTemplateUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
      data.title = dto.name;
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.items !== undefined) {
      // Los partes ya hechos guardan su propia copia de cada punto,
      // así que cambiar la plantilla no altera ningún parte anterior.
      data.items = {
        deleteMany: {},
        create: this.toItemRows(dto.items),
      };
    }

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data,
      include: TEMPLATE_INCLUDE,
    });
  }

  async duplicate(companyId: string, id: string) {
    const original = await this.findOne(companyId, id);
    const baseName = original.name ?? original.title ?? 'Plantilla';
    const name = `${baseName} (copia)`.slice(0, NAME_MAX);

    return this.prisma.maintenanceTemplate.create({
      data: {
        companyId,
        name,
        title: name,
        category: original.category,
        description: original.description,
        isActive: true,
        items: {
          create: original.items.map((item, index) => ({
            label: item.label,
            title: item.title,
            description: item.description,
            type: item.type,
            valueType: item.valueType,
            required: item.required,
            sortOrder: index + 1,
            itemOrder: index + 1,
            unit: item.unit,
            helpText: item.helpText,
            placeholder: item.placeholder,
            section: item.section,
            minValue: item.minValue,
            maxValue: item.maxValue,
          })),
        },
      },
      include: TEMPLATE_INCLUDE,
    });
  }

  // Archivar = dejar de ofrecerla para partes nuevos. No se borra nada.
  async archive(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.maintenanceTemplate.update({
      where: { id },
      data: { isActive: false },
      include: TEMPLATE_INCLUDE,
    });
  }

  /**
   * Convierte los puntos que llegan del editor en filas de la base de datos.
   * El orden del array es el orden de la hoja.
   */
  private toItemRows(
    items: TemplateItemDto[],
  ): Prisma.MaintenanceTemplateItemCreateWithoutTemplateInput[] {
    return items.map((item, index) => {
      const isMeasurement = item.type === MEASUREMENT_TYPE;
      const minValue = isMeasurement ? (item.minValue ?? null) : null;
      const maxValue = isMeasurement ? (item.maxValue ?? null) : null;

      if (minValue !== null && maxValue !== null && minValue > maxValue) {
        throw new BadRequestException(
          `En «${item.label}» el mínimo (${formatNumber(minValue)}) es mayor que el máximo (${formatNumber(maxValue)}).`,
        );
      }

      return {
        label: item.label,
        title: item.label,
        type: item.type,
        valueType: item.type,
        required: item.required ?? false,
        sortOrder: index + 1,
        itemOrder: index + 1,
        section: item.section ?? null,
        unit: isMeasurement ? (item.unit ?? null) : null,
        minValue,
        maxValue,
        helpText: item.helpText ?? null,
      };
    });
  }
}