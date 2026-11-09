import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/rounds.dto';
import {
  EVERY_MAX,
  LEAD_DAYS_DEFAULT,
  LEAD_DAYS_MAX,
  addDays,
  defaultPlanName,
  describeFrequency,
  firstDueFrom,
  formatDay,
  formatLongDay,
  occurrenceAfter,
  parseDay,
  pickDue,
  todayInSpain,
  type PlanTiming,
  type PlanUnit,
} from './round-plan';
import { RoundsService } from './rounds.service';

// Como mucho estas rondas seguidas de un mismo plan en una pasada (un plan
// semanal con mucha antelación puede tener varias pendientes de crear).
const ROUNDS_PER_PASS = 6;
// Planes que se revisan en cada pasada del programador.
const PLANS_PER_PASS = 500;

const ACTIVE_ASSET_STATUSES = ['ACTIVE', 'MAINTENANCE'] as const;

const PLAN_INCLUDE = {
  template: { select: { id: true, name: true, title: true, isActive: true } },
  assignedTechnician: { select: { id: true, name: true } },
  technicians: {
    orderBy: { createdAt: 'asc' },
    select: { userId: true, user: { select: { id: true, name: true } } },
  },
} satisfies Prisma.MaintenancePlanInclude;

type PlanRow = Prisma.MaintenancePlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function categoryKey(category: string): string {
  return category.trim().toLocaleLowerCase('es');
}

// Los técnicos del plan, sin repetir: el asignado primero.
function planTeam(plan: {
  assignedTechnician: { id: string; name: string } | null;
  technicians: { user: { id: string; name: string } }[];
}): { id: string; name: string }[] {
  const people = [plan.assignedTechnician, ...plan.technicians.map((t) => t.user)].filter(
    (p): p is { id: string; name: string } => p !== null,
  );
  const seen = new Set<string>();
  return people.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function planTeamIds(plan: {
  assignedTechnicianId: string | null;
  technicians: { userId: string }[];
}): string[] {
  const ids = [plan.assignedTechnicianId, ...plan.technicians.map((t) => t.userId)];
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

// Lo que pide el formulario: la lista nueva o, si no viene, el técnico de siempre.
function requestedTeam(dto: {
  technicianIds?: string[];
  assignedTechnicianId?: string | null;
}): string[] | undefined {
  if (dto.technicianIds !== undefined) return dto.technicianIds;
  if (dto.assignedTechnicianId !== undefined) {
    return dto.assignedTechnicianId ? [dto.assignedTechnicianId] : [];
  }
  return undefined;
}

@Injectable()
export class MaintenancePlansService {
  private readonly logger = new Logger('PlanesPreventivos');

  constructor(
    private readonly prisma: PrismaService,
    private readonly rounds: RoundsService,
  ) {}

  // ---------------------------------------------------------------
  // Comprobaciones
  // ---------------------------------------------------------------

  private async findSite(companyId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true, name: true, customer: { select: { name: true } } },
    });
    if (!site) throw new NotFoundException('Sitio no encontrado.');
    return site;
  }

  private async findPlan(companyId: string, siteId: string, planId: string) {
    const plan = await this.prisma.maintenancePlan.findFirst({
      where: { id: planId, companyId, siteId },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Plan no encontrado en este sitio.');
    return plan;
  }

  private async assertTemplate(companyId: string, templateId: string) {
    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: { id: templateId, companyId },
      select: { id: true, name: true, title: true, isActive: true },
    });
    if (!template) throw new NotFoundException('Plantilla no encontrada.');
    if (!template.isActive) {
      throw new BadRequestException(
        `La plantilla «${template.name ?? template.title ?? 'sin nombre'}» está archivada. Elige otra.`,
      );
    }
  }

  private assertEvery(every: number, unit: PlanUnit) {
    if (every > EVERY_MAX[unit]) {
      throw new BadRequestException(
        `Como mucho cada ${EVERY_MAX[unit]} ${unit === 'WEEK' ? 'semanas' : 'meses'}.`,
      );
    }
  }

  private parseStart(value: string): Date {
    const date = parseDay(value);
    if (!date) throw new BadRequestException('La fecha de la primera ronda no es válida.');
    return date;
  }

  // ---------------------------------------------------------------
  // Leer
  // ---------------------------------------------------------------

  private serializePlan(plan: PlanRow, assetCounts: Map<string, number>) {
    return {
      id: plan.id,
      name: plan.name,
      category: plan.category,
      assetCount: assetCounts.get(categoryKey(plan.category)) ?? 0,
      templateId: plan.templateId,
      templateName: plan.template.name ?? plan.template.title ?? 'Plantilla',
      templateActive: plan.template.isActive,
      every: plan.every,
      unit: plan.unit,
      frequency: describeFrequency(plan.every, plan.unit),
      startsOn: formatDay(plan.startsOn),
      nextDueOn: formatDay(plan.nextDueAt),
      leadDays: plan.leadDays,
      // Día en que se creará sola la próxima ronda.
      createsOn: formatDay(addDays(plan.nextDueAt, -plan.leadDays)),
      technician: plan.assignedTechnician
        ? { id: plan.assignedTechnician.id, name: plan.assignedTechnician.name }
        : null,
      technicians: planTeam(plan),
      isActive: plan.isActive,
      lastError: plan.lastError,
      lastErrorAt: plan.lastErrorAt,
    };
  }

  // Tipos de equipo del sitio y cuántos hay de cada uno ("Fancoil": 165).
  private async assetCategories(companyId: string, siteId: string) {
    const groups = await this.prisma.asset.groupBy({
      by: ['category'],
      where: { companyId, siteId, status: { in: [...ACTIVE_ASSET_STATUSES] } },
      _count: { _all: true },
    });

    const merged = new Map<string, { category: string; count: number; best: number }>();
    for (const group of groups) {
      const category = group.category?.trim();
      if (!category) continue;
      const key = categoryKey(category);
      const n = group._count._all;
      const current = merged.get(key);
      if (!current) merged.set(key, { category, count: n, best: n });
      else {
        current.count += n;
        // Se enseña la forma de escribirlo que más se usa.
        if (n > current.best) {
          current.category = category;
          current.best = n;
        }
      }
    }

    const counts = new Map<string, number>();
    for (const [key, value] of merged) counts.set(key, value.count);

    return {
      counts,
      list: [...merged.values()]
        .map(({ category, count }) => ({ category, count }))
        .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'es')),
    };
  }

  /**
   * Todo lo que necesita la pantalla del plan preventivo de un sitio. Antes
   * crea las rondas que ya tocan, por si el programador no ha pasado aún.
   */
  async overview(companyId: string, siteId: string, viewer: { userId: string; role: string }) {
    const site = await this.findSite(companyId, siteId);
    await this.materializeDue({ companyId, siteId });

    const [plans, categories, rounds] = await Promise.all([
      this.prisma.maintenancePlan.findMany({
        where: { companyId, siteId },
        orderBy: [{ isActive: 'desc' }, { nextDueAt: 'asc' }, { createdAt: 'asc' }],
        include: PLAN_INCLUDE,
      }),
      this.assetCategories(companyId, siteId),
      this.rounds.list(companyId, { siteId }, viewer),
    ]);

    return {
      site: { id: site.id, name: site.name, customerName: site.customer?.name ?? null },
      plans: plans.map((plan) => this.serializePlan(plan, categories.counts)),
      categories: categories.list,
      rounds: rounds.items,
    };
  }

  private async reload(companyId: string, siteId: string, planId: string) {
    const [plan, categories] = await Promise.all([
      this.findPlan(companyId, siteId, planId),
      this.assetCategories(companyId, siteId),
    ]);
    return this.serializePlan(plan, categories.counts);
  }

  // ---------------------------------------------------------------
  // Crear, cambiar y borrar
  // ---------------------------------------------------------------

  async create(companyId: string, siteId: string, dto: CreatePlanDto, now: Date = new Date()) {
    await this.findSite(companyId, siteId);
    await this.assertTemplate(companyId, dto.templateId);
    this.assertEvery(dto.every, dto.unit);
    const team = await this.rounds.assertTeam(this.prisma, companyId, requestedTeam(dto) ?? []);

    const startsOn = this.parseStart(dto.startsOn);
    const timing: PlanTiming = { startsOn, unit: dto.unit, every: dto.every };
    const category = dto.category.trim();

    const plan = await this.prisma.maintenancePlan.create({
      data: {
        companyId,
        siteId,
        templateId: dto.templateId,
        category,
        name: dto.name ?? defaultPlanName(category, dto.every, dto.unit),
        every: dto.every,
        unit: dto.unit,
        startsOn,
        // Si la fecha de inicio ya pasó, la próxima es la primera que cae de hoy en adelante.
        nextDueAt: firstDueFrom(timing, todayInSpain(now)),
        leadDays: dto.leadDays ?? LEAD_DAYS_DEFAULT,
        assignedTechnicianId: team[0] ?? null,
      },
      select: { id: true },
    });
    if (team.length > 0) {
      await this.prisma.maintenancePlanTechnician.createMany({
        data: team.map((userId) => ({ companyId, planId: plan.id, userId })),
      });
    }

    // Si la primera ronda ya toca, se crea ahora mismo.
    await this.materializePlan(plan.id, now);
    return this.reload(companyId, siteId, plan.id);
  }

  async update(
    companyId: string,
    siteId: string,
    planId: string,
    dto: UpdatePlanDto,
    now: Date = new Date(),
  ) {
    const current = await this.findPlan(companyId, siteId, planId);

    if (dto.templateId && dto.templateId !== current.templateId) {
      await this.assertTemplate(companyId, dto.templateId);
    }
    const requested = requestedTeam(dto);
    const team =
      requested === undefined
        ? undefined
        : await this.rounds.assertTeam(this.prisma, companyId, requested);

    const unit = dto.unit ?? current.unit;
    const every = dto.every ?? current.every;
    this.assertEvery(every, unit);
    const startsOn = dto.startsOn ? this.parseStart(dto.startsOn) : current.startsOn;

    const timingChanged =
      unit !== current.unit ||
      every !== current.every ||
      startsOn.getTime() !== current.startsOn.getTime();
    const resumed = dto.isActive === true && !current.isActive;

    const data: Prisma.MaintenancePlanUpdateInput = {
      unit,
      every,
      startsOn,
      lastError: null,
      lastErrorAt: null,
    };
    if (dto.templateId) data.template = { connect: { id: dto.templateId } };
    if (dto.category) data.category = dto.category.trim();
    if (dto.name !== undefined) {
      data.name =
        dto.name ?? defaultPlanName(dto.category?.trim() ?? current.category, every, unit);
    }
    if (dto.leadDays !== undefined)
      data.leadDays = Math.min(Math.max(dto.leadDays, 0), LEAD_DAYS_MAX);
    if (team !== undefined) {
      data.assignedTechnician = team[0] ? { connect: { id: team[0] } } : { disconnect: true };
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // Si cambian las fechas o se reanuda, la próxima ronda se vuelve a
    // calcular: la primera de hoy en adelante que no esté ya creada.
    if (timingChanged || resumed) {
      const last = await this.prisma.maintenanceRound.findFirst({
        where: { planId: current.id },
        orderBy: { dueAt: 'desc' },
        select: { dueAt: true },
      });
      const yesterday = addDays(todayInSpain(now), -1);
      const from = last && last.dueAt > yesterday ? last.dueAt : yesterday;
      data.nextDueAt = occurrenceAfter({ startsOn, unit, every }, from);
    }

    if (team === undefined) {
      await this.prisma.maintenancePlan.update({ where: { id: current.id }, data });
    } else {
      await this.prisma.$transaction([
        this.prisma.maintenancePlan.update({ where: { id: current.id }, data }),
        this.prisma.maintenancePlanTechnician.deleteMany({ where: { planId: current.id } }),
        this.prisma.maintenancePlanTechnician.createMany({
          data: team.map((userId) => ({ companyId, planId: current.id, userId })),
        }),
      ]);
    }
    await this.materializePlan(current.id, now);
    return this.reload(companyId, siteId, current.id);
  }

  // Las rondas ya creadas se quedan; solo deja de crear rondas nuevas.
  async remove(companyId: string, siteId: string, planId: string) {
    const plan = await this.findPlan(companyId, siteId, planId);
    await this.prisma.maintenancePlan.delete({ where: { id: plan.id } });
    return { ok: true };
  }

  /** Crea ya la próxima ronda del plan, sin esperar a su fecha. */
  async runNow(companyId: string, siteId: string, planId: string, userId: string) {
    const plan = await this.findPlan(companyId, siteId, planId);
    if (!plan.isActive) {
      throw new BadRequestException('El plan está en pausa. Reanúdalo para crear rondas.');
    }

    const dueAt = plan.nextDueAt;
    const nextDueAt = occurrenceAfter(plan, dueAt);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const claim = await tx.maintenancePlan.updateMany({
            where: { id: plan.id, isActive: true, nextDueAt: dueAt },
            data: { nextDueAt, lastError: null, lastErrorAt: null },
          });
          if (claim.count === 0) {
            throw new ConflictException('El plan acaba de cambiar. Vuelve a intentarlo.');
          }
          return this.rounds.createRound(
            companyId,
            {
              siteId,
              templateId: plan.templateId,
              category: plan.category,
              dueAt,
              technicianIds: planTeamIds(plan),
              planId: plan.id,
            },
            userId,
            tx,
          );
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `La ronda del ${formatLongDay(dueAt)} de este plan ya está creada.`,
        );
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------
  // Crear las rondas que tocan
  // ---------------------------------------------------------------

  /**
   * Revisa los planes activos y crea las rondas que ya tocan. Lo llama el
   * programador cada hora y también la pantalla del plan al abrirse.
   * Devuelve cuántas rondas ha creado.
   */
  async materializeDue(
    scope: { companyId?: string; siteId?: string } = {},
    now: Date = new Date(),
  ): Promise<number> {
    const horizon = addDays(todayInSpain(now), LEAD_DAYS_MAX);
    const plans = await this.prisma.maintenancePlan.findMany({
      where: {
        isActive: true,
        nextDueAt: { lte: horizon },
        ...(scope.companyId ? { companyId: scope.companyId } : {}),
        ...(scope.siteId ? { siteId: scope.siteId } : {}),
      },
      orderBy: { nextDueAt: 'asc' },
      take: PLANS_PER_PASS,
      select: { id: true },
    });

    let created = 0;
    for (const plan of plans) created += await this.materializePlan(plan.id, now);
    return created;
  }

  /**
   * Crea las rondas que tocan de un plan. Nunca lanza error: si una ronda
   * no se puede crear (no hay equipos de ese tipo, la plantilla está
   * archivada…), el motivo queda guardado en el plan para enseñarlo.
   */
  async materializePlan(planId: string, now: Date = new Date()): Promise<number> {
    let created = 0;

    for (let pass = 0; pass < ROUNDS_PER_PASS; pass += 1) {
      const plan = await this.prisma.maintenancePlan.findUnique({
        where: { id: planId },
        select: {
          id: true,
          companyId: true,
          siteId: true,
          templateId: true,
          category: true,
          assignedTechnicianId: true,
          technicians: { orderBy: { createdAt: 'asc' }, select: { userId: true } },
          isActive: true,
          startsOn: true,
          unit: true,
          every: true,
          nextDueAt: true,
          leadDays: true,
        },
      });
      if (!plan || !plan.isActive) return created;

      const pick = pickDue(plan, now);
      if (!pick) return created;

      try {
        const done = await this.prisma.$transaction(
          async (tx) => {
            // Se reserva la ronda moviendo la fecha del plan: si otra
            // petición lo hace a la vez, solo una de las dos la crea.
            const claim = await tx.maintenancePlan.updateMany({
              where: { id: plan.id, isActive: true, nextDueAt: plan.nextDueAt },
              data: { nextDueAt: pick.nextDueAt, lastError: null, lastErrorAt: null },
            });
            if (claim.count === 0) return false;

            await this.rounds.createRound(
              plan.companyId,
              {
                siteId: plan.siteId,
                templateId: plan.templateId,
                category: plan.category,
                dueAt: pick.dueAt,
                technicianIds: planTeamIds(plan),
                planId: plan.id,
              },
              null,
              tx,
            );
            return true;
          },
          { timeout: 60_000, maxWait: 10_000 },
        );
        if (!done) return created;
        created += 1;
      } catch (error) {
        if (isUniqueViolation(error)) {
          // La ronda de esa fecha ya existía: solo se avanza el plan.
          await this.prisma.maintenancePlan.updateMany({
            where: { id: plan.id, nextDueAt: plan.nextDueAt },
            data: { nextDueAt: pick.nextDueAt },
          });
          continue;
        }

        const reason =
          error instanceof HttpException ? error.message : 'No se pudo crear la ronda.';
        if (!(error instanceof HttpException)) {
          this.logger.error(
            `Plan ${plan.id}: no se pudo crear la ronda del ${formatDay(pick.dueAt)}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
        await this.prisma.maintenancePlan
          .update({
            where: { id: plan.id },
            data: {
              lastError: `Ronda del ${formatLongDay(pick.dueAt)}: ${reason}`,
              lastErrorAt: now,
            },
          })
          .catch(() => undefined);
        return created;
      }
    }

    return created;
  }
}