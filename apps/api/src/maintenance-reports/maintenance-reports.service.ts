import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MaintenanceItemStatus,
  MaintenanceItemType,
  MaintenanceReportStatus,
  MaintenanceReportState,
  Prisma,
  WorkOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportItemDto } from './dto/update-maintenance-report-items.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import { ReviewMaintenanceReportDto } from './dto/review-maintenance-report.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
} as const;

const reportInclude = {
  template: {
    select: {
      id: true,
      name: true,
      title: true,
      description: true,
      isActive: true,
    },
  },
  customer: {
    select: { id: true, name: true },
  },
  site: {
    select: { id: true, name: true, address: true, city: true, country: true },
  },
  asset: {
    select: {
      id: true,
      name: true,
      code: true,
      internalCode: true,
      brand: true,
      model: true,
      serialNumber: true,
    },
  },
  workOrder: {
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      customerId: true,
      siteId: true,
      assetId: true,
      assignedTechnicianId: true,
      assignedToUserId: true,
    },
  },
  createdBy: {
    select: userSelect,
  },
  createdByUser: {
    select: userSelect,
  },
  completedByUser: {
    select: userSelect,
  },
  assignedTechnician: {
    select: userSelect,
  },
  submittedBy: {
    select: userSelect,
  },
  reviewedBy: {
    select: userSelect,
  },
  items: {
    orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      templateItem: {
        select: {
          id: true,
          label: true,
          title: true,
          description: true,
          type: true,
          valueType: true,
          required: true,
          sortOrder: true,
          itemOrder: true,
          unit: true,
          helpText: true,
          placeholder: true,
        },
      },
    },
  },
  materials: {
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.MaintenanceReportInclude;

type ReportWithRelations = Prisma.MaintenanceReportGetPayload<{
  include: typeof reportInclude;
}>;

type ReportItemEntity = ReportWithRelations['items'][number];

function hasOwn<T extends object>(obj: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeCompanyId(companyId?: string): string {
  const normalized = companyId?.trim();

  if (!normalized) {
    throw new BadRequestException('Falta header x-company-id');
  }

  return normalized;
}

function stringifyLegacyValue(value: unknown): string | null {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toDateOrNull(value?: string | Date | null): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeReportItem(item: ReportItemEntity) {
  const resolvedType = item.type ?? item.templateItem?.type ?? null;
  const resolvedValueType = item.valueType ?? item.templateItem?.valueType ?? null;

  const legacyValue =
    item.value ??
    item.valueText ??
    (item.valueNumber !== null ? String(item.valueNumber) : null) ??
    (item.valueBoolean !== null ? String(item.valueBoolean) : null) ??
    (item.valueDate ? item.valueDate.toISOString() : null) ??
    (item.valueJson !== null ? stringifyLegacyValue(item.valueJson) : null);

  return {
    id: item.id,
    reportId: item.reportId,
    templateItemId: item.templateItemId,
    label: item.label ?? item.templateItem?.label ?? item.title ?? item.templateItem?.title ?? null,
    title: item.title ?? item.templateItem?.title ?? item.label ?? item.templateItem?.label ?? null,
    description: item.description ?? item.templateItem?.description ?? null,
    type: resolvedType,
    valueType: resolvedValueType,
    required: item.required,
    sortOrder: item.sortOrder,
    itemOrder: item.itemOrder,
    unit: item.unit ?? item.templateItem?.unit ?? null,
    helpText: item.templateItem?.helpText ?? null,
    placeholder: item.templateItem?.placeholder ?? null,
    status: item.status,
    value: legacyValue,
    valueText: item.valueText,
    valueNumber: item.valueNumber,
    valueBoolean: item.valueBoolean,
    valueDate: item.valueDate,
    valueJson: item.valueJson,
    notes: item.notes,
    resultValue: legacyValue,
    resultNotes: item.notes,
    templateItem: item.templateItem,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeUser(user?: { id: string; name: string; email: string } | null) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function serializeReport(report: ReportWithRelations) {
  return {
    id: report.id,
    companyId: report.companyId,
    workOrderId: report.workOrderId,
    templateId: report.templateId,
    customerId: report.customerId,
    siteId: report.siteId,
    assetId: report.assetId,

    createdById: report.createdById,
    createdByUserId: report.createdByUserId,
    completedByUserId: report.completedByUserId,
    assignedTechnicianId: report.assignedTechnicianId,
    submittedById: report.submittedById,
    reviewedById: report.reviewedById,

    title: report.title,
    description: report.description,
    notes: report.notes,
    summary: report.summary,
    diagnosis: report.diagnosis,
    workPerformed: report.workPerformed,
    recommendations: report.recommendations,
    observations: report.observations,
    technicianNotes: report.technicianNotes,
    reviewNotes: report.reviewNotes,
    laborHours: report.laborHours,

    status: report.status,
    state: report.state,

    assignedAt: report.assignedAt,
    startedAt: report.startedAt,
    submittedAt: report.submittedAt,
    completedAt: report.completedAt,
    reviewedAt: report.reviewedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,

    performedAt: report.completedAt ?? report.submittedAt ?? report.startedAt ?? report.createdAt,
    templateName: report.template?.title ?? report.template?.name ?? report.title ?? null,
    templateDesc: report.template?.description ?? report.description ?? null,

    template: report.template,
    customer: report.customer,
    site: report.site,
    asset: report.asset,
    workOrder: report.workOrder,
    createdBy: serializeUser(report.createdBy),
    createdByUser: serializeUser(report.createdByUser),
    completedByUser: serializeUser(report.completedByUser),
    assignedTechnician: serializeUser(report.assignedTechnician),
    submittedBy: serializeUser(report.submittedBy),
    reviewedBy: serializeUser(report.reviewedBy),

    items: report.items.map(serializeReportItem),
    materials: report.materials,
  };
}

@Injectable()
export class MaintenanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureActiveUserInCompany(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        OR: [
          { companyId },
          {
            memberships: {
              some: {
                companyId,
                active: true,
              },
            },
          },
        ],
      },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('El usuario del header no pertenece a esta company.');
    }

    return user;
  }

  async list(companyId: string) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    const items = await this.prisma.maintenanceReport.findMany({
      where: { companyId: normalizedCompanyId },
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });

    return {
      items: items.map(serializeReport),
      count: items.length,
    };
  }

  async listByWorkOrderId(companyId: string, workOrderId: string) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    const workOrder = await this.prisma.workOrder.findFirst({
      where: {
        id: workOrderId,
        companyId: normalizedCompanyId,
      },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundException('WorkOrder no encontrada para esta company.');
    }

    const items = await this.prisma.maintenanceReport.findMany({
      where: {
        companyId: normalizedCompanyId,
        workOrderId,
      },
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });

    return {
      items: items.map(serializeReport),
      count: items.length,
    };
  }

  async createFromTemplate(
    companyId: string,
    userId: string | undefined,
    dto: CreateMaintenanceReportDto,
  ) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    if (!userId?.trim()) {
      throw new BadRequestException('Falta header x-user-id');
    }

    const normalizedUserId = userId.trim();
    await this.ensureActiveUserInCompany(normalizedCompanyId, normalizedUserId);

    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: {
        id: dto.templateId,
        companyId: normalizedCompanyId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!template) {
      throw new NotFoundException('MaintenanceTemplate no encontrado para esta company.');
    }

    if (!template.items.length) {
      throw new BadRequestException('El template no tiene items.');
    }

    const linkedWorkOrder = dto.workOrderId
      ? await this.prisma.workOrder.findFirst({
          where: {
            id: dto.workOrderId,
            companyId: normalizedCompanyId,
          },
          select: {
            id: true,
            title: true,
            description: true,
            customerId: true,
            siteId: true,
            assetId: true,
            assignedTechnicianId: true,
            assignedToUserId: true,
            status: true,
          },
        })
      : null;

    if (dto.workOrderId && !linkedWorkOrder) {
      throw new NotFoundException('WorkOrder no encontrada para esta company.');
    }

    const resolvedCustomerId = dto.customerId ?? linkedWorkOrder?.customerId ?? null;
    const resolvedSiteId = dto.siteId ?? linkedWorkOrder?.siteId ?? null;
    const resolvedAssetId = dto.assetId ?? linkedWorkOrder?.assetId ?? null;

    if (!resolvedCustomerId) {
      throw new BadRequestException('customerId es obligatorio.');
    }

    if (!resolvedSiteId) {
      throw new BadRequestException('siteId es obligatorio.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: resolvedCustomerId,
        companyId: normalizedCompanyId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer no encontrado para esta company.');
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: resolvedSiteId,
        companyId: normalizedCompanyId,
      },
      select: { id: true, customerId: true },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company.');
    }

    if (site.customerId !== customer.id) {
      throw new BadRequestException('El site no pertenece al customer indicado.');
    }

    let asset:
      | {
          id: string;
          siteId: string | null;
        }
      | null = null;

    if (resolvedAssetId) {
      asset = await this.prisma.asset.findFirst({
        where: {
          id: resolvedAssetId,
          companyId: normalizedCompanyId,
        },
        select: { id: true, siteId: true },
      });

      if (!asset) {
        throw new NotFoundException('Asset no encontrado para esta company.');
      }

      if (asset.siteId && asset.siteId !== site.id) {
        throw new BadRequestException('El asset no pertenece al site indicado.');
      }
    }

    if (linkedWorkOrder) {
      const existingLinkedReport = await this.prisma.maintenanceReport.findFirst({
        where: {
          companyId: normalizedCompanyId,
          workOrderId: linkedWorkOrder.id,
          status: {
            not: MaintenanceReportStatus.CANCELLED,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existingLinkedReport) {
        throw new BadRequestException(
          `Ya existe un parte vinculado a esta work order (${existingLinkedReport.id}).`,
        );
      }
    }

    const assignedTechnicianId =
      linkedWorkOrder?.assignedTechnicianId ?? linkedWorkOrder?.assignedToUserId ?? null;

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.maintenanceReport.create({
        data: {
          companyId: normalizedCompanyId,
          workOrderId: linkedWorkOrder?.id ?? null,
          templateId: template.id,
          customerId: customer.id,
          siteId: site.id,
          assetId: asset?.id ?? null,

          createdById: normalizedUserId,
          createdByUserId: normalizedUserId,
          assignedTechnicianId,

          title:
            dto.title?.trim() ||
            template.title ||
            template.name ||
            linkedWorkOrder?.title ||
            'Parte de mantenimiento',
          description: template.description ?? linkedWorkOrder?.description ?? null,
          notes: dto.notes ?? null,

          status: assignedTechnicianId
            ? MaintenanceReportStatus.ASSIGNED
            : MaintenanceReportStatus.DRAFT,
          state: MaintenanceReportState.DRAFT,
          assignedAt: assignedTechnicianId ? new Date() : null,
        },
      });

      await tx.maintenanceReportItem.createMany({
        data: template.items.map((it, idx) => ({
          reportId: report.id,
          templateItemId: it.id,
          label: it.label ?? it.title ?? `Item ${idx + 1}`,
          title: it.title ?? it.label ?? `Item ${idx + 1}`,
          description: it.description ?? null,
          type: it.type ?? MaintenanceItemType.TEXT,
          valueType: it.valueType ?? String(it.type ?? MaintenanceItemType.TEXT),
          required: it.required,
          sortOrder: it.sortOrder ?? it.itemOrder ?? idx + 1,
          itemOrder: it.itemOrder ?? it.sortOrder ?? idx + 1,
          unit: it.unit ?? null,
          status: MaintenanceItemStatus.PENDING,
          value: null,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          notes: null,
        })),
      });

      const fullReport = await tx.maintenanceReport.findFirst({
        where: {
          id: report.id,
          companyId: normalizedCompanyId,
        },
        include: reportInclude,
      });

      if (!fullReport) {
        throw new NotFoundException('No se pudo recuperar el reporte creado.');
      }

      return serializeReport(fullReport);
    });
  }

  async getById(companyId: string, id: string) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: reportInclude,
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    return serializeReport(report);
  }

  async updateReport(
    companyId: string,
    id: string,
    userId: string | undefined,
    dto: UpdateMaintenanceReportDto,
  ) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    if (!userId?.trim()) {
      throw new BadRequestException('Falta header x-user-id');
    }

    const normalizedUserId = userId.trim();
    await this.ensureActiveUserInCompany(normalizedCompanyId, normalizedUserId);

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: {
        workOrder: {
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      report.status === MaintenanceReportStatus.APPROVED ||
      report.status === MaintenanceReportStatus.CANCELLED
    ) {
      throw new BadRequestException('Este parte ya no admite edición.');
    }

    if (
      report.state === MaintenanceReportState.FINAL &&
      report.status !== MaintenanceReportStatus.REJECTED
    ) {
      throw new BadRequestException('El parte ya fue enviado y no admite cambios directos.');
    }

    const startedAt = hasOwn(dto, 'startedAt') ? toDateOrNull(dto.startedAt ?? null) : undefined;
    const completedAt = hasOwn(dto, 'completedAt')
      ? toDateOrNull(dto.completedAt ?? null)
      : undefined;

    if (dto.startedAt && startedAt === null) {
      throw new BadRequestException('startedAt inválida');
    }

    if (dto.completedAt && completedAt === null) {
      throw new BadRequestException('completedAt inválida');
    }

    const laborHours =
      dto.laborHours === undefined || dto.laborHours === null
        ? undefined
        : new Prisma.Decimal(dto.laborHours);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.maintenanceReport.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title ?? null } : {}),
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary ?? null } : {}),
          ...(dto.diagnosis !== undefined ? { diagnosis: dto.diagnosis ?? null } : {}),
          ...(dto.workPerformed !== undefined ? { workPerformed: dto.workPerformed ?? null } : {}),
          ...(dto.recommendations !== undefined
            ? { recommendations: dto.recommendations ?? null }
            : {}),
          ...(dto.observations !== undefined ? { observations: dto.observations ?? null } : {}),
          ...(dto.technicianNotes !== undefined
            ? { technicianNotes: dto.technicianNotes ?? null }
            : {}),
          ...(laborHours !== undefined ? { laborHours } : {}),
          ...(startedAt !== undefined ? { startedAt } : {}),
          ...(completedAt !== undefined ? { completedAt } : {}),
          ...(dto.materials !== undefined
            ? {
                materials: {
                  deleteMany: {},
                  create: dto.materials.map((item, idx) => ({
                    name: item.name,
                    description: item.description ?? null,
                    quantity: item.quantity,
                    unit: item.unit ?? null,
                    sortOrder: item.sortOrder ?? idx + 1,
                    notes: item.notes ?? null,
                  })),
                },
              }
            : {}),
        },
        include: reportInclude,
      });

      if (report.workOrderId && startedAt) {
        await tx.workOrder.update({
          where: { id: report.workOrderId },
          data: {
            status:
              report.workOrder?.status === WorkOrderStatus.OPEN ||
              report.workOrder?.status === WorkOrderStatus.ASSIGNED
                ? WorkOrderStatus.IN_PROGRESS
                : report.workOrder?.status,
            startedAt: report.workOrder?.startedAt ?? startedAt,
          },
        });
      }

      return next;
    });

    return serializeReport(updated);
  }

  async updateItem(
    companyId: string,
    reportId: string,
    itemId: string,
    dto: UpdateMaintenanceReportItemDto,
  ) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    const report = await this.prisma.maintenanceReport.findFirst({
      where: {
        id: reportId,
        companyId: normalizedCompanyId,
      },
      select: {
        id: true,
        status: true,
        state: true,
        startedAt: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      report.state === MaintenanceReportState.FINAL ||
      report.status === MaintenanceReportStatus.APPROVED ||
      report.status === MaintenanceReportStatus.CANCELLED
    ) {
      throw new BadRequestException('No se pueden editar items de un reporte cerrado.');
    }

    const item = await this.prisma.maintenanceReportItem.findFirst({
      where: {
        id: itemId,
        reportId,
      },
      include: {
        templateItem: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado.');
    }

    const data: Prisma.MaintenanceReportItemUpdateInput = {};

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.notes !== undefined || dto.resultNotes !== undefined) {
      data.notes = dto.notes ?? dto.resultNotes ?? null;
    }

    if (hasOwn(dto, 'valueJson')) {
      const rawJson = dto.valueJson;

      if (rawJson === null || rawJson === undefined) {
        data.valueJson = Prisma.DbNull;
        data.value = null;
      } else {
        data.valueJson = rawJson as Prisma.InputJsonValue;
        data.value = stringifyLegacyValue(rawJson);
      }

      data.valueDate = null;
      data.valueBoolean = null;
      data.valueNumber = null;
      data.valueText = null;
    } else if (hasOwn(dto, 'valueDate')) {
      const nextDate = toDateOrNull(dto.valueDate ?? null);

      if (dto.valueDate && !nextDate) {
        throw new BadRequestException('valueDate inválida');
      }

      data.valueDate = nextDate;
      data.valueBoolean = null;
      data.valueNumber = null;
      data.valueText = null;
      data.valueJson = Prisma.DbNull;
      data.value = stringifyLegacyValue(nextDate);
    } else if (hasOwn(dto, 'valueBoolean')) {
      data.valueBoolean = dto.valueBoolean ?? null;
      data.valueDate = null;
      data.valueNumber = null;
      data.valueText = null;
      data.valueJson = Prisma.DbNull;
      data.value = stringifyLegacyValue(dto.valueBoolean ?? null);
    } else if (hasOwn(dto, 'valueNumber')) {
      data.valueNumber = dto.valueNumber ?? null;
      data.valueDate = null;
      data.valueBoolean = null;
      data.valueText = null;
      data.valueJson = Prisma.DbNull;
      data.value = stringifyLegacyValue(dto.valueNumber ?? null);
    } else if (
      hasOwn(dto, 'valueText') ||
      hasOwn(dto, 'value') ||
      hasOwn(dto, 'resultValue')
    ) {
      const textValue = dto.valueText ?? dto.value ?? dto.resultValue ?? null;

      data.valueText = textValue;
      data.valueNumber = null;
      data.valueBoolean = null;
      data.valueDate = null;
      data.valueJson = Prisma.DbNull;
      data.value = textValue;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextItem = await tx.maintenanceReportItem.update({
        where: { id: itemId },
        data,
      });

      if (
        report.status === MaintenanceReportStatus.DRAFT ||
        report.status === MaintenanceReportStatus.ASSIGNED ||
        report.status === MaintenanceReportStatus.REJECTED
      ) {
        await tx.maintenanceReport.update({
          where: { id: report.id },
          data: {
            status: MaintenanceReportStatus.IN_PROGRESS,
            state: MaintenanceReportState.DRAFT,
            startedAt: report.startedAt ?? new Date(),
          },
        });
      }

      return nextItem;
    });

    const fullUpdated = await this.prisma.maintenanceReportItem.findFirst({
      where: { id: updated.id },
      include: {
        templateItem: true,
      },
    });

    if (!fullUpdated) {
      throw new NotFoundException('No se pudo recuperar el item actualizado.');
    }

    return serializeReportItem(fullUpdated as ReportItemEntity);
  }

  async finalize(companyId: string, id: string, userId?: string) {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const normalizedUserId = userId?.trim();

    if (normalizedUserId) {
      await this.ensureActiveUserInCompany(normalizedCompanyId, normalizedUserId);
    }

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: {
        items: true,
        workOrder: {
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      report.status === MaintenanceReportStatus.SUBMITTED ||
      report.status === MaintenanceReportStatus.APPROVED
    ) {
      throw new BadRequestException('El parte ya fue enviado al admin.');
    }

    if (report.status === MaintenanceReportStatus.CANCELLED) {
      throw new BadRequestException('No se puede finalizar un reporte cancelado.');
    }

    if (!report.items.length) {
      throw new BadRequestException('El reporte no tiene items.');
    }

    const pendingItems = report.items.filter((item) => item.status === MaintenanceItemStatus.PENDING);

    if (pendingItems.length > 0) {
      throw new BadRequestException(
        'No se puede enviar: todavía hay items en estado PENDING.',
      );
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextReport = await tx.maintenanceReport.update({
        where: { id },
        data: {
          status: MaintenanceReportStatus.SUBMITTED,
          state: MaintenanceReportState.FINAL,
          startedAt: report.startedAt ?? now,
          submittedAt: now,
          submittedById: normalizedUserId ?? report.submittedById ?? null,
          completedAt: report.completedAt ?? now,
          completedByUserId: normalizedUserId ?? report.completedByUserId ?? null,
        },
        include: reportInclude,
      });

      if (report.workOrderId && report.workOrder?.status !== WorkOrderStatus.CANCELLED) {
        await tx.workOrder.update({
          where: { id: report.workOrderId },
          data: {
            status: WorkOrderStatus.PENDING,
            startedAt: report.workOrder?.startedAt ?? report.startedAt ?? now,
            completedAt: null,
          },
        });
      }

      return nextReport;
    });

    return serializeReport(updated);
  }

  async review(
    companyId: string,
    id: string,
    userId: string | undefined,
    dto: ReviewMaintenanceReportDto,
  ) {
    const normalizedCompanyId = normalizeCompanyId(companyId);

    if (!userId?.trim()) {
      throw new BadRequestException('Falta header x-user-id');
    }

    const normalizedUserId = userId.trim();
    await this.ensureActiveUserInCompany(normalizedCompanyId, normalizedUserId);

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId: normalizedCompanyId },
      include: {
        workOrder: {
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (report.status !== MaintenanceReportStatus.SUBMITTED) {
      throw new BadRequestException('Solo se puede revisar un parte en estado SUBMITTED.');
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextReport = await tx.maintenanceReport.update({
        where: { id },
        data: dto.approved
          ? {
              status: MaintenanceReportStatus.APPROVED,
              state: MaintenanceReportState.FINAL,
              reviewedAt: now,
              reviewedById: normalizedUserId,
              reviewNotes: dto.reviewNotes ?? null,
            }
          : {
              status: MaintenanceReportStatus.REJECTED,
              state: MaintenanceReportState.DRAFT,
              reviewedAt: now,
              reviewedById: normalizedUserId,
              reviewNotes: dto.reviewNotes ?? null,
            },
        include: reportInclude,
      });

      if (report.workOrderId && report.workOrder?.status !== WorkOrderStatus.CANCELLED) {
        await tx.workOrder.update({
          where: { id: report.workOrderId },
          data: dto.approved
            ? {
                status: WorkOrderStatus.DONE,
                startedAt: report.workOrder?.startedAt ?? report.startedAt ?? now,
                completedAt: report.completedAt ?? now,
              }
            : {
                status: WorkOrderStatus.IN_PROGRESS,
                startedAt: report.workOrder?.startedAt ?? report.startedAt ?? now,
                completedAt: null,
              },
        });

        // Aquí va el hook de facturación real en la siguiente fase.
        // approve => generar factura / enviar email / crear documento PDF
      }

      return nextReport;
    });

    return serializeReport(updated);
  }
}