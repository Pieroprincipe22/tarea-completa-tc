import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceReportState,
  MaintenanceReportStatus,
  Prisma,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

function toDateOrNull(v?: string | Date | null): Date | null {
  if (v === undefined || v === null || v === '') return null;
  const date = v instanceof Date ? v : new Date(v);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePriority(value: unknown): WorkOrderPriority | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();

    if (normalized === 'LOW') return WorkOrderPriority.LOW;
    if (normalized === 'MEDIUM') return WorkOrderPriority.MEDIUM;
    if (normalized === 'HIGH') return WorkOrderPriority.HIGH;
    if (normalized === 'URGENT') return WorkOrderPriority.URGENT;

    if (normalized === '1') return WorkOrderPriority.LOW;
    if (normalized === '2') return WorkOrderPriority.MEDIUM;
    if (normalized === '3') return WorkOrderPriority.HIGH;
    if (normalized === '4') return WorkOrderPriority.URGENT;
  }

  if (typeof value === 'number') {
    if (value === 1) return WorkOrderPriority.LOW;
    if (value === 2) return WorkOrderPriority.MEDIUM;
    if (value === 3) return WorkOrderPriority.HIGH;
    if (value === 4) return WorkOrderPriority.URGENT;
  }

  throw new BadRequestException('priority inválida');
}

const userSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const workOrderInclude = {
  customer: true,
  site: true,
  asset: true,
  createdBy: {
    select: userSelect,
  },
  assignedTo: {
    select: userSelect,
  },
  assignedTechnician: {
    select: userSelect,
  },
  maintenanceTemplate: {
    select: {
      id: true,
      name: true,
      title: true,
      description: true,
      isActive: true,
    },
  },
  maintenanceReport: {
    select: {
      id: true,
      status: true,
      state: true,
      createdAt: true,
      completedAt: true,
    },
  },
} satisfies Prisma.WorkOrderInclude;

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{
  include: typeof workOrderInclude;
}>;

function serializeUser(user?: { id: string; name: string; email: string } | null) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function serializeWorkOrder(item: WorkOrderWithRelations) {
  const assignedUser = item.assignedTo ?? item.assignedTechnician ?? null;
  const assignedUserId = item.assignedToUserId ?? item.assignedTechnicianId ?? null;
  const scheduledValue = item.scheduledAt ?? item.scheduledFor ?? null;

  return {
    id: item.id,
    companyId: item.companyId,
    customerId: item.customerId,
    siteId: item.siteId,
    assetId: item.assetId,
    createdById: item.createdById,
    assignedToUserId: assignedUserId,
    assignedTechnicianId: item.assignedTechnicianId ?? item.assignedToUserId ?? null,
    maintenanceTemplateId: item.maintenanceTemplateId,
    code: item.code,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    scheduledAt: scheduledValue,
    scheduledFor: scheduledValue,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    customer: item.customer
      ? {
          id: item.customer.id,
          name: item.customer.name,
        }
      : null,
    site: item.site
      ? {
          id: item.site.id,
          name: item.site.name,
          address: item.site.address ?? null,
          city: item.site.city ?? null,
          country: item.site.country ?? null,
        }
      : null,
    asset: item.asset
      ? {
          id: item.asset.id,
          name: item.asset.name,
          code: item.asset.code ?? null,
          internalCode: item.asset.internalCode ?? null,
          brand: item.asset.brand ?? null,
          model: item.asset.model ?? null,
          serialNumber: item.asset.serialNumber ?? null,
        }
      : null,
    createdBy: serializeUser(item.createdBy),
    assignedTo: serializeUser(assignedUser),
    assignedTechnician: serializeUser(item.assignedTechnician ?? item.assignedTo),
    maintenanceTemplate: item.maintenanceTemplate,
    maintenanceReport: item.maintenanceReport,
  };
}

function resolveStatusLifecycleData(
  status: WorkOrderStatus | undefined,
  current: { startedAt: Date | null; completedAt: Date | null },
): Pick<Prisma.WorkOrderUpdateInput, 'startedAt' | 'completedAt'> {
  if (!status) return {};

  if (
    status === WorkOrderStatus.OPEN ||
    status === WorkOrderStatus.ASSIGNED ||
    status === WorkOrderStatus.PENDING
  ) {
    return {
      startedAt: null,
      completedAt: null,
    };
  }

  if (status === WorkOrderStatus.IN_PROGRESS) {
    return {
      startedAt: current.startedAt ?? new Date(),
      completedAt: null,
    };
  }

  if (status === WorkOrderStatus.DONE) {
    return {
      startedAt: current.startedAt ?? new Date(),
      completedAt: current.completedAt ?? new Date(),
    };
  }

  if (status === WorkOrderStatus.CANCELLED) {
    return {
      completedAt: null,
    };
  }

  return {};
}

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private async ensureCustomer(companyId: string, customerId?: string | null) {
    if (!customerId) return null;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer no encontrado para esta company');
    }

    return customer;
  }

  private async ensureSite(companyId: string, siteId?: string | null) {
    if (!siteId) return null;

    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true, customerId: true },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company');
    }

    return site;
  }

  private async ensureAsset(companyId: string, assetId?: string | null) {
    if (!assetId) return null;

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, companyId },
      select: { id: true, siteId: true },
    });

    if (!asset) {
      throw new NotFoundException('Asset no encontrado para esta company');
    }

    return asset;
  }

  private async ensureTemplate(companyId: string, maintenanceTemplateId?: string | null) {
    if (!maintenanceTemplateId) return null;

    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: { id: maintenanceTemplateId, companyId },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('MaintenanceTemplate no encontrado para esta company');
    }

    return template;
  }

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
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('El usuario no pertenece a esta company');
    }

    return user;
  }

  private async ensureTechnicianMembership(companyId: string, userId: string) {
    const technician = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        OR: [
          {
            companyId,
            role: UserRole.TECHNICIAN,
          },
          {
            memberships: {
              some: {
                companyId,
                active: true,
                role: UserRole.TECHNICIAN,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!technician) {
      throw new NotFoundException(
        'assignedToUserId no pertenece a esta company como técnico activo',
      );
    }
  }

  private async validateReferences(
    companyId: string,
    refs: {
      customerId?: string | null;
      siteId?: string | null;
      assetId?: string | null;
      assignedUserId?: string | null;
      maintenanceTemplateId?: string | null;
    },
  ) {
    const customer = await this.ensureCustomer(companyId, refs.customerId);
    const site = await this.ensureSite(companyId, refs.siteId);

    if (site && customer && site.customerId !== customer.id) {
      throw new BadRequestException(
        'El site no pertenece al customer indicado',
      );
    }

    if (refs.assetId) {
      const asset = await this.ensureAsset(companyId, refs.assetId);

      if (asset && site && asset.siteId && asset.siteId !== site.id) {
        throw new BadRequestException('El asset no pertenece al site indicado');
      }
    }

    if (refs.assignedUserId) {
      await this.ensureTechnicianMembership(companyId, refs.assignedUserId);
    }

    if (refs.maintenanceTemplateId) {
      await this.ensureTemplate(companyId, refs.maintenanceTemplateId);
    }
  }

  private async getLifecycleState(companyId: string, id: string) {
    const item = await this.prisma.workOrder.findFirst({
      where: { companyId, id },
      select: {
        id: true,
        status: true,
        customerId: true,
        siteId: true,
        assetId: true,
        assignedToUserId: true,
        assignedTechnicianId: true,
        maintenanceTemplateId: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!item) {
      throw new NotFoundException('WorkOrder not found');
    }

    return item;
  }

  private async ensureFinalizedReportForDone(
    companyId: string,
    workOrderId: string,
  ) {
    const report = await this.prisma.maintenanceReport.findFirst({
      where: {
        companyId,
        workOrderId,
        status: {
          not: MaintenanceReportStatus.CANCELLED,
        },
        OR: [
          { state: MaintenanceReportState.FINAL },
          {
            status: {
              in: [
                MaintenanceReportStatus.SUBMITTED,
                MaintenanceReportStatus.COMPLETED,
                MaintenanceReportStatus.APPROVED,
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        state: true,
      },
    });

    if (!report) {
      throw new BadRequestException(
        'No se puede marcar DONE sin un parte finalizado.',
      );
    }

    return report;
  }

  async create(companyId: string, userId: string, dto: CreateWorkOrderDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const normalizedUserId = userId?.trim();

    if (!normalizedUserId) {
      throw new BadRequestException('Falta x-user-id');
    }

    await this.ensureActiveUserInCompany(normalizedCompanyId, normalizedUserId);

    const createDto = dto as CreateWorkOrderDto & {
      priority?: unknown;
      scheduledAt?: string | Date;
      scheduledFor?: string | Date;
      assignedTechnicianId?: string | null;
    };

    const assignedUserId =
      createDto.assignedToUserId ?? createDto.assignedTechnicianId ?? null;

    const scheduledValue =
      createDto.scheduledAt !== undefined
        ? createDto.scheduledAt
        : createDto.scheduledFor;

    await this.validateReferences(normalizedCompanyId, {
      customerId: dto.customerId,
      siteId: dto.siteId,
      assetId: dto.assetId ?? null,
      assignedUserId,
      maintenanceTemplateId: dto.maintenanceTemplateId ?? null,
    });

    const item = await this.prisma.workOrder.create({
      data: {
        companyId: normalizedCompanyId,
        customerId: dto.customerId,
        siteId: dto.siteId,
        assetId: dto.assetId ?? null,
        createdById: normalizedUserId,
        assignedToUserId: assignedUserId,
        assignedTechnicianId: assignedUserId,
        maintenanceTemplateId: dto.maintenanceTemplateId ?? null,
        code: dto.code ?? null,
        title: dto.title,
        description: dto.description ?? null,
        status: assignedUserId
          ? WorkOrderStatus.ASSIGNED
          : WorkOrderStatus.OPEN,
        ...(createDto.priority !== undefined
          ? { priority: normalizePriority(createDto.priority) }
          : {}),
        ...(scheduledValue !== undefined
          ? {
              scheduledAt: toDateOrNull(scheduledValue),
              scheduledFor: toDateOrNull(scheduledValue),
            }
          : {}),
      },
      include: workOrderInclude,
    });

    return serializeWorkOrder(item);
  }

  async list(companyId: string, q: QueryWorkOrdersDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const assignedUserId = q.assignedToUserId ?? q.assignedTechnicianId;
    const andFilters: Prisma.WorkOrderWhereInput[] = [];

    if (assignedUserId) {
      andFilters.push({
        OR: [
          { assignedToUserId: assignedUserId },
          { assignedTechnicianId: assignedUserId },
        ],
      });
    }

    if (q.q?.trim()) {
      const term = q.q.trim();
      andFilters.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.WorkOrderWhereInput = {
      companyId: normalizedCompanyId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.siteId ? { siteId: q.siteId } : {}),
      ...(q.assetId ? { assetId: q.assetId } : {}),
      ...(q.maintenanceTemplateId ? { maintenanceTemplateId: q.maintenanceTemplateId } : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: workOrderInclude,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      items: items.map(serializeWorkOrder),
      total,
      page,
      pageSize,
    };
  }

  async listTechnicians(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          {
            companyId: normalizedCompanyId,
            role: UserRole.TECHNICIAN,
          },
          {
            memberships: {
              some: {
                companyId: normalizedCompanyId,
                active: true,
                role: UserRole.TECHNICIAN,
              },
            },
          },
        ],
      },
      select: userSelect,
      orderBy: { name: 'asc' },
    });

    const seen = new Set<string>();

    return users
      .filter((user) => {
        if (seen.has(user.id)) return false;
        seen.add(user.id);
        return true;
      })
      .map((user) => ({
        id: user.id,
        name: user.name?.trim() || user.email,
        email: user.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const item = await this.prisma.workOrder.findFirst({
      where: { companyId: normalizedCompanyId, id },
      include: workOrderInclude,
    });

    if (!item) {
      throw new NotFoundException('WorkOrder not found');
    }

    return serializeWorkOrder(item);
  }

  async update(companyId: string, id: string, dto: UpdateWorkOrderDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const existing = await this.getLifecycleState(normalizedCompanyId, id);

    const updateDto = dto as UpdateWorkOrderDto & {
      priority?: unknown;
      scheduledAt?: string | Date | null;
      scheduledFor?: string | Date | null;
      startedAt?: string | Date | null;
      completedAt?: string | Date | null;
      status?: WorkOrderStatus;
      assetId?: string | null;
      assignedToUserId?: string | null;
      assignedTechnicianId?: string | null;
      maintenanceTemplateId?: string | null;
    };

    const nextCustomerId =
      dto.customerId !== undefined ? dto.customerId : existing.customerId;

    const nextSiteId = dto.siteId !== undefined ? dto.siteId : existing.siteId;

    const nextAssetId =
      updateDto.assetId !== undefined ? updateDto.assetId : existing.assetId;

    const nextAssignedUserId =
      updateDto.assignedToUserId !== undefined
        ? updateDto.assignedToUserId
        : updateDto.assignedTechnicianId !== undefined
          ? updateDto.assignedTechnicianId
          : existing.assignedToUserId ?? existing.assignedTechnicianId;

    const nextTemplateId =
      updateDto.maintenanceTemplateId !== undefined
        ? updateDto.maintenanceTemplateId
        : existing.maintenanceTemplateId;

    await this.validateReferences(normalizedCompanyId, {
      customerId: nextCustomerId,
      siteId: nextSiteId,
      assetId: nextAssetId ?? null,
      assignedUserId: nextAssignedUserId ?? null,
      maintenanceTemplateId: nextTemplateId ?? null,
    });

    let nextStatus = updateDto.status;

    if (
      nextStatus === undefined &&
      (updateDto.assignedToUserId !== undefined ||
        updateDto.assignedTechnicianId !== undefined) &&
      (existing.status === WorkOrderStatus.OPEN ||
        existing.status === WorkOrderStatus.ASSIGNED ||
        existing.status === WorkOrderStatus.PENDING)
    ) {
      nextStatus = nextAssignedUserId
        ? WorkOrderStatus.ASSIGNED
        : WorkOrderStatus.OPEN;
    }

    if (nextStatus === WorkOrderStatus.DONE) {
      await this.ensureFinalizedReportForDone(normalizedCompanyId, id);
    }

    const scheduledValue =
      updateDto.scheduledAt !== undefined
        ? updateDto.scheduledAt
        : updateDto.scheduledFor;

    const item = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
        ...(dto.siteId !== undefined ? { siteId: dto.siteId } : {}),
        ...(updateDto.assetId !== undefined ? { assetId: updateDto.assetId } : {}),
        ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
        ...(updateDto.maintenanceTemplateId !== undefined
          ? { maintenanceTemplateId: updateDto.maintenanceTemplateId }
          : {}),
        ...(updateDto.assignedToUserId !== undefined ||
        updateDto.assignedTechnicianId !== undefined
          ? {
              assignedToUserId: nextAssignedUserId ?? null,
              assignedTechnicianId: nextAssignedUserId ?? null,
            }
          : {}),
        ...(updateDto.priority !== undefined
          ? { priority: normalizePriority(updateDto.priority) }
          : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
        ...(scheduledValue !== undefined
          ? {
              scheduledAt: toDateOrNull(scheduledValue),
              scheduledFor: toDateOrNull(scheduledValue),
            }
          : {}),
        ...(updateDto.startedAt !== undefined
          ? { startedAt: toDateOrNull(updateDto.startedAt) }
          : {}),
        ...(updateDto.completedAt !== undefined
          ? { completedAt: toDateOrNull(updateDto.completedAt) }
          : {}),
        ...resolveStatusLifecycleData(nextStatus, existing),
      },
      include: workOrderInclude,
    });

    return serializeWorkOrder(item);
  }

  async setStatus(companyId: string, id: string, status: WorkOrderStatus) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const existing = await this.getLifecycleState(normalizedCompanyId, id);

    if (status === WorkOrderStatus.DONE) {
      await this.ensureFinalizedReportForDone(normalizedCompanyId, id);
    }

    const item = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status,
        ...resolveStatusLifecycleData(status, existing),
      },
      include: workOrderInclude,
    });

    return serializeWorkOrder(item);
  }
}