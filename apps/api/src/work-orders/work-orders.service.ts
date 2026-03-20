import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

function toDateOrNull(v?: string | Date | null): Date | null {
  if (!v) return null;
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

const workOrderInclude = {
  customer: true,
  site: true,
  asset: true,
  assignedTo: true,
} satisfies Prisma.WorkOrderInclude;

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{
  include: typeof workOrderInclude;
}>;

function serializeWorkOrder(item: WorkOrderWithRelations) {
  return {
    id: item.id,
    companyId: item.companyId,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    scheduledAt: item.scheduledAt,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,

    customerId: item.customerId,
    siteId: item.siteId,
    assetId: item.assetId,
    assignedToUserId: item.assignedToUserId,

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
        }
      : null,

    asset: item.asset
      ? {
          id: item.asset.id,
          name: item.asset.name,
          brand: item.asset.brand ?? null,
          model: item.asset.model ?? null,
          serialNumber: item.asset.serialNumber ?? null,
        }
      : null,

    assignedTo: item.assignedTo
      ? {
          id: item.assignedTo.id,
          name: item.assignedTo.name,
          email: item.assignedTo.email,
        }
      : null,
  };
}

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, _userId: string, dto: CreateWorkOrderDto) {
    if (!dto.customerId) {
      throw new BadRequestException('customerId es obligatorio');
    }

    if (!dto.siteId) {
      throw new BadRequestException('siteId es obligatorio');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        companyId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer no encontrado para esta company');
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: dto.siteId,
        companyId,
      },
      select: { id: true },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company');
    }

    const createDto = dto as CreateWorkOrderDto & {
      priority?: unknown;
      scheduledAt?: string | Date;
      startedAt?: string | Date;
      completedAt?: string | Date;
    };

    if (dto.assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: {
          id: dto.assetId,
          companyId,
        },
        select: { id: true },
      });

      if (!asset) {
        throw new NotFoundException('Asset no encontrado para esta company');
      }
    }

    if (dto.assignedToUserId) {
      const membership = await this.prisma.userCompany.findFirst({
        where: {
          companyId,
          userId: dto.assignedToUserId,
          active: true,
        },
        select: { id: true },
      });

      if (!membership) {
        throw new NotFoundException('assignedToUserId no pertenece a esta company');
      }
    }

    const item = await this.prisma.workOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        siteId: dto.siteId,
        assetId: dto.assetId ?? null,
        assignedToUserId: dto.assignedToUserId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        status: WorkOrderStatus.OPEN,
        ...(createDto.priority !== undefined
          ? { priority: normalizePriority(createDto.priority) }
          : {}),
        ...(createDto.scheduledAt !== undefined
          ? { scheduledAt: toDateOrNull(createDto.scheduledAt) }
          : {}),
        ...(createDto.startedAt !== undefined
          ? { startedAt: toDateOrNull(createDto.startedAt) }
          : {}),
        ...(createDto.completedAt !== undefined
          ? { completedAt: toDateOrNull(createDto.completedAt) }
          : {}),
      },
      include: workOrderInclude,
    });

    return serializeWorkOrder(item);
  }

  async list(companyId: string, q: QueryWorkOrdersDto) {
    const page = Math.max(1, q.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkOrderWhereInput = {
      companyId,
      ...(q.status ? { status: q.status } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.siteId ? { siteId: q.siteId } : {}),
      ...(q.assetId ? { assetId: q.assetId } : {}),
      ...(q.assignedToUserId ? { assignedToUserId: q.assignedToUserId } : {}),
    };

    if (q.q?.trim()) {
      const term = q.q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

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

  async get(companyId: string, id: string) {
    const item = await this.prisma.workOrder.findFirst({
      where: { companyId, id },
      include: workOrderInclude,
    });

    if (!item) {
      throw new NotFoundException('WorkOrder not found');
    }

    return serializeWorkOrder(item);
  }

  async update(companyId: string, id: string, dto: UpdateWorkOrderDto) {
    await this.get(companyId, id);

    const updateDto = dto as UpdateWorkOrderDto & {
      priority?: unknown;
      scheduledAt?: string | Date | null;
      startedAt?: string | Date | null;
      completedAt?: string | Date | null;
      status?: WorkOrderStatus;
      assetId?: string | null;
      assignedToUserId?: string | null;
    };

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          companyId,
        },
        select: { id: true },
      });

      if (!customer) {
        throw new NotFoundException('Customer no encontrado para esta company');
      }
    }

    if (dto.siteId) {
      const site = await this.prisma.site.findFirst({
        where: {
          id: dto.siteId,
          companyId,
        },
        select: { id: true },
      });

      if (!site) {
        throw new NotFoundException('Site no encontrado para esta company');
      }
    }

    if (updateDto.assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: {
          id: updateDto.assetId,
          companyId,
        },
        select: { id: true },
      });

      if (!asset) {
        throw new NotFoundException('Asset no encontrado para esta company');
      }
    }

    if (updateDto.assignedToUserId) {
      const membership = await this.prisma.userCompany.findFirst({
        where: {
          companyId,
          userId: updateDto.assignedToUserId,
          active: true,
        },
        select: { id: true },
      });

      if (!membership) {
        throw new NotFoundException('assignedToUserId no pertenece a esta company');
      }
    }

    const item = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
        ...(dto.siteId !== undefined ? { siteId: dto.siteId } : {}),
        ...(updateDto.assetId !== undefined ? { assetId: updateDto.assetId } : {}),
        ...(updateDto.assignedToUserId !== undefined
          ? { assignedToUserId: updateDto.assignedToUserId }
          : {}),
        ...(updateDto.priority !== undefined
          ? { priority: normalizePriority(updateDto.priority) }
          : {}),
        ...(updateDto.status !== undefined ? { status: updateDto.status } : {}),
        ...(updateDto.scheduledAt !== undefined
          ? { scheduledAt: toDateOrNull(updateDto.scheduledAt) }
          : {}),
        ...(updateDto.startedAt !== undefined
          ? { startedAt: toDateOrNull(updateDto.startedAt) }
          : {}),
        ...(updateDto.completedAt !== undefined
          ? { completedAt: toDateOrNull(updateDto.completedAt) }
          : {}),
      },
      include: workOrderInclude,
    });

    return serializeWorkOrder(item);
  }

  async setStatus(companyId: string, id: string, status: WorkOrderStatus) {
    await this.get(companyId, id);

    const data: Prisma.WorkOrderUpdateInput = {
      status,
    };

    if (status === WorkOrderStatus.IN_PROGRESS) {
      data.startedAt = new Date();
    }

    if (status === WorkOrderStatus.DONE) {
      data.completedAt = new Date();
    }

    const item = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: workOrderInclude,
    });

    return serializeWorkOrder(item);
  }
}