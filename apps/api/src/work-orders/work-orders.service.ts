import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

function toDateOrNull(v?: string): Date | null {
  return v ? new Date(v) : null;
}

const workOrderInclude = {
  customer: true,
  site: true,
  asset: true,
  createdBy: true,
  assignedTo: true,
} satisfies Prisma.WorkOrderInclude;

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{
  include: typeof workOrderInclude;
}>;

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateWorkOrderDto,
  ): Promise<WorkOrderWithRelations> {
    return this.prisma.$transaction(
      async (tx): Promise<WorkOrderWithRelations> => {
        // ✅ contador por compañía (upsert + increment atómico)
        const counter = await tx.companyCounter.upsert({
          where: { companyId },
          create: { companyId, workOrderSeq: 1 },
          update: { workOrderSeq: { increment: 1 } },
          select: { workOrderSeq: true },
        });

        // ✅ FIX CLAVE: relaciones obligatorias con connect()
        return tx.workOrder.create({
          data: {
            company: { connect: { id: companyId } },
            createdBy: { connect: { id: userId } },

            // En tu schema Customer es obligatorio
            customer: { connect: { id: dto.customerId } },

            number: counter.workOrderSeq,
            status: WorkOrderStatus.OPEN,
            priority: dto.priority ?? 3,
            title: dto.title,
            description: dto.description ?? null,
            scheduledAt: toDateOrNull(dto.scheduledAt),
            dueAt: toDateOrNull(dto.dueAt),

            ...(dto.siteId ? { site: { connect: { id: dto.siteId } } } : {}),
            ...(dto.assetId ? { asset: { connect: { id: dto.assetId } } } : {}),
            ...(dto.assignedToUserId
              ? { assignedTo: { connect: { id: dto.assignedToUserId } } }
              : {}),
          },
          include: workOrderInclude,
        });
      },
    );
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
        include: {
          customer: true,
          site: true,
          asset: true,
          assignedTo: true,
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async get(companyId: string, id: string) {
    const item = await this.prisma.workOrder.findFirst({
      where: { companyId, id },
      include: workOrderInclude,
    });

    if (!item) throw new NotFoundException('WorkOrder not found');
    return item;
  }

  async update(companyId: string, id: string, dto: UpdateWorkOrderDto) {
    await this.get(companyId, id);

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: toDateOrNull(dto.scheduledAt) }
          : {}),
        ...(dto.dueAt !== undefined ? { dueAt: toDateOrNull(dto.dueAt) } : {}),

        // relaciones (connect si vienen)
        ...(dto.customerId !== undefined
          ? { customer: { connect: { id: dto.customerId } } }
          : {}),
        ...(dto.siteId !== undefined
          ? { site: { connect: { id: dto.siteId } } }
          : {}),
        ...(dto.assetId !== undefined
          ? { asset: { connect: { id: dto.assetId } } }
          : {}),
        ...(dto.assignedToUserId !== undefined
          ? { assignedTo: { connect: { id: dto.assignedToUserId } } }
          : {}),
      },
      include: workOrderInclude,
    });
  }

  async setStatus(companyId: string, id: string, status: WorkOrderStatus) {
    await this.get(companyId, id);

    return this.prisma.workOrder.update({
      where: { id },
      data: { status },
      include: workOrderInclude,
    });
  }
}
