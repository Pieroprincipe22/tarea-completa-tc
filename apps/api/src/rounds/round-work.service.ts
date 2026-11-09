import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceItemStatus,
  MaintenanceReportState,
  MaintenanceReportStatus,
  Prisma,
  RoundStatus,
  RoundStopStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { readOptions } from '../maintenance-templates/template-item-types';
import { SaveStopDto } from './dto/rounds.dto';
import {
  clampSavedAt,
  describeFrequency,
  formatDay,
  missingRequired,
  parseNumberValue,
  stopHasIssue,
  stopLabel,
  stopPlace,
} from './round-plan';
import { RoundsService, TEAM_SELECT, isAdmin, teamOf, type Viewer } from './rounds.service';

// Otra petición guardó un cambio más nuevo de la misma habitación a la vez.
class StaleSave extends Error {}

function itemValue(item: {
  value: string | null;
  valueText: string | null;
  valueNumber: number | null;
}): string | null {
  const text = item.valueText ?? item.value;
  if (text !== null && text.trim() !== '') return text.trim();
  return item.valueNumber !== null ? String(item.valueNumber) : null;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} y ${labels.length - 3} más`;
}

/**
 * Lo que hacen los técnicos con la ronda: empezarla, descargarla entera al
 * móvil, guardar cada habitación (también cuando llega tarde porque estaban
 * sin cobertura) y enviarla al encargado cuando está todo hecho.
 */
@Injectable()
export class RoundWorkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rounds: RoundsService,
  ) {}

  private closedError(status: RoundStatus): ConflictException {
    if (status === RoundStatus.SUBMITTED) {
      return new ConflictException(
        'La ronda ya está enviada al encargado. Si hay que cambiar algo, que te la devuelva.',
      );
    }
    if (status === RoundStatus.CANCELLED) {
      return new ConflictException('La ronda está cancelada.');
    }
    return new ConflictException('La ronda está cerrada.');
  }

  private startUpdates(
    client: Prisma.TransactionClient,
    roundId: string,
    workOrderId: string,
    now: Date,
  ) {
    return Promise.all([
      client.maintenanceRound.updateMany({
        where: { id: roundId, status: RoundStatus.OPEN },
        data: { status: RoundStatus.IN_PROGRESS, startedAt: now },
      }),
      client.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'IN_PROGRESS', startedAt: now },
      }),
    ]);
  }

  // ---------------------------------------------------------------
  // Iniciar
  // ---------------------------------------------------------------

  /** El técnico empieza la ronda. Si ya estaba empezada, no pasa nada. */
  async start(companyId: string, roundId: string, viewer: Viewer) {
    const round = await this.rounds.findForChange(companyId, roundId);
    this.rounds.assertCanSee(round.workOrder, viewer);

    if (round.status === RoundStatus.OPEN) {
      await this.prisma.$transaction((tx) =>
        this.startUpdates(tx, round.id, round.workOrderId, new Date()),
      );
    } else if (round.status !== RoundStatus.IN_PROGRESS) {
      throw this.closedError(round.status);
    }

    return this.rounds.get(companyId, roundId, viewer);
  }

  // ---------------------------------------------------------------
  // La ronda entera, para el móvil
  // ---------------------------------------------------------------

  /**
   * Todo lo que necesita el móvil para trabajar sin cobertura: cada equipo
   * con su hoja (puntos, opciones, rangos y lo ya anotado) y sus recambios.
   */
  async sheet(companyId: string, roundId: string, viewer: Viewer) {
    const round = await this.prisma.maintenanceRound.findFirst({
      where: { id: roundId, companyId },
      include: {
        site: { select: { id: true, name: true, customer: { select: { name: true } } } },
        template: { select: { id: true, name: true, title: true } },
        plan: { select: { id: true, name: true, every: true, unit: true } },
        workOrder: { select: { id: true, code: true, title: true, ...TEAM_SELECT } },
        stops: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            assetId: true,
            assetName: true,
            floorLevel: true,
            floorName: true,
            spaceKind: true,
            spaceName: true,
            sortOrder: true,
            status: true,
            noAccessReason: true,
            urgent: true,
            hasIssue: true,
            doneAt: true,
            savedAt: true,
            parts: {
              orderBy: { sortOrder: 'asc' },
              select: { name: true, quantity: true, unit: true },
            },
            report: {
              select: {
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
                    options: true,
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
        },
      },
    });

    if (!round) throw new NotFoundException('Ronda no encontrada.');
    this.rounds.assertCanSee(round.workOrder, viewer);

    return {
      id: round.id,
      status: round.status,
      category: round.category,
      dueOn: formatDay(round.dueAt),
      startedAt: round.startedAt,
      submittedAt: round.submittedAt,
      returnNote: round.returnNote,
      returnedAt: round.returnedAt,
      workOrder: {
        id: round.workOrder.id,
        code: round.workOrder.code,
        title: round.workOrder.title,
      },
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
      technicians: teamOf(round.workOrder),
      stops: round.stops.map((stop) => ({
        id: stop.id,
        assetId: stop.assetId,
        assetName: stop.assetName,
        floorLevel: stop.floorLevel,
        floorName: stop.floorName,
        spaceKind: stop.spaceKind,
        spaceName: stop.spaceName,
        label: stopLabel(stop),
        place: stopPlace(stop),
        sortOrder: stop.sortOrder,
        status: stop.status,
        noAccessReason: stop.noAccessReason,
        urgent: stop.urgent,
        hasIssue: stop.hasIssue,
        doneAt: stop.doneAt,
        savedAt: stop.savedAt,
        parts: stop.parts,
        items: (stop.report?.items ?? []).map((item) => ({
          id: item.id,
          label: item.label ?? item.title ?? 'Punto',
          section: item.section,
          type: item.type,
          unit: item.unit,
          required: item.required,
          minValue: item.minValue,
          maxValue: item.maxValue,
          options: readOptions(item.options),
          status: item.status,
          value: itemValue(item),
          notes: item.notes,
        })),
      })),
      downloadedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------
  // Guardar una habitación
  // ---------------------------------------------------------------

  /**
   * Guarda cómo quedó un equipo. Si el móvil manda un cambio más viejo que
   * el que ya hay (estaba sin cobertura y otro técnico la guardó después),
   * no se pisa: se devuelve lo que hay con `stale: true`.
   */
  async saveStop(
    companyId: string,
    roundId: string,
    stopId: string,
    dto: SaveStopDto,
    viewer: Viewer,
    now: Date = new Date(),
  ) {
    const stop = await this.prisma.roundStop.findFirst({
      where: { id: stopId, roundId, companyId },
      select: {
        id: true,
        savedAt: true,
        round: {
          select: {
            id: true,
            status: true,
            workOrderId: true,
            workOrder: {
              select: {
                assignedTechnicianId: true,
                assignedToUserId: true,
                technicians: { select: { userId: true } },
              },
            },
          },
        },
        report: {
          select: {
            id: true,
            items: {
              select: {
                id: true,
                label: true,
                title: true,
                type: true,
                required: true,
                status: true,
                value: true,
                valueText: true,
                valueNumber: true,
              },
            },
          },
        },
      },
    });

    if (!stop) throw new NotFoundException('Equipo no encontrado en esta ronda.');
    this.rounds.assertCanSee(stop.round.workOrder, viewer);

    const roundStatus = stop.round.status;
    const editable =
      roundStatus === RoundStatus.OPEN ||
      roundStatus === RoundStatus.IN_PROGRESS ||
      (roundStatus === RoundStatus.SUBMITTED && isAdmin(viewer));
    if (!editable) throw this.closedError(roundStatus);

    const savedAt = clampSavedAt(new Date(dto.savedAt), now);
    const stale = () =>
      this.rounds
        .getStop(companyId, roundId, stopId, viewer)
        .then((current) => ({ ...current, stale: true }));
    if (stop.savedAt && savedAt.getTime() <= stop.savedAt.getTime()) return stale();

    // Los puntos que llegan, sobre lo que ya había.
    const current = new Map((stop.report?.items ?? []).map((item) => [item.id, item]));
    const updates: { id: string; data: Prisma.MaintenanceReportItemUpdateInput }[] = [];
    const merged = new Map(
      [...current.values()].map((item) => [
        item.id,
        {
          label: item.label ?? item.title,
          type: item.type,
          required: item.required,
          status: item.status as string,
          value: itemValue(item),
        },
      ]),
    );

    for (const input of dto.items ?? []) {
      const item = current.get(input.id);
      if (!item) throw new BadRequestException('Un punto no es de la hoja de este equipo.');

      const value = input.value ?? null;
      let valueNumber: number | null = null;
      if (item.type === 'NUMBER' && value !== null) {
        valueNumber = parseNumberValue(value);
        if (valueNumber === null) {
          throw new BadRequestException(
            `«${item.label ?? item.title ?? 'Punto'}» tiene que ser un número.`,
          );
        }
      }

      updates.push({
        id: item.id,
        data: {
          status: input.status as MaintenanceItemStatus,
          value: valueNumber !== null ? String(valueNumber) : value,
          valueText: item.type === 'NUMBER' ? null : value,
          valueNumber,
          notes: input.notes ?? null,
        },
      });
      merged.set(item.id, {
        label: item.label ?? item.title,
        type: item.type,
        required: item.required,
        status: input.status,
        value: valueNumber !== null ? String(valueNumber) : value,
      });
    }

    const items = [...merged.values()];
    const status = dto.status;
    if (status === RoundStopStatus.DONE) {
      const missing = missingRequired(items);
      if (missing.length > 0) {
        throw new BadRequestException(
          `Falta rellenar: ${joinLabels(missing.map((m) => m.label ?? 'Punto'))}.`,
        );
      }
    }
    const reason = dto.noAccessReason ?? null;
    if (status === RoundStopStatus.NO_ACCESS && !reason) {
      throw new BadRequestException('Pon por qué no se pudo entrar.');
    }

    const urgent = status === RoundStopStatus.DONE ? (dto.urgent ?? false) : false;
    const finished = status !== RoundStopStatus.PENDING;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Se reserva la habitación: si otra petición guardó algo más nuevo
          // a la vez, esta no pisa nada.
          const claim = await tx.roundStop.updateMany({
            where: {
              id: stop.id,
              OR: [{ savedAt: null }, { savedAt: { lt: savedAt } }],
            },
            data: {
              status,
              noAccessReason: status === RoundStopStatus.NO_ACCESS ? reason : null,
              urgent,
              hasIssue: status === RoundStopStatus.DONE ? stopHasIssue(items, urgent) : false,
              savedAt,
              doneAt: finished ? savedAt : null,
              doneById: finished ? viewer.userId : null,
            },
          });
          if (claim.count === 0) throw new StaleSave();

          if (roundStatus === RoundStatus.OPEN) {
            await this.startUpdates(tx, stop.round.id, stop.round.workOrderId, now);
          }

          for (const update of updates) {
            await tx.maintenanceReportItem.update({ where: { id: update.id }, data: update.data });
          }

          if (dto.parts !== undefined) {
            await tx.roundStopPart.deleteMany({ where: { stopId: stop.id } });
            if (dto.parts.length > 0) {
              await tx.roundStopPart.createMany({
                data: dto.parts.map((part, index) => ({
                  companyId,
                  stopId: stop.id,
                  name: part.name,
                  quantity: part.quantity ?? 1,
                  unit: part.unit ?? null,
                  sortOrder: index + 1,
                })),
              });
            }
          }

          if (stop.report) {
            const done = status === RoundStopStatus.DONE;
            await tx.maintenanceReport.update({
              where: { id: stop.report.id },
              data: {
                status: done
                  ? MaintenanceReportStatus.COMPLETED
                  : MaintenanceReportStatus.IN_PROGRESS,
                state: done ? MaintenanceReportState.FINAL : MaintenanceReportState.DRAFT,
                completedAt: done ? savedAt : null,
                completedByUserId: done ? viewer.userId : null,
              },
            });
          }
        },
        { timeout: 30_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (error instanceof StaleSave) return stale();
      throw error;
    }

    const saved = await this.rounds.getStop(companyId, roundId, stopId, viewer);
    return { ...saved, stale: false };
  }

  // ---------------------------------------------------------------
  // Enviar al encargado
  // ---------------------------------------------------------------

  /** Se envía cuando están todos los equipos hechos (sin pendientes ni sin acceso). */
  async submit(companyId: string, roundId: string, viewer: Viewer) {
    const round = await this.rounds.findForChange(companyId, roundId);
    this.rounds.assertCanSee(round.workOrder, viewer);

    if (round.status === RoundStatus.OPEN) {
      throw new BadRequestException('Primero inicia la ronda y revisa los equipos.');
    }
    if (round.status !== RoundStatus.IN_PROGRESS) throw this.closedError(round.status);

    const left = await this.prisma.roundStop.groupBy({
      by: ['status'],
      where: { roundId: round.id, status: { not: RoundStopStatus.DONE } },
      _count: { _all: true },
    });
    const pending = left.find((row) => row.status === RoundStopStatus.PENDING)?._count._all ?? 0;
    const noAccess = left.find((row) => row.status === RoundStopStatus.NO_ACCESS)?._count._all ?? 0;
    if (pending + noAccess > 0) {
      const total = pending + noAccess;
      const parts = [
        pending > 0 ? `${pending} sin hacer` : null,
        noAccess > 0 ? `${noAccess} sin acceso` : null,
      ].filter(Boolean);
      throw new BadRequestException(
        `${total === 1 ? 'Falta' : 'Faltan'} ${total} equipo${total === 1 ? '' : 's'} (${parts.join(' y ')}). La ronda se envía cuando estén todos hechos.`,
      );
    }

    const now = new Date();
    const claimed = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.maintenanceRound.updateMany({
        where: { id: round.id, status: RoundStatus.IN_PROGRESS },
        data: { status: RoundStatus.SUBMITTED, submittedAt: now, submittedById: viewer.userId },
      });
      if (claim.count === 0) return false;
      await tx.workOrder.update({
        where: { id: round.workOrderId },
        data: { status: 'PENDING' },
      });
      return true;
    });
    if (!claimed) {
      const fresh = await this.rounds.findForChange(companyId, roundId);
      throw this.closedError(fresh.status);
    }

    return this.rounds.get(companyId, roundId, viewer);
  }
}