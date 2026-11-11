import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assetLocation, compareNames } from '../building/building-plan';
import { PlanLimitsService } from '../common/plan-limits.service';
import { PrismaService } from '../database/prisma.service';
import { MaintenanceTemplatesService } from '../maintenance-templates/maintenance-templates.service';
import { MaintenancePlansService } from '../rounds/maintenance-plans.service';
import {
  EVERY_MAX,
  ROUND_STOPS_MAX,
  defaultPlanName,
  describeFrequency,
  formatDay,
  parseDay,
  todayInSpain,
} from '../rounds/round-plan';
import { RoundsService } from '../rounds/rounds.service';
import { MaintenanceSetupDto, SetupPlanDto } from './dto/maintenance-setup.dto';
import { ZONE_PRESETS, catalogWithTemplates } from './machine-catalog';
import { keyOf, planSetup, type SetupPlan, type SiteSnapshot } from './setup-plan';

const ACTIVE_ASSET_STATUSES = ['ACTIVE', 'MAINTENANCE'] as const;
const PENDING_ROUND_STATUSES = ['OPEN', 'IN_PROGRESS', 'SUBMITTED'] as const;

type Site = { id: string; name: string; customerId: string };

// Un plan del asistente ya comprobado y listo para guardar.
type CheckedPlan = {
  input: SetupPlanDto;
  category: string;
  templateId: string | null;
  templateName: string;
  team: string[];
};

function isActiveStatus(status: string): boolean {
  return (ACTIVE_ASSET_STATUSES as readonly string[]).includes(status);
}

/**
 * Asistente de mantenimiento: deja un hotel listo para sus preventivos en
 * un solo paso (plantas, habitaciones, zonas comunes, máquinas, hojas de
 * revisión y planes con sus técnicos). Solo para la oficina.
 */
@Injectable()
export class MaintenanceSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
    private readonly templates: MaintenanceTemplatesService,
    private readonly plans: MaintenancePlansService,
    private readonly rounds: RoundsService,
  ) {}

  // ---------------------------------------------------------------
  // Lista de hoteles y su mantenimiento
  // ---------------------------------------------------------------

  async list(companyId: string) {
    const [sites, rooms, machines, plans, rounds] = await Promise.all([
      this.prisma.site.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          city: true,
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.space.groupBy({
        by: ['siteId'],
        where: { companyId, kind: 'ROOM' },
        _count: { _all: true },
      }),
      this.prisma.asset.groupBy({
        by: ['siteId'],
        where: { companyId, siteId: { not: null }, status: { in: [...ACTIVE_ASSET_STATUSES] } },
        _count: { _all: true },
      }),
      this.prisma.maintenancePlan.findMany({
        where: { companyId },
        orderBy: [{ nextDueAt: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          siteId: true,
          category: true,
          name: true,
          every: true,
          unit: true,
          isActive: true,
          nextDueAt: true,
          lastError: true,
        },
      }),
      this.prisma.maintenanceRound.groupBy({
        by: ['siteId', 'status'],
        where: { companyId, status: { in: [...PENDING_ROUND_STATUSES] } },
        _count: { _all: true },
      }),
    ]);

    const roomCount = new Map(rooms.map((r) => [r.siteId, r._count._all]));
    const machineCount = new Map(machines.map((m) => [m.siteId, m._count._all]));

    const items = sites.map((site) => {
      const sitePlans = plans.filter((p) => p.siteId === site.id);
      const siteRounds = rounds.filter((r) => r.siteId === site.id);
      const roundsIn = (status: string) =>
        siteRounds.find((r) => r.status === status)?._count._all ?? 0;
      const next = sitePlans.find((p) => p.isActive);

      return {
        site: { id: site.id, name: site.name, city: site.city },
        customer: site.customer,
        rooms: roomCount.get(site.id) ?? 0,
        machines: machineCount.get(site.id) ?? 0,
        plans: sitePlans.map((p) => ({
          id: p.id,
          category: p.category,
          name: p.name,
          frequency: describeFrequency(p.every, p.unit),
          isActive: p.isActive,
          nextDueOn: formatDay(p.nextDueAt),
          lastError: p.lastError,
        })),
        rounds: {
          open: roundsIn('OPEN'),
          inProgress: roundsIn('IN_PROGRESS'),
          submitted: roundsIn('SUBMITTED'),
        },
        nextDueOn: next ? formatDay(next.nextDueAt) : null,
      };
    });

    // Primero los hoteles con mantenimiento, por la próxima ronda.
    items.sort((a, b) => {
      if (a.plans.length > 0 !== b.plans.length > 0) return a.plans.length > 0 ? -1 : 1;
      if (a.nextDueOn && b.nextDueOn && a.nextDueOn !== b.nextDueOn) {
        return a.nextDueOn < b.nextDueOn ? -1 : 1;
      }
      if (Boolean(a.nextDueOn) !== Boolean(b.nextDueOn)) return a.nextDueOn ? -1 : 1;
      return compareNames(a.site.name, b.site.name);
    });

    return { items };
  }

  // ---------------------------------------------------------------
  // Lo que necesita el asistente para un hotel
  // ---------------------------------------------------------------

  async context(companyId: string, siteId: string, now: Date = new Date()) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        customer: { select: { id: true, name: true } },
      },
    });
    if (!site) throw new NotFoundException('Hotel no encontrado.');

    const [floors, assets, plans, templates, members] = await Promise.all([
      this.prisma.floor.findMany({
        where: { companyId, siteId },
        orderBy: { level: 'asc' },
        select: { level: true, name: true, spaces: { select: { kind: true, name: true } } },
      }),
      this.prisma.asset.findMany({
        where: { companyId, siteId, status: { in: [...ACTIVE_ASSET_STATUSES] } },
        select: { category: true, space: { select: { kind: true } } },
      }),
      this.prisma.maintenancePlan.findMany({
        where: { companyId, siteId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          category: true,
          name: true,
          every: true,
          unit: true,
          isActive: true,
          nextDueAt: true,
          template: { select: { name: true, title: true } },
        },
      }),
      this.prisma.maintenanceTemplate.findMany({
        where: { companyId, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          title: true,
          category: true,
          items: {
            orderBy: [{ sortOrder: 'asc' }, { itemOrder: 'asc' }],
            select: { section: true, label: true, type: true, required: true, unit: true },
          },
        },
      }),
      this.prisma.userCompany.findMany({
        where: { companyId, active: true, user: { isActive: true } },
        select: { role: true, user: { select: { id: true, name: true } } },
      }),
    ]);

    let rooms = 0;
    let zones = 0;
    const buildingFloors = floors.map((floor) => {
      const floorRooms = floor.spaces.filter((s) => s.kind === 'ROOM');
      const floorZones = floor.spaces
        .filter((s) => s.kind === 'COMMON')
        .map((s) => s.name)
        .sort(compareNames);
      rooms += floorRooms.length;
      zones += floorZones.length;
      return {
        level: floor.level,
        name: floor.name,
        rooms: floorRooms.length,
        roomNames: floorRooms.map((s) => s.name).sort(compareNames),
        zones: floorZones,
      };
    });

    // Máquinas del hotel por tipo (sin distinguir mayúsculas).
    const byCategory = new Map<
      string,
      { category: string; inRooms: number; inZones: number; elsewhere: number }
    >();
    for (const asset of assets) {
      const category = asset.category?.trim();
      if (!category) continue;
      const key = keyOf(category);
      const row = byCategory.get(key) ?? { category, inRooms: 0, inZones: 0, elsewhere: 0 };
      if (asset.space?.kind === 'ROOM') row.inRooms += 1;
      else if (asset.space?.kind === 'COMMON') row.inZones += 1;
      else row.elsewhere += 1;
      byCategory.set(key, row);
    }

    return {
      site: {
        id: site.id,
        name: site.name,
        address: site.address,
        city: site.city,
        customer: site.customer,
      },
      today: formatDay(todayInSpain(now)),
      building: { floors: buildingFloors, rooms, zones },
      machines: [...byCategory.values()]
        .map((row) => ({ ...row, total: row.inRooms + row.inZones + row.elsewhere }))
        .sort((a, b) => b.total - a.total || compareNames(a.category, b.category)),
      plans: plans.map((plan) => ({
        id: plan.id,
        category: plan.category,
        name: plan.name,
        frequency: describeFrequency(plan.every, plan.unit),
        isActive: plan.isActive,
        nextDueOn: formatDay(plan.nextDueAt),
        templateName: plan.template.name ?? plan.template.title ?? 'Plantilla',
      })),
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name ?? template.title ?? 'Plantilla',
        category: template.category,
        items: template.items.map((item) => ({
          section: item.section,
          label: item.label ?? '',
          type: item.type,
          required: item.required,
          unit: item.unit,
        })),
      })),
      team: members
        .map((m) => ({ userId: m.user.id, name: m.user.name, role: m.role }))
        .sort((a, b) => compareNames(a.name, b.name)),
      catalog: catalogWithTemplates(),
      zonePresets: ZONE_PRESETS,
    };
  }

  // ---------------------------------------------------------------
  // Preparar el mantenimiento
  // ---------------------------------------------------------------

  /**
   * Deja el hotel como pide el asistente. Con dryRun solo dice lo que
   * haría. Todo se guarda a la vez: si algo falla, no se guarda nada.
   */
  async setup(companyId: string, siteId: string, dto: MaintenanceSetupDto, now: Date = new Date()) {
    const site = await this.findSite(companyId, siteId);
    const snapshot = await this.snapshot(companyId, siteId);

    const result = planSetup(dto, snapshot);
    if (!result.ok) throw new BadRequestException(result.problem);
    const plan = result.plan;

    const checked = await this.checkPlans(companyId, site, dto.plans ?? [], snapshot, plan);
    await this.planLimits.assertAssetCapacity(companyId, plan.assets.length);

    const teamNames = await this.teamNames(checked.flatMap((p) => p.team));

    if (dto.dryRun) {
      return this.summary(site, plan, checked, teamNames, true, new Map());
    }

    const created = await this.prisma.$transaction(
      async (tx) => {
        await this.writeBuilding(tx, companyId, site, plan);

        // Otra petición puede haber creado un plan mientras tanto.
        const taken = await tx.maintenancePlan.findMany({
          where: { companyId, siteId },
          select: { category: true },
        });
        const takenKeys = new Set(taken.map((p) => keyOf(p.category)));

        const ids = new Map<CheckedPlan, string>();
        for (const item of checked) {
          if (takenKeys.has(keyOf(item.category))) {
            throw this.planExists(site, item.category);
          }
          const templateId = item.templateId ?? (await this.createTemplate(tx, companyId, item));
          const planId = await this.plans.insertPlan(
            tx,
            companyId,
            siteId,
            {
              templateId,
              category: item.category,
              every: item.input.every,
              unit: item.input.unit,
              startsOn: item.input.startsOn,
              leadDays: item.input.leadDays,
              technicianIds: item.team,
            },
            now,
          );
          ids.set(item, planId);
        }
        return ids;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

    // Las rondas que ya tocan se crean ahora, con todo guardado.
    for (const planId of created.values()) await this.plans.materializePlan(planId, now);

    return this.summary(site, plan, checked, teamNames, false, created);
  }

  // ---------------------------------------------------------------

  private async findSite(companyId: string, siteId: string): Promise<Site> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true, name: true, customerId: true },
    });
    if (!site) throw new NotFoundException('Hotel no encontrado.');
    return site;
  }

  private async snapshot(companyId: string, siteId: string): Promise<SiteSnapshot> {
    const [floors, spaces, assets] = await Promise.all([
      this.prisma.floor.findMany({
        where: { companyId, siteId },
        select: { level: true, name: true },
      }),
      this.prisma.space.findMany({
        where: { companyId, siteId },
        select: { kind: true, name: true, floor: { select: { level: true } } },
      }),
      this.prisma.asset.findMany({
        where: { companyId, siteId },
        select: {
          name: true,
          category: true,
          status: true,
          space: { select: { name: true, floor: { select: { level: true } } } },
        },
      }),
    ]);

    return {
      floors,
      spaces: spaces.map((s) => ({ level: s.floor.level, kind: s.kind, name: s.name })),
      assets: assets.map((a) => ({
        place: a.space ? { level: a.space.floor.level, name: a.space.name } : null,
        name: a.name,
        category: a.category,
        active: isActiveStatus(a.status),
      })),
    };
  }

  /** Comprueba cada plan antes de guardar nada. */
  private async checkPlans(
    companyId: string,
    site: Site,
    plans: SetupPlanDto[],
    snapshot: SiteSnapshot,
    plan: SetupPlan,
  ): Promise<CheckedPlan[]> {
    if (plans.length === 0) return [];

    const existing = await this.prisma.maintenancePlan.findMany({
      where: { companyId, siteId: site.id },
      select: { category: true },
    });
    const planned = new Set(existing.map((p) => keyOf(p.category)));

    // Máquinas de cada tipo que tendrá el hotel.
    const machines = new Map<string, number>();
    const count = (category: string | null) => {
      if (!category?.trim()) return;
      const key = keyOf(category);
      machines.set(key, (machines.get(key) ?? 0) + 1);
    };
    for (const asset of snapshot.assets) if (asset.active) count(asset.category);
    for (const asset of plan.assets) count(asset.category);

    const seen = new Set<string>();
    const checked: CheckedPlan[] = [];

    for (const input of plans) {
      const category = input.category.trim().replace(/\s+/g, ' ');
      const key = keyOf(category);

      if (seen.has(key)) {
        throw new BadRequestException(`«${category}» tiene dos planes. Deja solo uno.`);
      }
      seen.add(key);
      if (planned.has(key)) throw this.planExists(site, category);

      const total = machines.get(key) ?? 0;
      if (total === 0) {
        throw new BadRequestException(
          `En ${site.name} no hay máquinas de tipo «${category}». Añádelas en el paso Máquinas.`,
        );
      }
      if (total > ROUND_STOPS_MAX) {
        throw new BadRequestException(
          `Una ronda puede tener como mucho ${ROUND_STOPS_MAX} máquinas y en ${site.name} habría ${total} de tipo «${category}».`,
        );
      }
      if (input.every > EVERY_MAX[input.unit]) {
        throw new BadRequestException(
          `${category}: como mucho cada ${EVERY_MAX[input.unit]} ${input.unit === 'WEEK' ? 'semanas' : 'meses'}.`,
        );
      }
      if (!parseDay(input.startsOn)) {
        throw new BadRequestException(`${category}: la fecha de la primera ronda no es válida.`);
      }

      let templateId: string | null = null;
      let templateName: string;
      if (input.templateId) {
        const template = await this.prisma.maintenanceTemplate.findFirst({
          where: { id: input.templateId, companyId },
          select: { id: true, name: true, title: true, isActive: true },
        });
        if (!template) {
          throw new NotFoundException(`La hoja elegida para «${category}» no existe.`);
        }
        templateName = template.name ?? template.title ?? 'Plantilla';
        if (!template.isActive) {
          throw new BadRequestException(
            `La hoja «${templateName}» está archivada. Elige otra para «${category}».`,
          );
        }
        templateId = template.id;
      } else if (input.template) {
        try {
          this.templates.checkItems(input.template.items);
        } catch (error) {
          if (error instanceof HttpException) {
            throw new BadRequestException(`Hoja de «${category}»: ${error.message}`);
          }
          throw error;
        }
        templateName = await this.templates.freeName(companyId, input.template.name);
      } else {
        throw new BadRequestException(`Elige la hoja de revisión de «${category}».`);
      }

      const team = await this.rounds.assertTeam(this.prisma, companyId, input.technicianIds ?? []);
      checked.push({ input, category, templateId, templateName, team });
    }

    return checked;
  }

  private async teamNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  private async createTemplate(
    tx: Prisma.TransactionClient,
    companyId: string,
    item: CheckedPlan,
  ): Promise<string> {
    const template = item.input.template!;
    // Dentro de la transacción, por si otra hoja con ese nombre se acaba de crear.
    const name = await this.templates.freeName(companyId, template.name, tx);
    const created = await this.templates.create(
      companyId,
      { ...template, name, category: template.category ?? item.category },
      tx,
    );
    return created.id;
  }

  /** Crea las plantas, habitaciones, zonas y máquinas que faltan. */
  private async writeBuilding(
    tx: Prisma.TransactionClient,
    companyId: string,
    site: Site,
    plan: SetupPlan,
  ): Promise<void> {
    if (plan.floors.length > 0) {
      await tx.floor.createMany({
        data: plan.floors.map((f) => ({
          companyId,
          siteId: site.id,
          level: f.level,
          name: f.name,
        })),
        skipDuplicates: true,
      });
    }
    const spacesToCreate = [
      ...plan.rooms.map((r) => ({ ...r, kind: 'ROOM' as const })),
      ...plan.zones.map((z) => ({ ...z, kind: 'COMMON' as const })),
    ];
    if (spacesToCreate.length === 0 && plan.assets.length === 0) return;

    const floors = await tx.floor.findMany({
      where: { companyId, siteId: site.id },
      select: { id: true, level: true, name: true },
    });
    const floorByLevel = new Map(floors.map((f) => [f.level, f]));
    const changed = () =>
      new ConflictException('El hotel acaba de cambiar mientras se guardaba. Vuelve a intentarlo.');

    if (spacesToCreate.length > 0) {
      await tx.space.createMany({
        data: spacesToCreate.map((s) => {
          const floor = floorByLevel.get(s.level);
          if (!floor) throw changed();
          return { companyId, siteId: site.id, floorId: floor.id, kind: s.kind, name: s.name };
        }),
        skipDuplicates: true,
      });
    }
    if (plan.assets.length === 0) return;

    const spaces = await tx.space.findMany({
      where: { companyId, siteId: site.id },
      select: { id: true, floorId: true, name: true },
    });
    const spaceId = new Map(spaces.map((s) => [`${s.floorId}|${keyOf(s.name)}`, s.id]));

    await tx.asset.createMany({
      data: plan.assets.map((asset) => {
        const floor = floorByLevel.get(asset.level);
        const id = floor ? spaceId.get(`${floor.id}|${keyOf(asset.spaceName)}`) : undefined;
        if (!floor || !id) throw changed();
        return {
          companyId,
          customerId: site.customerId,
          siteId: site.id,
          spaceId: id,
          name: asset.name,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          location: assetLocation(floor.name, asset.kind, asset.spaceName),
        };
      }),
    });
  }

  private planExists(site: Site, category: string) {
    return new ConflictException(
      `${site.name} ya tiene un plan para «${category}». Cámbialo desde su plan preventivo.`,
    );
  }

  private async summary(
    site: Site,
    plan: SetupPlan,
    checked: CheckedPlan[],
    teamNames: Map<string, string>,
    dryRun: boolean,
    created: Map<CheckedPlan, string>,
  ) {
    const ids = [...created.values()];
    const saved =
      ids.length > 0
        ? await this.prisma.maintenancePlan.findMany({
            where: { id: { in: ids } },
            select: {
              id: true,
              name: true,
              nextDueAt: true,
              lastError: true,
              templateId: true,
              _count: { select: { rounds: true } },
            },
          })
        : [];
    const savedById = new Map(saved.map((p) => [p.id, p]));

    return {
      dryRun,
      site: { id: site.id, name: site.name },
      building: {
        floorsAdded: plan.floors.length,
        roomsAdded: plan.rooms.length,
        zonesAdded: plan.zones.length,
        ...plan.totals,
      },
      machinesAdded: plan.assets.length,
      machines: plan.machines,
      plans: checked.map((item) => {
        const id = created.get(item) ?? null;
        const row = id ? savedById.get(id) : undefined;
        return {
          id,
          category: item.category,
          name: row?.name ?? defaultPlanName(item.category, item.input.every, item.input.unit),
          frequency: describeFrequency(item.input.every, item.input.unit),
          startsOn: item.input.startsOn,
          template: {
            id: row?.templateId ?? item.templateId,
            name: item.templateName,
            isNew: item.templateId === null,
          },
          technicians: item.team.map((userId) => ({
            id: userId,
            name: teamNames.get(userId) ?? 'Técnico',
          })),
          roundsCreated: row?._count.rounds ?? 0,
          nextDueOn: row ? formatDay(row.nextDueAt) : null,
          lastError: row?.lastError ?? null,
        };
      }),
    };
  }
}