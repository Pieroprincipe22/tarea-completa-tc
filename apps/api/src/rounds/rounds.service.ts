import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceReportState,
  MaintenanceReportStatus,
  Prisma,
  RoundStatus,
  RoundStopStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { snapshotTemplateItem } from '../maintenance-reports/maintenance-reports.service';
import { NumberingService } from '../numbering/numbering.service';
import { CreateRoundDto } from './dto/rounds.dto';
import {
  ROUND_STOPS_MAX,
  compareStops,
  countStops,
  describeFrequency,
  formatDay,
  isIssueNotesLabel,
  parseDay,
  roundStartsAt,
  roundTitle,
  stopLabel,
  stopPlace,
  type StopCounts,
  type StopPlace,
} from './round-plan';

// Quién mira: el administrador ve todas las rondas; el técnico, las suyas.
export type Viewer = { userId: string; role: string };

export type NewRound = {
  siteId: string;
  templateId: string;
  category: string;
  dueAt: Date;
  technicianId: string | null;
  planId: string | null;
};

export type CreatedRound = {
  id: string;
  workOrderId: string;
  code: string | null;
  stops: number;
};

// Los puntos de las hojas se insertan en tandas (un hotel grande son miles).
const ITEM_CHUNK = 1000;
const LIST_MAX = 50;
const HISTORY_MAX = 50;

const ACTIVE_ASSET_STATUSES = ['ACTIVE', 'MAINTENANCE'] as const;

const EMPTY_COUNTS: StopCounts = { total: 0, done: 0, pending: 0, noAccess: 0, issues: 0 };

function isAdmin(viewer: Viewer): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'SUPER_ADMIN';
}

type Person = { id: string; name: string | null } | null;

function person(user: Person) {
  return user ? { id: user.id, name: user.name } : null;
}

const STOP_SELECT = {
  id: true,
  assetId: true,
  assetName: true,
  floorLevel: true,
  floorName: true,
  spaceKind: true,
  spaceName: true,
  status: true,
  hasIssue: true,
  noAccessReason: true,
  doneAt: true,
  updatedAt: true,
  doneBy: { select: { id: true, name: true } },
  report: { select: { id: true } },
} satisfies Prisma.RoundStopSelect;

type StopRow = Prisma.RoundStopGetPayload<{ select: typeof STOP_SELECT }>;

function serializeStop(stop: StopRow) {
  return {
    id: stop.id,
    assetId: stop.assetId,
    assetName: stop.assetName,
    floorLevel: stop.floorLevel,
    floorName: stop.floorName,
    spaceKind: stop.spaceKind,
    spaceName: stop.spaceName,
    label: stopLabel(stop),
    place: stopPlace(stop),
    status: stop.status,
    hasIssue: stop.hasIssue,
    noAccessReason: stop.noAccessReason,
    doneAt: stop.doneAt,
    updatedAt: stop.updatedAt,
    doneBy: person(stop.doneBy),
    reportId: stop.report?.id ?? null,
  };
}

type ItemRow = {
  label: string | null;
  title: string | null;
  type: string | null;
  unit: string | null;
  status: string;
  value: string | null;
  valueText: string | null;
  valueNumber: number | null;
  notes: string | null;
  minValue?: number | null;
  maxValue?: number | null;
};

function itemLabel(item: Pick<ItemRow, 'label' | 'title'>): string {
  return item.label ?? item.title ?? 'Punto';
}

function itemValue(item: ItemRow): string | null {
  const text = item.valueText ?? item.value;
  if (text !== null && text.trim() !== '') return text.trim();
  return item.valueNumber !== null ? String(item.valueNumber) : null;
}

function itemNumber(item: ItemRow): number | null {
  if (item.valueNumber !== null) return item.valueNumber;
  const parsed = item.value !== null && item.value.trim() !== '' ? Number(item.value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

// Lo que salió mal en un equipo: puntos marcados como incidencia, notas y
// el texto de "Incidencias observadas".
function problemsOf(items: ItemRow[]) {
  return items
    .filter((item) => {
      if (item.status === 'FAIL') return true;
      if (item.notes && item.notes.trim()) return true;
      return isIssueNotesLabel(item.label ?? item.title) && itemValue(item) !== null;
    })
    .map((item) => ({
      label: itemLabel(item),
      value: itemValue(item),
      unit: item.unit,
      notes: item.notes?.trim() || null,
      failed: item.status === 'FAIL',
    }));
}

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
  ) {}

  // ---------------------------------------------------------------
  // Crear
  // ---------------------------------------------------------------

  /**
   * Crea la orden de trabajo de la ronda y una parada por cada equipo
   * activo del sitio que sea de ese tipo, cada una con su hoja copiada de
   * la plantilla. Así el móvil puede descargar la ronda entera y
   * rellenarla aunque no haya cobertura.
   */
  async createRound(
    companyId: string,
    input: NewRound,
    createdById: string | null,
    client?: Prisma.TransactionClient,
  ): Promise<CreatedRound> {
    if (client) return this.buildRound(client, companyId, input, createdById);

    return this.prisma.$transaction((tx) => this.buildRound(tx, companyId, input, createdById), {
      timeout: 60_000,
      maxWait: 10_000,
    });
  }

  // Una ronda suelta, sin plan.
  async createManual(companyId: string, dto: CreateRoundDto, createdById: string) {
    const dueAt = parseDay(dto.dueOn);
    if (!dueAt) throw new BadRequestException('La fecha de la ronda no es válida.');

    return this.createRound(
      companyId,
      {
        siteId: dto.siteId,
        templateId: dto.templateId,
        category: dto.category,
        dueAt,
        technicianId: dto.assignedTechnicianId ?? null,
        planId: null,
      },
      createdById,
    );
  }

  async assertMember(
    client: Pick<Prisma.TransactionClient, 'userCompany'>,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const membership = await client.userCompany.findFirst({
      where: { companyId, userId, active: true, user: { isActive: true } },
      select: { id: true },
    });

    if (!membership) {
      throw new BadRequestException(
        'El técnico elegido no pertenece a tu empresa o está desactivado.',
      );
    }
  }

  private async buildRound(
    tx: Prisma.TransactionClient,
    companyId: string,
    input: NewRound,
    createdById: string | null,
  ): Promise<CreatedRound> {
    const site = await tx.site.findFirst({
      where: { id: input.siteId, companyId },
      select: { id: true, name: true, customerId: true },
    });
    if (!site) throw new NotFoundException('Sitio no encontrado.');

    const template = await tx.maintenanceTemplate.findFirst({
      where: { id: input.templateId, companyId },
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }] } },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada.');

    const templateName = template.name ?? template.title ?? 'Plantilla';
    if (!template.isActive) {
      throw new BadRequestException(`La plantilla «${templateName}» está archivada. Elige otra.`);
    }
    if (template.items.length === 0) {
      throw new BadRequestException(`La plantilla «${templateName}» no tiene puntos que revisar.`);
    }

    if (input.technicianId) await this.assertMember(tx, companyId, input.technicianId);

    const category = input.category.trim();
    const assets = await tx.asset.findMany({
      where: {
        companyId,
        siteId: site.id,
        category: { equals: category, mode: 'insensitive' },
        status: { in: [...ACTIVE_ASSET_STATUSES] },
      },
      select: {
        id: true,
        name: true,
        spaceId: true,
        space: {
          select: { kind: true, name: true, floor: { select: { level: true, name: true } } },
        },
      },
    });

    if (assets.length === 0) {
      throw new BadRequestException(
        `En ${site.name} no hay equipos activos de tipo «${category}».`,
      );
    }
    if (assets.length > ROUND_STOPS_MAX) {
      throw new BadRequestException(
        `Una ronda puede tener como mucho ${ROUND_STOPS_MAX} equipos y en ${site.name} hay ${assets.length} de tipo «${category}».`,
      );
    }

    const places = assets
      .map((asset) => ({
        assetId: asset.id,
        spaceId: asset.space ? asset.spaceId : null,
        floorLevel: asset.space?.floor.level ?? null,
        floorName: asset.space?.floor.name ?? null,
        spaceKind: asset.space?.kind ?? null,
        spaceName: asset.space?.name ?? null,
        assetName: asset.name,
      }))
      .sort(compareStops);

    const code = await this.numbering.next(tx, companyId, 'workOrder');
    const startsAt = roundStartsAt(input.dueAt);
    const workOrder = await tx.workOrder.create({
      data: {
        companyId,
        customerId: site.customerId,
        siteId: site.id,
        maintenanceTemplateId: template.id,
        code,
        title: roundTitle(category, site.name, input.dueAt),
        description: `Ronda de ${places.length} equipo${places.length === 1 ? '' : 's'} de tipo «${category}» con la hoja «${templateName}».`,
        status: input.technicianId ? 'ASSIGNED' : 'OPEN',
        scheduledAt: startsAt,
        scheduledFor: startsAt,
        assignedTechnicianId: input.technicianId,
        assignedToUserId: input.technicianId,
        createdById,
      },
      select: { id: true, code: true },
    });

    const round = await tx.maintenanceRound.create({
      data: {
        companyId,
        siteId: site.id,
        workOrderId: workOrder.id,
        planId: input.planId,
        templateId: template.id,
        category,
        dueAt: input.dueAt,
      },
      select: { id: true },
    });

    const stops = await tx.roundStop.createManyAndReturn({
      data: places.map((place, index) => ({
        companyId,
        roundId: round.id,
        ...place,
        sortOrder: index + 1,
      })),
      select: { id: true, assetId: true, spaceKind: true, spaceName: true },
    });

    const reports = await tx.maintenanceReport.createManyAndReturn({
      data: stops.map((stop) => ({
        companyId,
        roundStopId: stop.id,
        templateId: template.id,
        customerId: site.customerId,
        siteId: site.id,
        assetId: stop.assetId,
        createdById,
        title: `${templateName} · ${stopLabel(stop)}`,
        status: MaintenanceReportStatus.DRAFT,
        state: MaintenanceReportState.DRAFT,
      })),
      select: { id: true },
    });

    const rows = reports.flatMap((report) =>
      template.items.map((item, index) => snapshotTemplateItem(report.id, item, index)),
    );
    for (let start = 0; start < rows.length; start += ITEM_CHUNK) {
      await tx.maintenanceReportItem.createMany({ data: rows.slice(start, start + ITEM_CHUNK) });
    }

    return { id: round.id, workOrderId: workOrder.id, code: workOrder.code, stops: stops.length };
  }

  // ---------------------------------------------------------------
  // Leer
  // ---------------------------------------------------------------

  private assertCanSee(
    workOrder: { assignedTechnicianId: string | null; assignedToUserId: string | null },
    viewer: Viewer,
  ) {
    if (isAdmin(viewer)) return;
    if (
      workOrder.assignedTechnicianId === viewer.userId ||
      workOrder.assignedToUserId === viewer.userId
    ) {
      return;
    }
    throw new ForbiddenException('Esta ronda está asignada a otro técnico.');
  }

  async countByRound(roundIds: string[]): Promise<Map<string, StopCounts>> {
    const counts = new Map<string, StopCounts>();
    if (roundIds.length === 0) return counts;

    const [byStatus, withIssues] = await Promise.all([
      this.prisma.roundStop.groupBy({
        by: ['roundId', 'status'],
        where: { roundId: { in: roundIds } },
        _count: { _all: true },
      }),
      this.prisma.roundStop.groupBy({
        by: ['roundId'],
        where: { roundId: { in: roundIds }, hasIssue: true },
        _count: { _all: true },
      }),
    ]);

    const entry = (roundId: string) => {
      let current = counts.get(roundId);
      if (!current) {
        current = { ...EMPTY_COUNTS };
        counts.set(roundId, current);
      }
      return current;
    };

    for (const row of byStatus) {
      const current = entry(row.roundId);
      const n = row._count._all;
      current.total += n;
      if (row.status === RoundStopStatus.DONE) current.done += n;
      else if (row.status === RoundStopStatus.NO_ACCESS) current.noAccess += n;
      else current.pending += n;
    }
    for (const row of withIssues) entry(row.roundId).issues = row._count._all;

    return counts;
  }

  async list(companyId: string, filter: { siteId?: string }, viewer: Viewer) {
    const where: Prisma.MaintenanceRoundWhereInput = { companyId };
    if (filter.siteId) where.siteId = filter.siteId;
    if (!isAdmin(viewer)) {
      where.workOrder = {
        OR: [{ assignedTechnicianId: viewer.userId }, { assignedToUserId: viewer.userId }],
      };
    }

    const rounds = await this.prisma.maintenanceRound.findMany({
      where,
      orderBy: [{ dueAt: 'desc' }, { createdAt: 'desc' }],
      take: LIST_MAX,
      include: {
        site: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        workOrder: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            assignedTechnician: { select: { id: true, name: true } },
          },
        },
      },
    });

    const counts = await this.countByRound(rounds.map((r) => r.id));

    return {
      items: rounds.map((round) => ({
        id: round.id,
        status: round.status,
        category: round.category,
        dueOn: formatDay(round.dueAt),
        closedAt: round.closedAt,
        site: round.site,
        plan: round.plan,
        workOrder: {
          id: round.workOrder.id,
          code: round.workOrder.code,
          title: round.workOrder.title,
          status: round.workOrder.status,
        },
        technician: person(round.workOrder.assignedTechnician),
        counts: counts.get(round.id) ?? { ...EMPTY_COUNTS },
      })),
    };
  }

  async get(companyId: string, roundId: string, viewer: Viewer) {
    const round = await this.prisma.maintenanceRound.findFirst({
      where: { id: roundId, companyId },
      include: {
        site: { select: { id: true, name: true, customer: { select: { name: true } } } },
        template: { select: { id: true, name: true, title: true } },
        plan: { select: { id: true, name: true, every: true, unit: true } },
        closedBy: { select: { id: true, name: true } },
        workOrder: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            assignedTechnicianId: true,
            assignedToUserId: true,
            assignedTechnician: { select: { id: true, name: true } },
          },
        },
        stops: { orderBy: { sortOrder: 'asc' }, select: STOP_SELECT },
      },
    });

    if (!round) throw new NotFoundException('Ronda no encontrada.');
    this.assertCanSee(round.workOrder, viewer);

    const stops = round.stops.map(serializeStop);

    // Plantas en el orden de la ronda; los equipos sin habitación, al final.
    const floors: { level: number | null; name: string; stops: typeof stops }[] = [];
    for (const stop of stops) {
      let floor = floors.at(-1);
      if (!floor || floor.level !== stop.floorLevel) {
        floor = {
          level: stop.floorLevel,
          name:
            stop.floorLevel === null
              ? 'Sin habitación'
              : (stop.floorName ?? `Nivel ${stop.floorLevel}`),
          stops: [],
        };
        floors.push(floor);
      }
      floor.stops.push(stop);
    }

    const issueStops = stops.filter((stop) => stop.hasIssue);
    const issueItems = issueStops.length
      ? await this.prisma.maintenanceReportItem.findMany({
          where: { report: { roundStopId: { in: issueStops.map((stop) => stop.id) } } },
          orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
          select: {
            label: true,
            title: true,
            type: true,
            unit: true,
            status: true,
            value: true,
            valueText: true,
            valueNumber: true,
            notes: true,
            report: { select: { roundStopId: true } },
          },
        })
      : [];

    const itemsByStop = new Map<string, ItemRow[]>();
    for (const item of issueItems) {
      const stopId = item.report.roundStopId;
      if (!stopId) continue;
      const list = itemsByStop.get(stopId) ?? [];
      list.push(item);
      itemsByStop.set(stopId, list);
    }

    return {
      id: round.id,
      status: round.status,
      category: round.category,
      dueOn: formatDay(round.dueAt),
      startedAt: round.startedAt,
      closedAt: round.closedAt,
      closeNote: round.closeNote,
      closedBy: person(round.closedBy),
      workOrder: {
        id: round.workOrder.id,
        code: round.workOrder.code,
        title: round.workOrder.title,
        status: round.workOrder.status,
      },
      technician: person(round.workOrder.assignedTechnician),
      site: {
        id: round.site.id,
        name: round.site.name,
        customerName: round.site.customer?.name ?? null,
      },
      template: round.template
        ? {
            id: round.template.id,
            name: round.template.name ?? round.template.title ?? 'Plantilla',
          }
        : null,
      plan: round.plan
        ? {
            id: round.plan.id,
            name: round.plan.name,
            frequency: describeFrequency(round.plan.every, round.plan.unit),
          }
        : null,
      counts: countStops(round.stops),
      floors,
      incidents: issueStops.map((stop) => ({
        stopId: stop.id,
        place: stop.place,
        assetName: stop.assetName,
        doneAt: stop.doneAt,
        doneBy: stop.doneBy,
        problems: problemsOf(itemsByStop.get(stop.id) ?? []),
      })),
      noAccess: stops
        .filter((stop) => stop.status === RoundStopStatus.NO_ACCESS)
        .map((stop) => ({
          stopId: stop.id,
          place: stop.place,
          assetName: stop.assetName,
          reason: stop.noAccessReason,
          at: stop.updatedAt,
        })),
    };
  }

  async getStop(companyId: string, roundId: string, stopId: string, viewer: Viewer) {
    const stop = await this.prisma.roundStop.findFirst({
      where: { id: stopId, roundId, companyId },
      select: {
        ...STOP_SELECT,
        round: {
          select: {
            id: true,
            status: true,
            workOrder: { select: { assignedTechnicianId: true, assignedToUserId: true } },
          },
        },
        report: {
          select: {
            id: true,
            status: true,
            items: {
              orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
              select: {
                id: true,
                label: true,
                title: true,
                section: true,
                type: true,
                unit: true,
                required: true,
                minValue: true,
                maxValue: true,
                status: true,
                value: true,
                valueText: true,
                valueNumber: true,
                notes: true,
              },
            },
          },
        },
      },
    });

    if (!stop) throw new NotFoundException('Equipo no encontrado en esta ronda.');
    this.assertCanSee(stop.round.workOrder, viewer);

    return {
      ...serializeStop(stop),
      roundId: stop.round.id,
      roundStatus: stop.round.status,
      items: (stop.report?.items ?? []).map((item) => ({
        id: item.id,
        label: itemLabel(item),
        section: item.section,
        type: item.type,
        unit: item.unit,
        required: item.required,
        minValue: item.minValue,
        maxValue: item.maxValue,
        status: item.status,
        value: itemValue(item),
        notes: item.notes,
      })),
    };
  }

  // ---------------------------------------------------------------
  // Cerrar, reabrir y cancelar
  // ---------------------------------------------------------------

  private async findForChange(companyId: string, roundId: string) {
    const round = await this.prisma.maintenanceRound.findFirst({
      where: { id: roundId, companyId },
      select: {
        id: true,
        status: true,
        workOrderId: true,
        workOrder: { select: { assignedTechnicianId: true, assignedToUserId: true } },
      },
    });
    if (!round) throw new NotFoundException('Ronda no encontrada.');
    return round;
  }

  /**
   * Cierra la ronda aunque queden equipos sin hacer (habitaciones a las que
   * no se pudo entrar): en el informe salen como pendientes.
   */
  async close(companyId: string, roundId: string, viewer: Viewer, note: string | null) {
    const round = await this.findForChange(companyId, roundId);
    if (round.status === RoundStatus.DONE)
      throw new BadRequestException('La ronda ya está cerrada.');
    if (round.status === RoundStatus.CANCELLED) {
      throw new BadRequestException(
        'La ronda está cancelada. Reábrela si hay que seguir con ella.',
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.maintenanceRound.update({
        where: { id: round.id },
        data: {
          status: RoundStatus.DONE,
          closedAt: now,
          closedById: viewer.userId,
          closeNote: note,
        },
      }),
      this.prisma.workOrder.update({
        where: { id: round.workOrderId },
        data: { status: 'DONE', completedAt: now },
      }),
    ]);

    return this.get(companyId, roundId, viewer);
  }

  async reopen(companyId: string, roundId: string, viewer: Viewer) {
    const round = await this.findForChange(companyId, roundId);
    if (round.status !== RoundStatus.DONE && round.status !== RoundStatus.CANCELLED) {
      throw new BadRequestException('La ronda ya está abierta.');
    }

    const started = await this.prisma.roundStop.count({
      where: { roundId: round.id, status: { not: RoundStopStatus.PENDING } },
    });
    const assigned = Boolean(
      round.workOrder.assignedTechnicianId ?? round.workOrder.assignedToUserId,
    );

    await this.prisma.$transaction([
      this.prisma.maintenanceRound.update({
        where: { id: round.id },
        data: {
          status: started > 0 ? RoundStatus.IN_PROGRESS : RoundStatus.OPEN,
          closedAt: null,
          closedById: null,
          closeNote: null,
        },
      }),
      this.prisma.workOrder.update({
        where: { id: round.workOrderId },
        data: {
          status: started > 0 ? 'IN_PROGRESS' : assigned ? 'ASSIGNED' : 'OPEN',
          completedAt: null,
        },
      }),
    ]);

    return this.get(companyId, roundId, viewer);
  }

  async cancel(companyId: string, roundId: string, viewer: Viewer) {
    const round = await this.findForChange(companyId, roundId);
    if (round.status === RoundStatus.CANCELLED)
      throw new BadRequestException('La ronda ya está cancelada.');
    if (round.status === RoundStatus.DONE) {
      throw new BadRequestException(
        'Una ronda cerrada no se cancela. Reábrela antes si hace falta.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.maintenanceRound.update({
        where: { id: round.id },
        data: { status: RoundStatus.CANCELLED },
      }),
      this.prisma.workOrder.update({
        where: { id: round.workOrderId },
        data: { status: 'CANCELLED' },
      }),
    ]);

    return this.get(companyId, roundId, viewer);
  }

  // ---------------------------------------------------------------
  // Historial de un equipo
  // ---------------------------------------------------------------

  async assetHistory(companyId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, companyId },
      select: { id: true, name: true, category: true, siteId: true },
    });
    if (!asset) throw new NotFoundException('Equipo no encontrado.');

    const [stops, reports, plans] = await Promise.all([
      this.prisma.roundStop.findMany({
        where: { companyId, assetId, round: { status: { not: RoundStatus.CANCELLED } } },
        orderBy: [{ round: { dueAt: 'desc' } }],
        take: HISTORY_MAX,
        select: {
          id: true,
          status: true,
          hasIssue: true,
          noAccessReason: true,
          doneAt: true,
          floorLevel: true,
          floorName: true,
          spaceKind: true,
          spaceName: true,
          assetName: true,
          doneBy: { select: { id: true, name: true } },
          round: {
            select: { id: true, dueAt: true, status: true, workOrder: { select: { code: true } } },
          },
          report: {
            select: {
              id: true,
              items: {
                where: {
                  OR: [
                    { type: 'NUMBER' },
                    { status: 'FAIL' },
                    { notes: { not: null } },
                    { label: { contains: 'incidencia', mode: 'insensitive' } },
                  ],
                },
                orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
                select: {
                  label: true,
                  title: true,
                  type: true,
                  unit: true,
                  status: true,
                  value: true,
                  valueText: true,
                  valueNumber: true,
                  notes: true,
                  minValue: true,
                  maxValue: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.maintenanceReport.findMany({
        where: { companyId, assetId, roundStopId: null },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_MAX,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          completedAt: true,
          workOrder: { select: { id: true, code: true } },
        },
      }),
      asset.siteId && asset.category
        ? this.prisma.maintenancePlan.findMany({
            where: {
              companyId,
              siteId: asset.siteId,
              isActive: true,
              category: { equals: asset.category, mode: 'insensitive' },
            },
            orderBy: { nextDueAt: 'asc' },
            select: { id: true, name: true, every: true, unit: true, nextDueAt: true },
          })
        : Promise.resolve([]),
    ]);

    const fromRounds = stops.map((stop) => {
      const items = stop.report?.items ?? [];
      return {
        kind: 'ROUND' as const,
        id: stop.id,
        date: stop.doneAt ?? stop.round.dueAt,
        roundId: stop.round.id,
        roundStatus: stop.round.status,
        code: stop.round.workOrder.code,
        place: stopPlace(stop as StopPlace),
        status: stop.status,
        hasIssue: stop.hasIssue,
        noAccessReason: stop.noAccessReason,
        doneBy: person(stop.doneBy),
        measurements: items
          .filter((item) => item.type === 'NUMBER')
          .map((item) => {
            const value = itemNumber(item);
            return {
              label: itemLabel(item),
              value,
              unit: item.unit,
              outOfRange:
                value !== null &&
                ((item.minValue !== null && value < item.minValue) ||
                  (item.maxValue !== null && value > item.maxValue)),
            };
          })
          .filter((m) => m.value !== null),
        problems: problemsOf(items),
      };
    });

    const fromReports = reports.map((report) => ({
      kind: 'REPORT' as const,
      id: report.id,
      date: report.completedAt ?? report.createdAt,
      reportId: report.id,
      code: report.workOrder?.code ?? null,
      title: report.title,
      status: report.status,
    }));

    return {
      asset: { id: asset.id, name: asset.name, category: asset.category },
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        frequency: describeFrequency(plan.every, plan.unit),
        nextDueOn: formatDay(plan.nextDueAt),
      })),
      entries: [...fromRounds, ...fromReports].sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  }
}