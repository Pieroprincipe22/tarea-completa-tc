import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';

type WorkOrderPlainObject = Record<string, unknown>;

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly workOrderInclude: Prisma.WorkOrderInclude = {
    customer: {
      select: {
        id: true,
        name: true,
      },
    },
    site: {
      select: {
        id: true,
        name: true,
        address: true,
      },
    },
    asset: {
      select: {
        id: true,
        name: true,
        code: true,
        serialNumber: true,
        location: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    assignedTechnician: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    assignedTo: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };

  private cleanUndefined(data: object): WorkOrderPlainObject {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  private resolveScopedArgs(companyIdOrId: string, maybeId?: string) {
    if (maybeId) {
      return {
        companyId: companyIdOrId,
        id: maybeId,
      };
    }

    return {
      companyId: undefined,
      id: companyIdOrId,
    };
  }

  private isWorkOrderStatus(value: string): value is WorkOrderStatus {
    return Object.values(WorkOrderStatus).includes(value as WorkOrderStatus);
  }

  private isWorkOrderPriority(value: string): value is WorkOrderPriority {
    return Object.values(WorkOrderPriority).includes(value as WorkOrderPriority);
  }

  private resolveStatusFromAction(candidates: string[]): WorkOrderStatus {
    for (const candidate of candidates) {
      if (this.isWorkOrderStatus(candidate)) {
        return candidate;
      }
    }

    throw new BadRequestException(
      `No existe un estado válido para esta acción. Revisa el enum WorkOrderStatus en schema.prisma. Estados probados: ${candidates.join(
        ', ',
      )}`,
    );
  }

  private normalizeStatus(status: string): WorkOrderStatus {
    if (!this.isWorkOrderStatus(status)) {
      throw new BadRequestException(`Estado de orden no válido: ${status}`);
    }

    return status;
  }

  private normalizePriority(priority?: string): WorkOrderPriority | undefined {
    if (!priority) return undefined;

    if (!this.isWorkOrderPriority(priority)) {
      throw new BadRequestException(`Prioridad de orden no válida: ${priority}`);
    }

    return priority;
  }

  private normalizeDate(value: unknown): Date | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Fecha inválida: ${value}`);
    }

    return date;
  }

  private normalizeWorkOrderData(dto: object): WorkOrderPlainObject {
    const data = this.cleanUndefined(dto);

    /**
     * Frontend puede enviar assignedToId.
     * Prisma actual guarda ese dato en assignedToUserId.
     */
    if (typeof data.assignedToId === 'string' && data.assignedToId.trim()) {
      data.assignedToUserId = data.assignedToId;
      data.assignedTechnicianId = data.assignedToId;
      delete data.assignedToId;
    }

    /**
     * Por seguridad eliminamos objetos de relación si llegan desde frontend.
     */
    delete data.customer;
    delete data.site;
    delete data.asset;
    delete data.assignedTo;
    delete data.assignedTechnician;
    delete data.createdBy;
    delete data.company;

    /**
     * Fechas.
     */
    const scheduledAt = this.normalizeDate(data.scheduledAt);
    const scheduledFor = this.normalizeDate(data.scheduledFor);

    if (scheduledAt) {
      data.scheduledAt = scheduledAt;
      data.scheduledFor = scheduledAt;
    }

    if (scheduledFor) {
      data.scheduledFor = scheduledFor;
    }

    const startedAt = this.normalizeDate(data.startedAt);
    if (startedAt) {
      data.startedAt = startedAt;
    }

    const completedAt = this.normalizeDate(data.completedAt);
    if (completedAt) {
      data.completedAt = completedAt;
    }

    /**
     * dueDate no existe en tu WorkOrder actual.
     */
    delete data.dueDate;

    /**
     * Campos auxiliares que no pertenecen al WorkOrder actual.
     */
    delete data.location;
    delete data.reference;
    delete data.notes;
    delete data.isActive;

    /**
     * Validación de enums.
     */
    if (typeof data.status === 'string') {
      data.status = this.normalizeStatus(data.status);
    }

    if (typeof data.priority === 'string') {
      data.priority = this.normalizePriority(data.priority);
    }

    return data;
  }

  private buildWhere(
    companyId?: string,
    query: QueryWorkOrdersDto = {},
  ): Prisma.WorkOrderWhereInput {
    const where: Prisma.WorkOrderWhereInput = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (query.assignedToId) {
      where.assignedToUserId = query.assignedToId;
    }

    if (query.status) {
      where.status = this.normalizeStatus(query.status);
    }

    const priority = this.normalizePriority(query.priority);
    if (priority) {
      where.priority = priority;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.assetId) {
      where.assetId = query.assetId;
    }

    return where;
  }

  async list(companyId: string, query: QueryWorkOrdersDto = {}) {
    return this.findAll(companyId, query);
  }

  async findAll(
    companyIdOrQuery?: string | QueryWorkOrdersDto,
    maybeQuery?: QueryWorkOrdersDto,
  ) {
    const companyId =
      typeof companyIdOrQuery === 'string' ? companyIdOrQuery : undefined;

    const query =
      typeof companyIdOrQuery === 'object'
        ? companyIdOrQuery
        : maybeQuery ?? {};

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = this.buildWhere(companyId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: this.workOrderInclude,
      }),
      this.prisma.workOrder.count({
        where,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(companyId: string, id: string) {
    return this.findOne(companyId, id);
  }

  async findOne(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    const where: Prisma.WorkOrderWhereInput = {
      id,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const workOrder = await this.prisma.workOrder.findFirst({
      where,
      include: this.workOrderInclude,
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    return workOrder;
  }

  async create(companyId: string, dto: object, createdById?: string) {
    if (!dto) {
      throw new BadRequestException('Faltan datos para crear la orden');
    }

    const data = this.normalizeWorkOrderData(dto);

    data.companyId = companyId;

    /**
     * Este campo hace que en el detalle salga:
     * Creado por: Admin Demo / Encargado / Administración.
     */
    if (createdById) {
      data.createdById = createdById;
    }

    return this.prisma.workOrder.create({
      data: data as Prisma.WorkOrderUncheckedCreateInput,
      include: this.workOrderInclude,
    });
  }

  async update(companyId: string, id: string, dto: object) {
    if (!dto) {
      throw new BadRequestException('Faltan datos para actualizar la orden');
    }

    await this.findOne(companyId, id);

    const data = this.normalizeWorkOrderData(dto);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: data as Prisma.WorkOrderUncheckedUpdateInput,
      include: this.workOrderInclude,
    });
  }

  async updateStatus(companyId: string, id: string, status: string) {
    if (!status) {
      throw new BadRequestException('Falta el estado de la orden');
    }

    await this.findOne(companyId, id);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        status: this.normalizeStatus(status),
      },
      include: this.workOrderInclude,
    });
  }

  async assign(companyId: string, id: string, assignedToId: string) {
    if (!assignedToId) {
      throw new BadRequestException('Falta el ID del técnico asignado');
    }

    await this.findOne(companyId, id);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        assignedToUserId: assignedToId,
        assignedTechnicianId: assignedToId,
      } as Prisma.WorkOrderUncheckedUpdateInput,
      include: this.workOrderInclude,
    });
  }

  async start(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    await this.findOne(companyId ?? id, companyId ? id : undefined);

    const status = this.resolveStatusFromAction([
      'IN_PROGRESS',
      'INPROGRESS',
      'STARTED',
      'ACTIVE',
    ]);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        status,
        startedAt: new Date(),
      },
      include: this.workOrderInclude,
    });
  }

  async markDone(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    await this.findOne(companyId ?? id, companyId ? id : undefined);

    const status = this.resolveStatusFromAction([
      'DONE',
      'COMPLETED',
      'FINISHED',
      'CLOSED',
    ]);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        status,
        completedAt: new Date(),
      },
      include: this.workOrderInclude,
    });
  }

  async reopen(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    await this.findOne(companyId ?? id, companyId ? id : undefined);

    const status = this.resolveStatusFromAction(['PENDING', 'OPEN', 'TODO']);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        status,
        completedAt: null,
      },
      include: this.workOrderInclude,
    });
  }

  async cancel(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    await this.findOne(companyId ?? id, companyId ? id : undefined);

    const status = this.resolveStatusFromAction([
      'CANCELED',
      'CANCELLED',
      'CANCELADO',
      'ARCHIVED',
    ]);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: this.workOrderInclude,
    });
  }

  async remove(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    await this.findOne(companyId ?? id, companyId ? id : undefined);

    return this.prisma.workOrder.delete({
      where: {
        id,
      },
      include: this.workOrderInclude,
    });
  }
}