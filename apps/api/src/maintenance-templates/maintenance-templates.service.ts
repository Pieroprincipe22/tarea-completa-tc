import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateMaintenanceTemplateDto,
  TemplateItemDto,
} from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';
import { findLibraryTemplate, TEMPLATE_LIBRARY } from './template-library';
import {
  CHOICE_TYPE,
  MEASUREMENT_TYPE,
  OPTIONS_MAX,
  OPTIONS_MIN,
  type TemplateItemOption,
} from './template-item-types';

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

// Para comparar nombres de opciones sin mayúsculas ni tildes.
function comparable(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Una columna JSON opcional no acepta null directamente al crear.
function jsonOrNull(value: Prisma.JsonValue | TemplateItemOption[] | null) {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
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
            options: jsonOrNull(item.options),
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

  // ---------------------------------------------------------------
  // Plantillas de partida
  // ---------------------------------------------------------------

  library() {
    return TEMPLATE_LIBRARY.map((template) => ({
      key: template.key,
      name: template.name,
      category: template.category,
      description: template.description,
      items: template.items.map((item) => ({
        section: item.section,
        label: item.label,
        type: item.type,
        required: item.required ?? false,
        unit: item.unit ?? null,
        minValue: item.minValue ?? null,
        maxValue: item.maxValue ?? null,
        helpText: item.helpText ?? null,
        options: item.options ?? null,
      })),
    }));
  }

  /**
   * Copia una plantilla de partida en la empresa. La copia es de la
   * empresa: puede cambiarla entera sin afectar a nadie más.
   */
  async useLibraryTemplate(companyId: string, key: string) {
    const source = findLibraryTemplate(key);
    if (!source) {
      throw new NotFoundException('Esa plantilla de partida no existe.');
    }

    const name = await this.freeName(companyId, source.name);

    return this.create(companyId, {
      name,
      category: source.category,
      description: source.description,
      items: source.items.map((item) => ({
        label: item.label,
        section: item.section,
        type: item.type,
        required: item.required ?? false,
        unit: item.unit ?? null,
        minValue: item.minValue ?? null,
        maxValue: item.maxValue ?? null,
        helpText: item.helpText ?? null,
        options: item.options ? item.options.map((option) => ({ ...option })) : null,
      })),
    });
  }

  // "Mantenimiento de fancoil" → si ya existe, "Mantenimiento de fancoil (2)"…
  private async freeName(companyId: string, base: string): Promise<string> {
    const existing = await this.prisma.maintenanceTemplate.findMany({
      where: { companyId, name: { startsWith: base } },
      select: { name: true },
    });
    const taken = new Set(existing.map((t) => t.name));
    if (!taken.has(base)) return base;

    for (let n = 2; n < 1000; n += 1) {
      const candidate = `${base} (${n})`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base} (${Date.now()})`;
  }

  // ---------------------------------------------------------------

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

      const options = item.type === CHOICE_TYPE ? this.checkOptions(item) : null;

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
        options: jsonOrNull(options),
      };
    });
  }

  // Un punto de tipo Estado necesita opciones con sentido.
  private checkOptions(item: TemplateItemDto): TemplateItemOption[] {
    const options = (item.options ?? []).map((option) => ({
      label: option.label,
      result: option.result,
    }));

    if (options.length < OPTIONS_MIN) {
      throw new BadRequestException(
        `En «${item.label}» pon al menos ${OPTIONS_MIN} opciones para que el técnico pueda elegir.`,
      );
    }
    if (options.length > OPTIONS_MAX) {
      throw new BadRequestException(
        `En «${item.label}» no puede haber más de ${OPTIONS_MAX} opciones.`,
      );
    }

    const seen = new Set<string>();
    for (const option of options) {
      const key = comparable(option.label);
      if (seen.has(key)) {
        throw new BadRequestException(
          `En «${item.label}» la opción «${option.label}» está repetida.`,
        );
      }
      seen.add(key);
    }

    if (!options.some((option) => option.result === 'OK')) {
      throw new BadRequestException(
        `En «${item.label}» al menos una opción tiene que ser «Correcto».`,
      );
    }

    return options;
  }
}