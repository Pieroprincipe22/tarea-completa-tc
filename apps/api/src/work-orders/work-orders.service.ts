import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NumberingService } from '../numbering/numbering.service';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';

type WorkOrderPlainObject = Record<string, unknown>;

const workOrderStatusValues = [
  'OPEN',
  'ASSIGNED',
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;

type WorkOrderStatusValue = (typeof workOrderStatusValues)[number];

const workOrderPriorityValues = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
type WorkOrderPriorityValue = (typeof workOrderPriorityValues)[number];

type WorkOrderWhereInput = Record<string, unknown>;
type WorkOrderInclude = Record<string, unknown>;

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
  ) {}

  private readonly workOrderInclude: WorkOrderInclude = {
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
    // Si la orden es una ronda de muchos equipos.
    round: {
      select: {
        id: true,
        status: true,
      },
    },
  };

  /**
   * Una ronda se cierra, se reabre y se cancela desde la propia ronda, que
   * lleva la cuenta de sus equipos. Desde la orden solo se cambian sus datos.
   */
  private assertNotRound(workOrder: unknown): void {
    const round = (workOrder as { round?: { id: string } | null }).round;

    if (round) {
      throw new BadRequestException(
        'Esta orden es una ronda: ciérrala, reábrela o cancélala desde la propia ronda.',
      );
    }
  }

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

  private isWorkOrderStatus(value: string): value is WorkOrderStatusValue {
    return (workOrderStatusValues as readonly string[]).includes(value);
  }

  private isWorkOrderPriority(value: string): value is WorkOrderPriorityValue {
    return (workOrderPriorityValues as readonly string[]).includes(value);
  }

  private resolveStatusFromAction(candidates: string[]): WorkOrderStatusValue {
    for (const candidate of candidates) {
      if (this.isWorkOrderStatus(candidate)) {
        return candidate;
      }
    }

    throw new BadRequestException(
      `No existe un estado válido para esta acción.
Revisa el enum WorkOrderStatus en schema.prisma.
Estados probados: ${candidates.join(', ')}`,
    );
  }

  private normalizeStatus(status: string): WorkOrderStatusValue {
    if (!this.isWorkOrderStatus(status)) {
      throw new BadRequestException(`Estado de orden no válido: ${status}`);
    }

    return status;
  }

  private normalizePriority(
    priority?: string,
  ): WorkOrderPriorityValue | undefined {
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

  private pickString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;

    const cleanValue = value.trim();

    return cleanValue ? cleanValue : undefined;
  }

  private resolveAssignedUserId(data: WorkOrderPlainObject): string | undefined {
    return (
      this.pickString(data.assignedToId) ??
      this.pickString(data.assignedToUserId) ??
      this.pickString(data.assignedTechnicianId)
    );
  }

  private normalizeWorkOrderData(dto: object): WorkOrderPlainObject {
    const data = this.cleanUndefined(dto);
    const assignedUserId = this.resolveAssignedUserId(data);

    /**
     * El frontend puede enviar assignedToId.
     * Prisma guarda actualmente la asignación en:
     * - assignedToUserId
     * - assignedTechnicianId
     *
     * Mantenemos ambos sincronizados para evitar inconsistencias.
     */
    if (assignedUserId) {
      data.assignedToUserId = assignedUserId;
      data.assignedTechnicianId = assignedUserId;
    }

    delete data.assignedToId;

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
    delete data.maintenanceTemplate;

    /**
     * El número y la empresa los pone siempre el servidor: nadie puede
     * elegir su propio número ni mover una orden a otra empresa.
     */
    delete data.code;
    delete data.companyId;

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

  /**
   * Comprueba que el cliente, el site, el equipo y el técnico que llegan
   * son de ESTA empresa. Sin esto, alguien que conozca el ID de un cliente
   * de otra empresa podría enlazarlo a su orden y ver su nombre y dirección.
   *
   * currentCustomerId: el cliente que ya tenía la orden (al editar), para
   * comprobar que un site nuevo es de ese cliente.
   */
  private async assertReferencesBelongToCompany(
    companyId: string,
    data: WorkOrderPlainObject,
    currentCustomerId?: string | null,
  ): Promise<void> {
    const customerId = this.pickString(data.customerId);
    const siteId = this.pickString(data.siteId);
    const assetId = this.pickString(data.assetId);
    const technicianId = this.pickString(data.assignedToUserId);

    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: { id: true },
      });

      if (!customer) {
        throw new BadRequestException('El cliente elegido no existe en tu empresa.');
      }
    }

    if (siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, companyId },
        select: { id: true, customerId: true },
      });

      if (!site) {
        throw new BadRequestException('El site elegido no existe en tu empresa.');
      }

      // Si la orden se queda sin cliente (null), no hay nada que comparar.
      const effectiveCustomerId =
        data.customerId === undefined ? currentCustomerId : customerId;

      if (effectiveCustomerId && site.customerId !== effectiveCustomerId) {
        throw new BadRequestException('El site elegido no es de ese cliente.');
      }
    }

    if (assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: { id: assetId, companyId },
        select: { id: true },
      });

      if (!asset) {
        throw new BadRequestException('El equipo elegido no existe en tu empresa.');
      }
    }

    if (technicianId) {
      await this.assertTechnicianBelongsToCompany(companyId, technicianId);
    }
  }

  /**
   * El técnico tiene que ser un usuario activo con acceso activo a esta empresa.
   */
  private async assertTechnicianBelongsToCompany(
    companyId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId,
        active: true,
        user: { isActive: true },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new BadRequestException(
        'El técnico elegido no pertenece a tu empresa o está desactivado.',
      );
    }
  }

  private resolveAssignedFilter(
    query: QueryWorkOrdersDto,
  ): string | undefined {
    return (
      query.assignedToId ??
      query.assignedToUserId ??
      query.assignedTechnicianId
    );
  }

  private buildWhere(
    companyId?: string,
    query: QueryWorkOrdersDto = {},
  ): WorkOrderWhereInput {
    const where: WorkOrderWhereInput = {};
    const andFilters: WorkOrderWhereInput[] = [];

    if (companyId) {
      where.companyId = companyId;
    }

    if (query.status) {
      andFilters.push({
        status: this.normalizeStatus(query.status),
      });
    }

    if (query.priority) {
      andFilters.push({
        priority: this.normalizePriority(query.priority),
      });
    }

    if (query.customerId) {
      andFilters.push({ customerId: query.customerId });
    }

    if (query.siteId) {
      andFilters.push({ siteId: query.siteId });
    }

    if (query.assetId) {
      andFilters.push({ assetId: query.assetId });
    }

    const assignedTo = this.resolveAssignedFilter(query);

    if (assignedTo) {
      andFilters.push({
        OR: [
          { assignedToUserId: assignedTo },
          { assignedTechnicianId: assignedTo },
        ],
      });
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    return where;
  }

  // ===== PARTE 2 INICIA AQUÍ =====
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

    const where: WorkOrderWhereInput = {
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

    await this.assertReferencesBelongToCompany(companyId, data);

    data.companyId = companyId;

    /**
     * Este campo hace que en el detalle salga:
     * Creado por: Admin Demo / Encargado / Administración.
     */
    if (createdById) {
      data.createdById = createdById;
    }

    /**
     * El número (OT-2026-0001) se reserva en la misma transacción que crea
     * la orden: si algo falla, el número no se gasta y no quedan huecos.
     */
    return this.prisma.$transaction(async (tx) => {
      data.code = await this.numbering.next(tx, companyId, 'workOrder');

      return tx.workOrder.create({
        data: data as any,
        include: this.workOrderInclude,
      });
    });
  }

  async update(companyId: string, id: string, dto: object) {
    if (!dto) {
      throw new BadRequestException('Faltan datos para actualizar la orden');
    }

    const current = await this.findOne(companyId, id);

    const data = this.normalizeWorkOrderData(dto);

    // En una ronda no se cambia el estado ni dónde se hace: eso lo lleva la ronda.
    if (
      ['status', 'customerId', 'siteId', 'assetId', 'maintenanceTemplateId'].some(
        (field) => data[field] !== undefined,
      )
    ) {
      this.assertNotRound(current);
    }

    await this.assertReferencesBelongToCompany(
      companyId,
      data,
      (current as { customerId?: string | null }).customerId ?? null,
    );

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: data as any,
      include: this.workOrderInclude,
    });
  }

  async updateStatus(companyId: string, id: string, status: string) {
    if (!status) {
      throw new BadRequestException('Falta el estado de la orden');
    }

    this.assertNotRound(await this.findOne(companyId, id));

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
    await this.assertTechnicianBelongsToCompany(companyId, assignedToId);

    return this.prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        assignedToUserId: assignedToId,
        assignedTechnicianId: assignedToId,
      } as any,
      include: this.workOrderInclude,
    });
  }

  async start(companyIdOrId: string, maybeId?: string) {
    const { companyId, id } = this.resolveScopedArgs(companyIdOrId, maybeId);

    this.assertNotRound(
      await this.findOne(companyId ?? id, companyId ? id : undefined),
    );

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

    this.assertNotRound(
      await this.findOne(companyId ?? id, companyId ? id : undefined),
    );

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

    this.assertNotRound(
      await this.findOne(companyId ?? id, companyId ? id : undefined),
    );

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

    this.assertNotRound(
      await this.findOne(companyId ?? id, companyId ? id : undefined),
    );

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