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

  private normalizeWorkOrderData(dto: object): WorkOrderPlainObject {
    const data = this.cleanUndefined(dto);

    /**
     * Frontend: assignedToId
     * Prisma actual: assignedToUserId
     */
    if (typeof data.assignedToId === 'string') {
      data.assignedToUserId = data.assignedToId;
      delete data.assignedToId;
    }

    /**
     * Evitamos enviar relación assignedTo porque tu Prisma actual
     * no la acepta en create/update.
     */
    delete data.assignedTo;

    /**
     * Frontend: scheduledAt
     * Prisma actual: scheduledFor
     */
    if (typeof data.scheduledAt === 'string') {
      data.scheduledFor = new Date(data.scheduledAt);
      delete data.scheduledAt;
    }

    /**
     * Si en algún punto llega dueDate, lo eliminamos porque tu modelo
     * WorkOrder actual no lo muestra como campo disponible.
     */
    delete data.dueDate;

    /**
     * Si el frontend manda priority pero el schema actual no tiene priority,
     * lo quitamos para evitar PrismaClientValidationError.
     */
    delete data.priority;

    /**
     * Campos que estaban en DTO pero tu WorkOrder actual puede no tener.
     * Los quitamos para que Prisma no falle.
     */
    delete data.location;
    delete data.reference;
    delete data.notes;
    delete data.isActive;

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

    /**
     * Frontend:
     * /work-orders?assignedToId=ID_DEL_TECNICO&pageSize=100
     *
     * Prisma actual usa assignedToUserId.
     */
    if (query.assignedToId) {
      where.assignedToUserId = query.assignedToId;
    }

    if (query.status) {
      where.status = this.normalizeStatus(query.status);
    }

    /**
     * Solo aplicamos priority si el modelo la soporta.
     * Como tu error de Prisma no muestra priority en WorkOrder,
     * no filtramos por priority aquí.
     */

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
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    return workOrder;
  }

  async create(companyId: string, dto: object) {
    if (!dto) {
      throw new BadRequestException('Faltan datos para crear la orden');
    }

    const data = this.normalizeWorkOrderData(dto);

    data.companyId = companyId;

    return this.prisma.workOrder.create({
      data: data as Prisma.WorkOrderUncheckedCreateInput,
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
      } as Prisma.WorkOrderUncheckedUpdateInput,
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
    });
  }

  async remove(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    await this.findOne(companyId ?? id, companyId ? id : undefined);

    return this.prisma.workOrder.delete({
      where: {
        id,
      },
    });
  }
}