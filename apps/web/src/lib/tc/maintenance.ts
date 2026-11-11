import { isRecord } from '@/lib/tc/api';
import {
  FREQUENCY_PRESETS,
  EVERY_MAX,
  parseDay,
  type PlanUnit,
} from '@/lib/tc/rounds';
import {
  ITEM_TYPES,
  OPTION_PRESETS,
  newKey,
  parseOptions,
  type ItemOption,
  type ItemType,
} from '@/lib/tc/templates';

/**
 * Asistente de mantenimiento: lo que manda la API, el borrador que va
 * rellenando la oficina paso a paso y cómo se convierte en la petición.
 */

// Límites (los mismos que la API).
export const LEVEL_MIN = -10;
export const LEVEL_MAX = 200;
export const FLOORS_MAX = 100;
export const ROOMS_PER_FLOOR_MAX = 99;
export const MACHINES_PER_ROOM_MAX = 4;
export const MACHINES_PER_ZONE_MAX = 50;
export const ZONE_NAME_MAX = 60;
export const SHEET_NAME_MAX = 120;
export const POINT_LABEL_MAX = 200;
export const ROOF_ZONE = 'Cubierta';

// ---------------------------------------------------------------
// Lo que manda la API
// ---------------------------------------------------------------

export type Placement = 'ROOMS' | 'ZONES';

export type SheetItem = {
  key: string;
  section: string | null;
  label: string;
  type: ItemType;
  required: boolean;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  helpText: string | null;
  options: ItemOption[] | null;
  // Si entra en la hoja (el usuario puede quitar puntos).
  keep: boolean;
};

export type CatalogMachine = {
  key: string;
  category: string;
  label: string;
  hint: string;
  placement: Placement;
  defaultZone: string | null;
  template: { name: string; description: string; items: SheetItem[] } | null;
};

export type ZonePreset = { name: string; level: number | 'ROOF' };

export type ContextFloor = {
  level: number;
  name: string;
  rooms: number;
  roomNames: string[];
  zones: string[];
};

export type SiteMachine = {
  category: string;
  inRooms: number;
  inZones: number;
  elsewhere: number;
  total: number;
};

export type SitePlan = {
  id: string;
  category: string;
  name: string;
  frequency: string;
  isActive: boolean;
  nextDueOn: string;
  templateName: string;
};

export type CompanyTemplate = {
  id: string;
  name: string;
  category: string | null;
  items: {
    section: string | null;
    label: string;
    type: ItemType;
    required: boolean;
    unit: string | null;
  }[];
};

export type TeamMember = { userId: string; name: string; role: string };

export type SetupContext = {
  site: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    customer: { id: string; name: string } | null;
  };
  today: string;
  building: { floors: ContextFloor[]; rooms: number; zones: number };
  machines: SiteMachine[];
  plans: SitePlan[];
  templates: CompanyTemplate[];
  team: TeamMember[];
  catalog: CatalogMachine[];
  zonePresets: ZonePreset[];
};

export type MaintenanceRow = {
  site: { id: string; name: string; city: string | null };
  customer: { id: string; name: string } | null;
  rooms: number;
  machines: number;
  plans: {
    id: string;
    category: string;
    name: string;
    frequency: string;
    isActive: boolean;
    nextDueOn: string;
    lastError: string | null;
  }[];
  rounds: { open: number; inProgress: number; submitted: number };
  nextDueOn: string | null;
};

export type SetupResult = {
  dryRun: boolean;
  site: { id: string; name: string };
  building: {
    floorsAdded: number;
    roomsAdded: number;
    zonesAdded: number;
    floors: number;
    rooms: number;
    zones: number;
  };
  machinesAdded: number;
  machines: { category: string; existing: number; adding: number }[];
  plans: {
    id: string | null;
    category: string;
    name: string;
    frequency: string;
    startsOn: string;
    template: { id: string | null; name: string; isNew: boolean };
    technicians: { id: string; name: string }[];
    roundsCreated: number;
    nextDueOn: string | null;
    lastError: string | null;
  }[];
};

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function itemType(value: unknown): ItemType {
  return (ITEM_TYPES as readonly unknown[]).includes(value)
    ? (value as ItemType)
    : 'CHECKLIST';
}

function parseRef(value: unknown): { id: string; name: string } | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  return id ? { id, name: str(value.name) ?? '' } : null;
}

function parseSheetItem(value: unknown): SheetItem | null {
  if (!isRecord(value)) return null;
  const label = str(value.label);
  if (!label) return null;
  const options = parseOptions(value.options);
  return {
    key: newKey('point'),
    section: str(value.section),
    label,
    type: itemType(value.type),
    required: value.required === true,
    unit: str(value.unit),
    minValue: numOrNull(value.minValue),
    maxValue: numOrNull(value.maxValue),
    helpText: str(value.helpText),
    options: options.length > 0 ? options : null,
    keep: true,
  };
}

function parseCatalogMachine(value: unknown): CatalogMachine | null {
  if (!isRecord(value)) return null;
  const key = str(value.key);
  const category = str(value.category);
  if (!key || !category) return null;
  const template = isRecord(value.template)
    ? {
        name:
          str(value.template.name) ??
          `Mantenimiento de ${category.toLowerCase()}`,
        description: str(value.template.description) ?? '',
        items: list(value.template.items)
          .map(parseSheetItem)
          .filter((i): i is SheetItem => i !== null),
      }
    : null;
  return {
    key,
    category,
    label: str(value.label) ?? category,
    hint: str(value.hint) ?? '',
    placement: value.placement === 'ZONES' ? 'ZONES' : 'ROOMS',
    defaultZone: str(value.defaultZone),
    template,
  };
}

export function parseSetupContext(value: unknown): SetupContext | null {
  if (!isRecord(value) || !isRecord(value.site)) return null;
  const siteId = str(value.site.id);
  if (!siteId) return null;
  const building = isRecord(value.building) ? value.building : {};

  return {
    site: {
      id: siteId,
      name: str(value.site.name) ?? 'Hotel',
      address: str(value.site.address),
      city: str(value.site.city),
      customer: parseRef(value.site.customer),
    },
    today: str(value.today) ?? new Date().toISOString().slice(0, 10),
    building: {
      floors: list(building.floors)
        .filter(isRecord)
        .map((f) => ({
          level: num(f.level),
          name: str(f.name) ?? '',
          rooms: num(f.rooms),
          roomNames: list(f.roomNames).filter(
            (n): n is string => typeof n === 'string',
          ),
          zones: list(f.zones).filter(
            (n): n is string => typeof n === 'string',
          ),
        })),
      rooms: num(building.rooms),
      zones: num(building.zones),
    },
    machines: list(value.machines)
      .filter(isRecord)
      .map((m) => ({
        category: str(m.category) ?? '',
        inRooms: num(m.inRooms),
        inZones: num(m.inZones),
        elsewhere: num(m.elsewhere),
        total: num(m.total),
      }))
      .filter((m) => m.category),
    plans: list(value.plans)
      .filter(isRecord)
      .map((p) => ({
        id: str(p.id) ?? '',
        category: str(p.category) ?? '',
        name: str(p.name) ?? '',
        frequency: str(p.frequency) ?? '',
        isActive: p.isActive !== false,
        nextDueOn: str(p.nextDueOn) ?? '',
        templateName: str(p.templateName) ?? '',
      }))
      .filter((p) => p.id),
    templates: list(value.templates)
      .filter(isRecord)
      .map((t) => ({
        id: str(t.id) ?? '',
        name: str(t.name) ?? 'Plantilla',
        category: str(t.category),
        items: list(t.items)
          .filter(isRecord)
          .map((i) => ({
            section: str(i.section),
            label: str(i.label) ?? '',
            type: itemType(i.type),
            required: i.required === true,
            unit: str(i.unit),
          })),
      }))
      .filter((t) => t.id),
    team: list(value.team)
      .filter(isRecord)
      .map((m) => ({
        userId: str(m.userId) ?? '',
        name: str(m.name) ?? '',
        role: str(m.role) ?? '',
      }))
      .filter((m) => m.userId && m.name),
    catalog: list(value.catalog)
      .map(parseCatalogMachine)
      .filter((m): m is CatalogMachine => m !== null),
    zonePresets: list(value.zonePresets)
      .filter(isRecord)
      .map((z) => ({
        name: str(z.name) ?? '',
        level: z.level === 'ROOF' ? ('ROOF' as const) : num(z.level),
      }))
      .filter((z) => z.name),
  };
}

export function parseMaintenanceList(value: unknown): MaintenanceRow[] {
  const items = isRecord(value) ? list(value.items) : [];
  return items
    .filter(isRecord)
    .map((row) => {
      const site = parseRef(row.site);
      if (!site) return null;
      const rounds = isRecord(row.rounds) ? row.rounds : {};
      return {
        site: {
          id: site.id,
          name: site.name,
          city: isRecord(row.site) ? str(row.site.city) : null,
        },
        customer: parseRef(row.customer),
        rooms: num(row.rooms),
        machines: num(row.machines),
        plans: list(row.plans)
          .filter(isRecord)
          .map((p) => ({
            id: str(p.id) ?? '',
            category: str(p.category) ?? '',
            name: str(p.name) ?? '',
            frequency: str(p.frequency) ?? '',
            isActive: p.isActive !== false,
            nextDueOn: str(p.nextDueOn) ?? '',
            lastError: str(p.lastError),
          })),
        rounds: {
          open: num(rounds.open),
          inProgress: num(rounds.inProgress),
          submitted: num(rounds.submitted),
        },
        nextDueOn: str(row.nextDueOn),
      };
    })
    .filter((row): row is MaintenanceRow => row !== null);
}

export function parseSetupResult(value: unknown): SetupResult | null {
  if (!isRecord(value) || !isRecord(value.site) || !isRecord(value.building))
    return null;
  const site = parseRef(value.site);
  if (!site) return null;
  const b = value.building;

  return {
    dryRun: value.dryRun === true,
    site,
    building: {
      floorsAdded: num(b.floorsAdded),
      roomsAdded: num(b.roomsAdded),
      zonesAdded: num(b.zonesAdded),
      floors: num(b.floors),
      rooms: num(b.rooms),
      zones: num(b.zones),
    },
    machinesAdded: num(value.machinesAdded),
    machines: list(value.machines)
      .filter(isRecord)
      .map((m) => ({
        category: str(m.category) ?? '',
        existing: num(m.existing),
        adding: num(m.adding),
      })),
    plans: list(value.plans)
      .filter(isRecord)
      .map((p) => {
        const template = isRecord(p.template) ? p.template : {};
        return {
          id: str(p.id),
          category: str(p.category) ?? '',
          name: str(p.name) ?? '',
          frequency: str(p.frequency) ?? '',
          startsOn: str(p.startsOn) ?? '',
          template: {
            id: str(template.id),
            name: str(template.name) ?? '',
            isNew: template.isNew === true,
          },
          technicians: list(p.technicians)
            .map(parseRef)
            .filter((t): t is { id: string; name: string } => t !== null),
          roundsCreated: num(p.roundsCreated),
          nextDueOn: str(p.nextDueOn),
          lastError: str(p.lastError),
        };
      }),
  };
}

// ---------------------------------------------------------------
// Borrador del asistente
// ---------------------------------------------------------------

/** Para comparar nombres y tipos sin mayúsculas ni espacios de más. */
export function keyOf(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

export function zoneKey(level: number, name: string): string {
  return `${level}|${keyOf(name)}`;
}

export function defaultFloorName(level: number): string {
  if (level === 0) return 'Planta baja';
  if (level < 0) return `Sótano ${level}`;
  return `Planta ${level}`;
}

// Planta 1, habitación 4 → "104".
export function roomNumber(level: number, position: number): string {
  return `${level}${String(position).padStart(2, '0')}`;
}

function toInt(text: string): number | null {
  const n = Number(text.trim());
  return text.trim() !== '' && Number.isInteger(n) ? n : null;
}

export type BuildingDraft = {
  add: boolean;
  fromLevel: string;
  toLevel: string;
  roomsPerFloor: string;
  firstNumber: string;
  // Plantas con otro número de habitaciones.
  perFloor: Record<number, string>;
};

// Una zona común nueva. La de la cubierta ("roof") sube o baja de planta
// si cambia la última planta del hotel.
export type ZoneChoice = {
  id: string;
  name: string;
  level: number;
  floorName: string | null;
  roof: boolean;
};

// Una zona del hotel ya colocada en su planta.
export type HotelZone = {
  id: string;
  name: string;
  level: number;
  floorName: string;
  existing: boolean;
};

export type MachineDraft = {
  selected: boolean;
  perRoom: number;
  brand: string;
  model: string;
  // Cuántas en cada zona (clave: id de la zona).
  zones: Record<string, number>;
};

export type SheetChoice =
  | { kind: 'existing'; templateId: string }
  | { kind: 'new' };

export type PlanDraft = {
  category: string;
  include: boolean;
  sheet: SheetChoice;
  newSheet: { name: string; items: SheetItem[] };
  frequency: string;
  every: string;
  unit: PlanUnit;
  startsOn: string;
  technicianIds: string[];
};

export type WizardDraft = {
  building: BuildingDraft;
  zones: ZoneChoice[];
  machines: Record<string, MachineDraft>;
  plans: Record<string, PlanDraft>;
};

/** Plantas con habitaciones que salen del borrador, o el motivo si no cuadra. */
export function plannedFloors(draft: BuildingDraft):
  | {
      ok: true;
      floors: { level: number; rooms: number }[];
      firstNumber: number;
    }
  | { ok: false; problem: string } {
  const from = toInt(draft.fromLevel);
  const to = toInt(draft.toLevel);
  const perFloor = toInt(draft.roomsPerFloor);
  const firstNumber = toInt(draft.firstNumber) ?? 1;

  if (from === null || to === null)
    return {
      ok: false,
      problem: 'Pon la primera y la última planta con habitaciones.',
    };
  if (from < 1)
    return {
      ok: false,
      problem:
        'Las habitaciones empiezan en la planta 1. La planta baja y los sótanos van como zonas comunes.',
    };
  if (to < from)
    return {
      ok: false,
      problem: 'La última planta no puede ser menor que la primera.',
    };
  if (to > LEVEL_MAX)
    return {
      ok: false,
      problem: `La planta más alta posible es la ${LEVEL_MAX}.`,
    };
  if (to - from + 1 > FLOORS_MAX)
    return {
      ok: false,
      problem: `Como mucho ${FLOORS_MAX} plantas de una vez.`,
    };
  if (firstNumber < 1)
    return { ok: false, problem: 'La numeración empieza en 1 o más.' };

  const floors: { level: number; rooms: number }[] = [];
  for (let level = from; level <= to; level += 1) {
    const override = draft.perFloor[level];
    const rooms = override !== undefined ? toInt(override) : perFloor;
    if (rooms === null || rooms < 1 || rooms > ROOMS_PER_FLOOR_MAX) {
      return {
        ok: false,
        problem: `En la planta ${level} pon entre 1 y ${ROOMS_PER_FLOOR_MAX} habitaciones.`,
      };
    }
    if (firstNumber + rooms - 1 > ROOMS_PER_FLOOR_MAX) {
      return {
        ok: false,
        problem: `En la planta ${level} las habitaciones pasarían del ${roomNumber(level, ROOMS_PER_FLOOR_MAX)}. Empieza la numeración más abajo.`,
      };
    }
    floors.push({ level, rooms });
  }
  return { ok: true, floors, firstNumber };
}

/** La planta de la cubierta: la que ya se llame así o la de encima de la última. */
export function roofLevel(context: SetupContext, draft: BuildingDraft): number {
  const named = context.building.floors.find(
    (f) => keyOf(f.name) === keyOf(ROOF_ZONE),
  );
  if (named) return named.level;
  const planned = draft.add ? plannedFloors(draft) : null;
  const levels = [
    ...context.building.floors.map((f) => f.level),
    ...(planned?.ok ? planned.floors.map((f) => f.level) : []),
  ];
  return Math.max(0, ...levels) + 1;
}

export function presetLevel(preset: ZonePreset, roof: number): number {
  return preset.level === 'ROOF' ? roof : preset.level;
}

export function existingZoneId(level: number, name: string): string {
  return `e:${zoneKey(level, name)}`;
}

/** Nombre de una planta: la que ya existe o la que se creará. */
export function floorNameFor(
  context: SetupContext,
  level: number,
  roof: number,
): string {
  return (
    context.building.floors.find((f) => f.level === level)?.name ??
    (level === roof ? ROOF_ZONE : defaultFloorName(level))
  );
}

/**
 * Todas las zonas del hotel: las que ya tiene y las nuevas del borrador,
 * cada una en su planta (la cubierta, encima de la última).
 */
export function hotelZones(
  context: SetupContext,
  draft: WizardDraft,
): HotelZone[] {
  const roof = roofLevel(context, draft.building);
  const seen = new Set<string>();
  const out: HotelZone[] = [];
  for (const floor of context.building.floors) {
    for (const name of floor.zones) {
      seen.add(zoneKey(floor.level, name));
      out.push({
        id: existingZoneId(floor.level, name),
        name,
        level: floor.level,
        floorName: floor.name,
        existing: true,
      });
    }
  }
  for (const zone of draft.zones) {
    const level = zone.roof ? roof : zone.level;
    if (seen.has(zoneKey(level, zone.name))) continue;
    seen.add(zoneKey(level, zone.name));
    out.push({
      id: zone.id,
      name: zone.name,
      level,
      floorName: zone.roof
        ? (context.building.floors.find((f) => f.level === level)?.name ??
          ROOF_ZONE)
        : floorNameFor(context, level, roof),
      existing: false,
    });
  }
  return out.sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name, 'es'),
  );
}

/** Habitaciones que tendrá el hotel (las que ya tiene y las nuevas). */
export function roomsAfter(
  context: SetupContext,
  draft: BuildingDraft,
): number {
  const existing = new Set(
    context.building.floors.flatMap((f) => f.roomNames.map(keyOf)),
  );
  const planned = draft.add ? plannedFloors(draft) : null;
  if (planned?.ok) {
    for (const floor of planned.floors) {
      for (let i = 0; i < floor.rooms; i += 1)
        existing.add(keyOf(roomNumber(floor.level, planned.firstNumber + i)));
    }
  }
  return existing.size;
}

// Puntos de partida para una máquina que no está en el catálogo.
const TASK = OPTION_PRESETS.find((p) => p.key === 'task')!.options;
const STATE = OPTION_PRESETS.find((p) => p.key === 'state')!.options;

function point(
  section: string,
  label: string,
  type: ItemType,
  extra: Partial<SheetItem> = {},
): SheetItem {
  return {
    key: newKey('point'),
    section,
    label,
    type,
    required: false,
    unit: null,
    minValue: null,
    maxValue: null,
    helpText: null,
    options: null,
    keep: true,
    ...extra,
  };
}

export function genericSheet(category: string): {
  name: string;
  items: SheetItem[];
} {
  return {
    name: `Mantenimiento de ${category.toLocaleLowerCase('es')}`,
    items: [
      point('Limpieza', 'Limpieza de filtros', 'CHOICE', {
        options: TASK,
        required: true,
      }),
      point('Limpieza', 'Limpieza general', 'CHOICE', { options: TASK }),
      point('Estado', 'Estado general', 'CHOICE', { options: STATE }),
      point('Cierre', 'Incidencias observadas', 'TEXTAREA'),
      point('Cierre', 'Foto del equipo', 'PHOTO', { required: true }),
    ],
  };
}

// Tipos de punto que se pueden añadir con un clic.
export const QUICK_POINTS: {
  key: string;
  label: string;
  type: ItemType;
  options: ItemOption[] | null;
  needsUnit?: boolean;
}[] = [
  {
    key: 'task',
    label: 'Tarea (Hecho / No se pudo)',
    type: 'CHOICE',
    options: TASK,
  },
  {
    key: 'state',
    label: 'Estado (Bien / Mal)',
    type: 'CHOICE',
    options: STATE,
  },
  {
    key: 'measure',
    label: 'Medición (con unidad)',
    type: 'NUMBER',
    options: null,
    needsUnit: true,
  },
  { key: 'yesno', label: 'Sí / No', type: 'BOOLEAN', options: null },
  { key: 'text', label: 'Texto', type: 'TEXTAREA', options: null },
  { key: 'photo', label: 'Foto', type: 'PHOTO', options: null },
];

export function newPoint(
  quickKey: string,
  label: string,
  section: string | null,
  unit: string,
): SheetItem {
  const quick = QUICK_POINTS.find((q) => q.key === quickKey) ?? QUICK_POINTS[0];
  return point(section ?? 'Otros', label.trim(), quick.type, {
    options: quick.options ? quick.options.map((o) => ({ ...o })) : null,
    unit: quick.needsUnit && unit.trim() ? unit.trim() : null,
  });
}

// Lo que se ve en cada punto: "Hecho / No se pudo", "°C", "Foto"…
export function pointKind(item: {
  type: ItemType;
  unit: string | null;
  options?: ItemOption[] | null;
}): string {
  if (item.type === 'CHOICE') {
    const labels = (item.options ?? []).map((o) => o.label);
    return labels.length > 0 ? labels.slice(0, 2).join(' / ') : 'Estado';
  }
  if (item.type === 'NUMBER')
    return item.unit ? `Medición en ${item.unit}` : 'Medición';
  if (item.type === 'CHECKLIST') return 'Correcto / Incorrecto';
  if (item.type === 'BOOLEAN') return 'Sí / No';
  if (item.type === 'PHOTO') return 'Foto';
  if (item.type === 'SIGNATURE') return 'Firma';
  if (item.type === 'DATE') return 'Fecha';
  return 'Texto';
}

/** La hoja de partida para un tipo de máquina. */
export function starterSheet(
  context: SetupContext,
  category: string,
): { name: string; items: SheetItem[] } {
  const machine = context.catalog.find(
    (m) => keyOf(m.category) === keyOf(category),
  );
  if (machine?.template && machine.template.items.length > 0) {
    return {
      name: machine.template.name,
      items: machine.template.items.map((item) => ({
        ...item,
        key: newKey('point'),
        keep: true,
      })),
    };
  }
  return genericSheet(category);
}

/** Las hojas de la empresa que encajan con un tipo de máquina. */
export function matchingTemplates(
  context: SetupContext,
  category: string,
): CompanyTemplate[] {
  return context.templates.filter(
    (t) => t.category && keyOf(t.category) === keyOf(category),
  );
}

export function frequencyKey(every: string, unit: PlanUnit): string {
  const n = toInt(every);
  return (
    FREQUENCY_PRESETS.find((p) => p.every === n && p.unit === unit)?.key ??
    'CUSTOM'
  );
}

/**
 * Un plan nuevo con lo normal: la hoja de la empresa si ya tiene una para
 * ese tipo, cada 3 meses, desde hoy. Quien trabaja solo va asignado.
 */
export function newPlanDraft(
  context: SetupContext,
  category: string,
): PlanDraft {
  const own = matchingTemplates(context, category)[0];
  return {
    category,
    include: true,
    sheet: own ? { kind: 'existing', templateId: own.id } : { kind: 'new' },
    newSheet: starterSheet(context, category),
    frequency: '3M',
    every: '3',
    unit: 'MONTH',
    startsOn: context.today,
    technicianIds: context.team.length === 1 ? [context.team[0].userId] : [],
  };
}

/**
 * Los tipos de máquina que pueden llevar plan: las elegidas en el paso
 * Máquinas y las que ya tiene el hotel, menos las que ya tienen plan.
 */
export function plannableCategories(
  context: SetupContext,
  draft: WizardDraft,
): string[] {
  const planned = new Set(context.plans.map((p) => keyOf(p.category)));
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (category: string) => {
    const key = keyOf(category);
    if (!key || seen.has(key) || planned.has(key)) return;
    seen.add(key);
    out.push(category);
  };
  for (const machine of context.catalog) {
    const choice = draft.machines[machine.key];
    if (choice?.selected && machineCount(context, draft, machine) > 0)
      add(machine.category);
  }
  for (const machine of context.machines) add(machine.category);
  return out;
}

/** Cuántas máquinas de un tipo del catálogo tendrá el hotel (aprox.: sin las que ya hay). */
export function machineCount(
  context: SetupContext,
  draft: WizardDraft,
  machine: CatalogMachine,
): number {
  const choice = draft.machines[machine.key];
  const existing =
    context.machines.find((m) => keyOf(m.category) === keyOf(machine.category))
      ?.total ?? 0;
  if (!choice?.selected) return existing;
  const inRooms = choice.perRoom * roomsAfter(context, draft.building);
  const inZones = Object.values(choice.zones).reduce(
    (sum, n) => sum + (n > 0 ? n : 0),
    0,
  );
  return Math.max(existing, inRooms + inZones);
}

/** Lo que falta para poder pasar de paso, o null si está bien. */
export function sheetProblem(plan: PlanDraft): string | null {
  if (!plan.include) return null;
  if (plan.sheet.kind === 'existing') return null;
  if (!plan.newSheet.name.trim())
    return `Pon un nombre a la hoja de «${plan.category}».`;
  if (!plan.newSheet.items.some((i) => i.keep))
    return `La hoja de «${plan.category}» necesita al menos un punto.`;
  return null;
}

export function planProblem(plan: PlanDraft): string | null {
  if (!plan.include) return null;
  const every = toInt(plan.every);
  if (every === null || every < 1)
    return `${plan.category}: pon cada cuántas semanas o meses.`;
  if (every > EVERY_MAX[plan.unit]) {
    return `${plan.category}: como mucho cada ${EVERY_MAX[plan.unit]} ${plan.unit === 'WEEK' ? 'semanas' : 'meses'}.`;
  }
  if (!parseDay(plan.startsOn))
    return `${plan.category}: elige la fecha de la primera ronda.`;
  return null;
}

/** La petición para la API. */
export function buildSetupBody(
  context: SetupContext,
  draft: WizardDraft,
  dryRun: boolean,
) {
  const planned = draft.building.add ? plannedFloors(draft.building) : null;
  const zones = hotelZones(context, draft);
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  const machines = context.catalog
    .filter((machine) => draft.machines[machine.key]?.selected)
    .map((machine) => {
      const choice = draft.machines[machine.key];
      const zones = Object.entries(choice.zones)
        .filter(([id, quantity]) => quantity > 0 && zoneById.has(id))
        .map(([id, quantity]) => {
          const zone = zoneById.get(id)!;
          return { name: zone.name, level: zone.level, quantity };
        });
      return {
        category: machine.category,
        perRoom: choice.perRoom,
        brand: choice.brand.trim() || null,
        model: choice.model.trim() || null,
        zones,
      };
    })
    .filter((m) => m.perRoom > 0 || m.zones.length > 0);

  const plans = plannableCategories(context, draft)
    .map((category) => draft.plans[keyOf(category)])
    .filter((plan): plan is PlanDraft => Boolean(plan?.include))
    .map((plan) => ({
      category: plan.category,
      ...(plan.sheet.kind === 'existing'
        ? { templateId: plan.sheet.templateId }
        : {
            template: {
              name: plan.newSheet.name.trim(),
              category: plan.category,
              items: plan.newSheet.items
                .filter((item) => item.keep && item.label.trim())
                .map((item) => ({
                  section: item.section,
                  label: item.label.trim(),
                  type: item.type,
                  required: item.required,
                  unit: item.unit,
                  minValue: item.minValue,
                  maxValue: item.maxValue,
                  helpText: item.helpText,
                  options: item.options,
                })),
            },
          }),
      every: toInt(plan.every) ?? 1,
      unit: plan.unit,
      startsOn: plan.startsOn,
      technicianIds: plan.technicianIds,
    }));

  return {
    dryRun,
    building: planned?.ok
      ? { firstNumber: planned.firstNumber, floors: planned.floors }
      : undefined,
    zones: zones
      .filter((z) => !z.existing)
      .map((z) => ({ name: z.name, level: z.level, floorName: z.floorName })),
    machines,
    plans,
  };
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('es-ES')} ${n === 1 ? one : many}`;
}