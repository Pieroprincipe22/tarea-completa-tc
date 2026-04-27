import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceItemStatus,
  MaintenanceReportState,
  MaintenanceReportStatus,
  Prisma,
  UserRole,
  WorkOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { ReviewMaintenanceReportDto } from './dto/review-maintenance-report.dto';
import { UpdateMaintenanceReportItemDto } from './dto/update-maintenance-report-items.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';

const reportInclude = {
  template: {
    select: {
      id: true,
      name: true,
      title: true,
      description: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
    },
  },
  site: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      country: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
      code: true,
      internalCode: true,
      category: true,
      brand: true,
      model: true,
      serialNumber: true,
      location: true,
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
      startedAt: true,
      completedAt: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  completedByUser: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  assignedTechnician: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  submittedBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  reviewedBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  },
  items: {
    orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
  },
  materials: {
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.MaintenanceReportInclude;

type ReportWithRelations = Prisma.MaintenanceReportGetPayload<{
  include: typeof reportInclude;
}>;

type ReportItemEntity = ReportWithRelations['items'][number];
type ReportMaterialEntity = ReportWithRelations['materials'][number];

type Actor = {
  id: string;
  email: string;
  name: string | null;
  userRole: UserRole | null;
  companyRole: UserRole;
};

type UpdateReportPayload = UpdateMaintenanceReportDto & {
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  summary?: string | null;
  diagnosis?: string | null;
  workPerformed?: string | null;
  recommendations?: string | null;
  observations?: string | null;
  technicianNotes?: string | null;
  laborHours?: number | string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  performedAt?: string | null;
  materials?: Array<{
    name?: string | null;
    description?: string | null;
    quantity?: number | string | null;
    unit?: string | null;
    notes?: string | null;
    sortOrder?: number | null;
  }>;
};

function normalizeCompanyId(companyId: string | undefined): string {
  const value = companyId?.trim();

  if (!value) {
    throw new BadRequestException('Falta header x-company-id');
  }

  return value;
}

function normalizeUserId(userId: string | undefined): string {
  const value = userId?.trim();

  if (!value) {
    throw new BadRequestException('Falta header x-user-id');
  }

  return value;
}

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
  ) {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(
  value: string | null | undefined,
  fieldName: string,
): Date | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} no tiene formato de fecha válido.`);
  }

  return date;
}

function parseLaborHours(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException('Las horas trabajadas deben ser un número válido.');
  }

  return parsed;
}

function serializeReportMaterial(material: ReportMaterialEntity) {
  return {
    id: material.id,
    reportId: material.reportId,
    name: material.name,
    description: material.description,
    quantity: material.quantity,
    unit: material.unit,
    sortOrder: material.sortOrder,
    notes: material.notes,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

function serializeReportItem(item: ReportItemEntity) {
  const parsedNumber =
    item.value !== null && item.value.trim() !== '' ? Number(item.value) : NaN;

  return {
    id: item.id,
    reportId: item.reportId,
    templateItemId: item.templateItemId,
    label: item.label,
    title: item.title,
    description: item.description,
    type: item.type,
    valueType: item.valueType,
    required: item.required,
    itemOrder: item.itemOrder,
    sortOrder: item.sortOrder,
    unit: item.unit,
    status: item.status,

    value: item.value,
    valueText: item.valueText ?? item.value,
    valueNumber:
      item.valueNumber ?? (Number.isFinite(parsedNumber) ? parsedNumber : null),
    valueBoolean: item.valueBoolean,
    valueDate: item.valueDate,
    valueJson: item.valueJson,
    valueChoice: null,

    notes: item.notes,
    resultValue: item.value,
    resultNotes: item.notes,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeReport(report: ReportWithRelations) {
  return {
    id: report.id,
    companyId: report.companyId,
    customerId: report.customerId,
    siteId: report.siteId,
    assetId: report.assetId,
    templateId: report.templateId,
    workOrderId: report.workOrderId,

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
    laborHours: decimalToNumber(report.laborHours),

    status: report.status,
    state: report.state,

    createdById: report.createdById,
    createdByUserId: report.createdByUserId,
    completedByUserId: report.completedByUserId,
    assignedTechnicianId: report.assignedTechnicianId,
    submittedById: report.submittedById,
    reviewedById: report.reviewedById,

    assignedAt: report.assignedAt,
    startedAt: report.startedAt,
    submittedAt: report.submittedAt,
    completedAt: report.completedAt,
    reviewedAt: report.reviewedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,

    performedAt: report.completedAt ?? report.startedAt ?? report.createdAt,

    templateName: report.template?.title ?? report.template?.name ?? report.title,
    templateDesc: report.template?.description ?? report.description ?? null,

    template: report.template,
    customer: report.customer,
    site: report.site,
    asset: report.asset,
    workOrder: report.workOrder,
    createdBy: report.createdBy,
    createdByUser: report.createdByUser,
    completedByUser: report.completedByUser,
    assignedTechnician: report.assignedTechnician,
    submittedBy: report.submittedBy,
    reviewedBy: report.reviewedBy,

    items: report.items.map(serializeReportItem),
    materials: report.materials.map(serializeReportMaterial),
  };
}

@Injectable()
export class MaintenanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureActiveUserInCompany(
    companyId: string,
    userId: string,
  ): Promise<Actor> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        companyId,
        userId,
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!userCompany || !userCompany.user?.isActive) {
      throw new BadRequestException(
        'El usuario del header no pertenece a esta company.',
      );
    }

    return {
      id: userCompany.user.id,
      email: userCompany.user.email,
      name: userCompany.user.name,
      userRole: userCompany.user.role,
      companyRole: userCompany.role,
    };
  }

  private isAdmin(actor: Actor): boolean {
    return (
      actor.companyRole === UserRole.ADMIN ||
      actor.companyRole === UserRole.SUPER_ADMIN ||
      actor.userRole === UserRole.ADMIN ||
      actor.userRole === UserRole.SUPER_ADMIN
    );
  }

  private ensureAssignedTechnicianOrAdmin(
    actor: Actor,
    assignedTechnicianId: string | null,
  ) {
    if (this.isAdmin(actor)) return;

    if (!assignedTechnicianId) {
      throw new ForbiddenException('Esta orden todavía no tiene técnico asignado.');
    }

    if (assignedTechnicianId !== actor.id) {
      throw new ForbiddenException(
        'No puedes modificar un parte asignado a otro técnico.',
      );
    }
  }

  private ensureAdmin(actor: Actor) {
    if (!this.isAdmin(actor)) {
      throw new ForbiddenException('Solo un administrador puede revisar este parte.');
    }
  }

  private buildMaterialsCreateManyData(
    reportId: string,
    materials: NonNullable<UpdateReportPayload['materials']>,
  ): Prisma.MaintenanceReportMaterialCreateManyInput[] {
    const rows: Prisma.MaintenanceReportMaterialCreateManyInput[] = [];

    materials.forEach((material, index) => {
      const name = cleanString(material.name);

      if (!name) {
        return;
      }

      const rawQuantity = material.quantity as unknown;

      const quantity =
        rawQuantity === null || rawQuantity === undefined || rawQuantity === ''
          ? 1
          : Number(rawQuantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `La cantidad del material "${name}" debe ser mayor que 0.`,
        );
      }

      rows.push({
        reportId,
        name,
        description: cleanString(material.description),
        quantity,
        unit: cleanString(material.unit),
        notes: cleanString(material.notes),
        sortOrder: material.sortOrder ?? index + 1,
      });
    });

    return rows;
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

  async ensureForWorkOrder(
    companyId: string,
    userId: string | undefined,
    workOrderId: string,
  ) {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const normalizedUserId = normalizeUserId(userId);

    const actor = await this.ensureActiveUserInCompany(
      normalizedCompanyId,
      normalizedUserId,
    );

    const existingReport = await this.prisma.maintenanceReport.findFirst({
      where: {
        companyId: normalizedCompanyId,
        workOrderId,
      },
      include: reportInclude,
    });

    if (existingReport) {
      this.ensureAssignedTechnicianOrAdmin(
        actor,
        existingReport.assignedTechnicianId,
      );

      return serializeReport(existingReport);
    }

    const workOrder = await this.prisma.workOrder.findFirst({
      where: {
        id: workOrderId,
        companyId: normalizedCompanyId,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        status: true,
        customerId: true,
        siteId: true,
        assetId: true,
        assignedTechnicianId: true,
        assignedToUserId: true,
        maintenanceTemplateId: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('WorkOrder no encontrada para esta company.');
    }

    if (
      workOrder.status === WorkOrderStatus.CANCELLED ||
      workOrder.status === WorkOrderStatus.DONE
    ) {
      throw new BadRequestException(
        'No se puede crear un parte para una orden cerrada.',
      );
    }

    const assignedTechnicianId =
      workOrder.assignedTechnicianId ?? workOrder.assignedToUserId ?? null;

    if (!assignedTechnicianId) {
      throw new BadRequestException(
        'La orden debe tener un técnico asignado antes de crear el parte.',
      );
    }

    this.ensureAssignedTechnicianOrAdmin(actor, assignedTechnicianId);

    const template = workOrder.maintenanceTemplateId
      ? await this.prisma.maintenanceTemplate.findFirst({
          where: {
            id: workOrder.maintenanceTemplateId,
            companyId: normalizedCompanyId,
          },
          include: {
            items: {
              orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
            },
          },
        })
      : null;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceReport.create({
        data: {
          companyId: normalizedCompanyId,
          workOrderId: workOrder.id,
          templateId: template?.id ?? null,
          customerId: workOrder.customerId,
          siteId: workOrder.siteId,
          assetId: workOrder.assetId,

          createdById: normalizedUserId,
          createdByUserId: normalizedUserId,
          assignedTechnicianId,

          title: `Parte de trabajo - ${workOrder.code ?? workOrder.title}`,
          description: workOrder.description ?? null,

          status: MaintenanceReportStatus.ASSIGNED,
          state: MaintenanceReportState.DRAFT,
          assignedAt: new Date(),
        },
      });

      if (template?.items.length) {
        await tx.maintenanceReportItem.createMany({
          data: template.items.map((item, index) => ({
            reportId: created.id,
            templateItemId: item.id,
            label: item.label ?? item.title ?? `Item ${index + 1}`,
            title: item.title ?? item.label ?? `Item ${index + 1}`,
            description: item.description ?? null,
            type: item.type ?? null,
            valueType: item.valueType ?? null,
            required: item.required,
            sortOrder: item.sortOrder ?? index + 1,
            itemOrder: item.itemOrder ?? index + 1,
            unit: item.unit ?? null,
            status: MaintenanceItemStatus.PENDING,
            value: null,
            notes: null,
          })),
        });
      }

      const fullReport = await tx.maintenanceReport.findFirst({
        where: {
          id: created.id,
          companyId: normalizedCompanyId,
        },
        include: reportInclude,
      });

      if (!fullReport) {
        throw new NotFoundException('No se pudo recuperar el parte creado.');
      }

      return serializeReport(fullReport);
    });
  }

  async createFromTemplate(
    companyId: string,
    userId: string | undefined,
    dto: CreateMaintenanceReportDto,
  ) {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const normalizedUserId = normalizeUserId(userId);

    await this.ensureActiveUserInCompany(normalizedCompanyId, normalizedUserId);

    const createDto = dto as CreateMaintenanceReportDto & {
      title?: string;
      notes?: string;
      workOrderId?: string;
    };

    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: {
        id: dto.templateId,
        companyId: normalizedCompanyId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
        },
      },
    });

    if (!template) {
      throw new NotFoundException(
        'MaintenanceTemplate no encontrado para esta company.',
      );
    }

    if (!template.items.length) {
      throw new BadRequestException('El template no tiene items.');
    }

    let customerId: string | null = dto.customerId ?? null;
    let siteId: string | null = dto.siteId ?? null;
    let assetId: string | null = dto.assetId ?? null;

    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: customerId,
          companyId: normalizedCompanyId,
        },
        select: { id: true },
      });

      if (!customer) {
        throw new NotFoundException('Customer no encontrado para esta company.');
      }
    }

    if (siteId) {
      const site = await this.prisma.site.findFirst({
        where: {
          id: siteId,
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

      if (customerId && site.customerId !== customerId) {
        throw new BadRequestException('El site no pertenece al customer indicado.');
      }

      customerId = customerId ?? site.customerId;
    }

    if (assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: {
          id: assetId,
          companyId: normalizedCompanyId,
        },
        select: {
          id: true,
          customerId: true,
          siteId: true,
        },
      });

      if (!asset) {
        throw new NotFoundException('Asset no encontrado para esta company.');
      }

      if (siteId && asset.siteId && asset.siteId !== siteId) {
        throw new BadRequestException('El asset no pertenece al site indicado.');
      }

      siteId = siteId ?? asset.siteId;
      customerId = customerId ?? asset.customerId;
    }

    let linkedWorkOrder:
      | {
          id: string;
          customerId: string | null;
          siteId: string | null;
          assetId: string | null;
          assignedTechnicianId: string | null;
          assignedToUserId: string | null;
        }
      | null = null;

    if (createDto.workOrderId) {
      linkedWorkOrder = await this.prisma.workOrder.findFirst({
        where: {
          id: createDto.workOrderId,
          companyId: normalizedCompanyId,
        },
        select: {
          id: true,
          customerId: true,
          siteId: true,
          assetId: true,
          assignedTechnicianId: true,
          assignedToUserId: true,
        },
      });

      if (!linkedWorkOrder) {
        throw new NotFoundException('WorkOrder no encontrada para esta company.');
      }

      if (customerId && linkedWorkOrder.customerId !== customerId) {
        throw new BadRequestException(
          'La work order no pertenece al customer indicado.',
        );
      }

      if (siteId && linkedWorkOrder.siteId !== siteId) {
        throw new BadRequestException('La work order no pertenece al site indicado.');
      }

      if (
        assetId &&
        linkedWorkOrder.assetId &&
        linkedWorkOrder.assetId !== assetId
      ) {
        throw new BadRequestException(
          'El asset del reporte no coincide con el asset de la work order.',
        );
      }

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

      customerId = customerId ?? linkedWorkOrder.customerId;
      siteId = siteId ?? linkedWorkOrder.siteId;
      assetId = assetId ?? linkedWorkOrder.assetId;
    }

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.maintenanceReport.create({
        data: {
          companyId: normalizedCompanyId,
          customerId,
          siteId,
          assetId,
          templateId: template.id,
          workOrderId: linkedWorkOrder?.id ?? null,
          assignedTechnicianId:
            linkedWorkOrder?.assignedTechnicianId ??
            linkedWorkOrder?.assignedToUserId ??
            null,
          title:
            createDto.title?.trim() ||
            template.title ||
            template.name ||
            'Parte de mantenimiento',
          description: template.description ?? null,
          notes: createDto.notes ?? null,
          status: MaintenanceReportStatus.DRAFT,
          state: MaintenanceReportState.DRAFT,
          createdById: normalizedUserId,
          createdByUserId: normalizedUserId,
        },
      });

      await tx.maintenanceReportItem.createMany({
        data: template.items.map((item, index) => ({
          reportId: report.id,
          templateItemId: item.id,
          label: item.label ?? item.title ?? `Item ${index + 1}`,
          title: item.title ?? item.label ?? `Item ${index + 1}`,
          description: item.description ?? null,
          type: item.type ?? null,
          valueType: item.valueType ?? null,
          required: item.required,
          sortOrder: item.sortOrder ?? index + 1,
          itemOrder: item.itemOrder ?? index + 1,
          unit: item.unit ?? null,
          status: MaintenanceItemStatus.PENDING,
          value: null,
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
      where: {
        id,
        companyId: normalizedCompanyId,
      },
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
    const normalizedUserId = normalizeUserId(userId);

    const actor = await this.ensureActiveUserInCompany(
      normalizedCompanyId,
      normalizedUserId,
    );

    const patch = dto as UpdateReportPayload;

    const report = await this.prisma.maintenanceReport.findFirst({
      where: {
        id,
        companyId: normalizedCompanyId,
      },
      include: reportInclude,
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    this.ensureAssignedTechnicianOrAdmin(actor, report.assignedTechnicianId);

    if (
      report.status === MaintenanceReportStatus.SUBMITTED ||
      report.status === MaintenanceReportStatus.APPROVED ||
      report.status === MaintenanceReportStatus.COMPLETED ||
      report.status === MaintenanceReportStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'No se puede editar un parte enviado, aprobado o cerrado.',
      );
    }

    const data: Prisma.MaintenanceReportUpdateInput = {};

    if (hasOwn(patch, 'title')) data.title = cleanString(patch.title);
    if (hasOwn(patch, 'description')) {
      data.description = cleanString(patch.description);
    }
    if (hasOwn(patch, 'notes')) data.notes = cleanString(patch.notes);
    if (hasOwn(patch, 'summary')) data.summary = cleanString(patch.summary);
    if (hasOwn(patch, 'diagnosis')) data.diagnosis = cleanString(patch.diagnosis);
    if (hasOwn(patch, 'workPerformed')) {
      data.workPerformed = cleanString(patch.workPerformed);
    }
    if (hasOwn(patch, 'recommendations')) {
      data.recommendations = cleanString(patch.recommendations);
    }
    if (hasOwn(patch, 'observations')) {
      data.observations = cleanString(patch.observations);
    }
    if (hasOwn(patch, 'technicianNotes')) {
      data.technicianNotes = cleanString(patch.technicianNotes);
    }
    if (hasOwn(patch, 'laborHours')) {
      data.laborHours = parseLaborHours(patch.laborHours);
    }
    if (hasOwn(patch, 'startedAt')) {
      data.startedAt = parseDate(patch.startedAt, 'startedAt');
    }
    if (hasOwn(patch, 'completedAt')) {
      data.completedAt = parseDate(patch.completedAt, 'completedAt');
    }
    if (hasOwn(patch, 'performedAt')) {
      data.completedAt = parseDate(patch.performedAt, 'performedAt');
    }

    if (
      report.status === MaintenanceReportStatus.DRAFT ||
      report.status === MaintenanceReportStatus.ASSIGNED ||
      report.status === MaintenanceReportStatus.REJECTED
    ) {
      data.status = MaintenanceReportStatus.IN_PROGRESS;
      data.state = MaintenanceReportState.DRAFT;
      data.startedAt = report.startedAt ?? new Date();
    }

    const shouldReplaceMaterials = Array.isArray(patch.materials);
    const materialRows = shouldReplaceMaterials
      ? this.buildMaterialsCreateManyData(id, patch.materials ?? [])
      : [];

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceReport.update({
        where: { id },
        data,
      });

      if (shouldReplaceMaterials) {
        await tx.maintenanceReportMaterial.deleteMany({
          where: { reportId: id },
        });

        if (materialRows.length > 0) {
          await tx.maintenanceReportMaterial.createMany({
            data: materialRows,
          });
        }
      }

      const fullReport = await tx.maintenanceReport.findFirst({
        where: {
          id: saved.id,
          companyId: normalizedCompanyId,
        },
        include: reportInclude,
      });

      if (!fullReport) {
        throw new NotFoundException('No se pudo recuperar el parte actualizado.');
      }

      return fullReport;
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
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      report.status === MaintenanceReportStatus.SUBMITTED ||
      report.status === MaintenanceReportStatus.APPROVED ||
      report.status === MaintenanceReportStatus.COMPLETED ||
      report.status === MaintenanceReportStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'No se pueden editar items de un reporte enviado o cerrado.',
      );
    }

    const item = await this.prisma.maintenanceReportItem.findFirst({
      where: {
        id: itemId,
        reportId,
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado.');
    }

    const data: Prisma.MaintenanceReportItemUpdateInput = {
      status: dto.status ?? item.status,
      value: dto.value ?? dto.resultValue ?? dto.valueText ?? item.value,
      notes: dto.notes ?? dto.resultNotes ?? item.notes,
    };

    if (dto.valueText !== undefined) data.valueText = dto.valueText;
    if (dto.valueNumber !== undefined) data.valueNumber = dto.valueNumber;
    if (dto.valueBoolean !== undefined) data.valueBoolean = dto.valueBoolean;
    if (dto.valueDate !== undefined) data.valueDate = new Date(dto.valueDate);
    if (dto.valueJson !== undefined) {
      data.valueJson = dto.valueJson as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.maintenanceReportItem.update({
      where: { id: itemId },
      data,
    });

    return serializeReportItem(updated);
  }

  async finalize(companyId: string, id: string, userId?: string) {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const normalizedUserId = normalizeUserId(userId);

    const actor = await this.ensureActiveUserInCompany(
      normalizedCompanyId,
      normalizedUserId,
    );

    const report = await this.prisma.maintenanceReport.findFirst({
      where: {
        id,
        companyId: normalizedCompanyId,
      },
      include: {
        items: true,
        workOrder: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    this.ensureAssignedTechnicianOrAdmin(actor, report.assignedTechnicianId);

    if (report.status === MaintenanceReportStatus.SUBMITTED) {
      throw new BadRequestException('El parte ya fue enviado al administrador.');
    }

    if (
      report.status === MaintenanceReportStatus.APPROVED ||
      report.status === MaintenanceReportStatus.COMPLETED
    ) {
      throw new BadRequestException('El parte ya está cerrado.');
    }

    if (report.status === MaintenanceReportStatus.CANCELLED) {
      throw new BadRequestException('No se puede enviar un parte cancelado.');
    }

    if (!report.workPerformed?.trim()) {
      throw new BadRequestException('Falta completar el trabajo realizado.');
    }

    if (!report.diagnosis?.trim()) {
      throw new BadRequestException('Falta completar el diagnóstico.');
    }

    const laborHours = decimalToNumber(report.laborHours);

    if (laborHours === null || laborHours <= 0) {
      throw new BadRequestException('Falta completar las horas trabajadas.');
    }

    if (report.items.length > 0) {
      const pendingItems = report.items.filter(
        (item) => item.status === MaintenanceItemStatus.PENDING,
      );

      if (pendingItems.length > 0) {
        throw new BadRequestException(
          'No se puede enviar: todavía hay items en estado PENDING.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceReport.update({
        where: { id },
        data: {
          status: MaintenanceReportStatus.SUBMITTED,
          state: MaintenanceReportState.FINAL,
          submittedAt: new Date(),
          submittedById: normalizedUserId,
          completedByUserId: normalizedUserId,
          completedAt: report.completedAt ?? new Date(),
        },
      });

      if (
        report.workOrderId &&
        report.workOrder?.status !== WorkOrderStatus.DONE &&
        report.workOrder?.status !== WorkOrderStatus.CANCELLED
      ) {
        await tx.workOrder.updateMany({
          where: {
            id: report.workOrderId,
            companyId: normalizedCompanyId,
          },
          data: {
            status: WorkOrderStatus.PENDING,
          },
        });
      }

      const fullReport = await tx.maintenanceReport.findFirst({
        where: {
          id: saved.id,
          companyId: normalizedCompanyId,
        },
        include: reportInclude,
      });

      if (!fullReport) {
        throw new NotFoundException('No se pudo recuperar el parte enviado.');
      }

      return fullReport;
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
    const normalizedUserId = normalizeUserId(userId);

    const actor = await this.ensureActiveUserInCompany(
      normalizedCompanyId,
      normalizedUserId,
    );

    this.ensureAdmin(actor);

    const report = await this.prisma.maintenanceReport.findFirst({
      where: {
        id,
        companyId: normalizedCompanyId,
      },
      include: {
        workOrder: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (report.status !== MaintenanceReportStatus.SUBMITTED) {
      throw new BadRequestException(
        'Solo se pueden revisar partes enviados al administrador.',
      );
    }

    const approved = dto.approved === true;

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.maintenanceReport.update({
        where: { id },
        data: {
          status: approved
            ? MaintenanceReportStatus.APPROVED
            : MaintenanceReportStatus.REJECTED,
          state: approved
            ? MaintenanceReportState.FINAL
            : MaintenanceReportState.DRAFT,
          reviewNotes: cleanString(dto.reviewNotes),
          reviewedById: normalizedUserId,
          reviewedAt: new Date(),
          completedAt: approved
            ? report.completedAt ?? new Date()
            : report.completedAt,
        },
      });

      if (report.workOrderId) {
        await tx.workOrder.updateMany({
          where: {
            id: report.workOrderId,
            companyId: normalizedCompanyId,
            status: {
              not: WorkOrderStatus.CANCELLED,
            },
          },
          data: approved
            ? {
                status: WorkOrderStatus.DONE,
                completedAt: new Date(),
              }
            : {
                status: WorkOrderStatus.IN_PROGRESS,
                completedAt: null,
              },
        });
      }

      const fullReport = await tx.maintenanceReport.findFirst({
        where: {
          id: saved.id,
          companyId: normalizedCompanyId,
        },
        include: reportInclude,
      });

      if (!fullReport) {
        throw new NotFoundException('No se pudo recuperar el parte revisado.');
      }

      return fullReport;
    });

    return serializeReport(updated);
  }
}