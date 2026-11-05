import { isRecord } from '@/lib/tc/api';

/**
 * Planes preventivos y rondas de mantenimiento. Las fechas de los planes
 * y de las rondas son días ("2026-11-08"), sin hora: siguen las mismas
 * reglas que la API (apps/api/src/rounds/round-plan.ts).
 */

export type PlanUnit = 'WEEK' | 'MONTH';
export type RoundStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type StopStatus = 'PENDING' | 'DONE' | 'NO_ACCESS';
export type SpaceKind = 'ROOM' | 'COMMON';

export const EVERY_MAX: Record<PlanUnit, number> = { WEEK: 52, MONTH: 24 };
export const LEAD_DAYS_MAX = 60;
export const LEAD_DAYS_DEFAULT = 7;
export const PLAN_NAME_MAX = 80;
export const CATEGORY_MAX = 60;
export const CLOSE_NOTE_MAX = 1000;

export const FREQUENCY_PRESETS: {
  key: string;
  label: string;
  every: number;
  unit: PlanUnit;
}[] = [
  { key: '1M', label: 'Cada mes', every: 1, unit: 'MONTH' },
  { key: '2M', label: 'Cada 2 meses', every: 2, unit: 'MONTH' },
  { key: '3M', label: 'Cada 3 meses (trimestral)', every: 3, unit: 'MONTH' },
  { key: '4M', label: 'Cada 4 meses', every: 4, unit: 'MONTH' },
  { key: '6M', label: 'Cada 6 meses (semestral)', every: 6, unit: 'MONTH' },
  { key: '12M', label: 'Cada año', every: 12, unit: 'MONTH' },
  { key: '1W', label: 'Cada semana', every: 1, unit: 'WEEK' },
  { key: '2W', label: 'Cada 2 semanas', every: 2, unit: 'WEEK' },
];

export const ROUND_STATUS_INFO: Record<
  RoundStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: 'Sin empezar',
    className: 'border-line bg-surface-2 text-muted',
  },
  IN_PROGRESS: {
    label: 'En curso',
    className: 'border-accent/25 bg-accent-soft text-accent',
  },
  DONE: {
    label: 'Cerrada',
    className: 'border-success/30 bg-success-soft text-success',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'border-line bg-surface-2 text-subtle',
  },
};

export type StopTone = 'done' | 'issue' | 'noAccess' | 'pending';

export const STOP_TONE_INFO: Record<
  StopTone,
  { label: string; chip: string; dot: string }
> = {
  done: {
    label: 'Hecha',
    chip: 'border-success/40 bg-success-soft text-success',
    dot: 'bg-success',
  },
  issue: {
    label: 'Con incidencia',
    chip: 'border-danger/40 bg-danger-soft text-danger',
    dot: 'bg-danger',
  },
  noAccess: {
    label: 'Sin acceso',
    chip: 'border-warning/40 bg-warning-soft text-warning',
    dot: 'bg-warning',
  },
  pending: {
    label: 'Pendiente',
    chip: 'border-line bg-surface-2 text-muted',
    dot: 'bg-line-strong',
  },
};

export function stopTone(stop: {
  status: StopStatus;
  hasIssue: boolean;
}): StopTone {
  if (stop.hasIssue) return 'issue';
  if (stop.status === 'DONE') return 'done';
  if (stop.status === 'NO_ACCESS') return 'noAccess';
  return 'pending';
}

// ---------------------------------------------------------------
// Días y frecuencias
// ---------------------------------------------------------------

const DAY_MS = 86_400_000;

export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// El día que es ahora en España: "2026-11-05".
export function todayString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// "2026-11-08" → "8 nov 2026"
export function formatDay(value: string | null | undefined): string {
  const date = value ? parseDay(value) : null;
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace('.', '');
}

// Fecha y hora de algo que pasó: "8 nov 2026, 11:30"
export function formatMoment(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(date)
    .replace('.', '');
}

export function describeFrequency(every: number, unit: PlanUnit): string {
  if (unit === 'WEEK')
    return every === 1 ? 'Cada semana' : `Cada ${every} semanas`;
  return every === 1 ? 'Cada mes' : `Cada ${every} meses`;
}

export function defaultPlanName(
  category: string,
  every: number,
  unit: PlanUnit,
): string {
  const frequency = describeFrequency(every, unit);
  return `${category} · ${frequency.charAt(0).toLowerCase()}${frequency.slice(1)}`;
}

function addMonthsClamped(start: Date, months: number): Date {
  const total = start.getUTCMonth() + months;
  const year = start.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)));
}

function occurrence(
  startsOn: Date,
  unit: PlanUnit,
  every: number,
  n: number,
): Date {
  return unit === 'WEEK'
    ? new Date(startsOn.getTime() + n * every * 7 * DAY_MS)
    : addMonthsClamped(startsOn, n * every);
}

/**
 * La primera ronda que cae hoy o más tarde. Si la fecha de inicio ya
 * pasó (la última que se hizo), la siguiente se cuenta desde ella.
 */
export function nextDueFrom(
  startsOn: string,
  unit: PlanUnit,
  every: number,
  today: string = todayString(),
): string | null {
  const start = parseDay(startsOn);
  const now = parseDay(today);
  if (!start || !now || every < 1) return null;
  if (start >= now) return startsOn;

  let n = 0;
  let date = start;
  // Como mucho unos cientos de vueltas (semanal y varios años atrás).
  while (date < now && n < 5000) {
    n += 1;
    date = occurrence(start, unit, every, n);
  }
  return toDayString(date);
}

export function minusDays(day: string, days: number): string {
  const date = parseDay(day);
  return date ? toDayString(new Date(date.getTime() - days * DAY_MS)) : day;
}

// ---------------------------------------------------------------
// Lo que llega de la API
// ---------------------------------------------------------------

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

type Person = { id: string; name: string };

function parsePerson(value: unknown): Person | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  return { id, name: str(value.name) ?? 'Sin nombre' };
}

function parseUnit(value: unknown): PlanUnit {
  return value === 'WEEK' ? 'WEEK' : 'MONTH';
}

function parseRoundStatus(value: unknown): RoundStatus {
  return value === 'IN_PROGRESS' || value === 'DONE' || value === 'CANCELLED'
    ? value
    : 'OPEN';
}

function parseStopStatus(value: unknown): StopStatus {
  return value === 'DONE' || value === 'NO_ACCESS' ? value : 'PENDING';
}

export type StopCounts = {
  total: number;
  done: number;
  pending: number;
  noAccess: number;
  issues: number;
};

function parseCounts(value: unknown): StopCounts {
  const v = isRecord(value) ? value : {};
  return {
    total: num(v.total),
    done: num(v.done),
    pending: num(v.pending),
    noAccess: num(v.noAccess),
    issues: num(v.issues),
  };
}

// Equipos ya visitados (hechos) sobre el total.
export function progressPercent(counts: StopCounts): number {
  return counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
}

export type PlanView = {
  id: string;
  name: string;
  category: string;
  assetCount: number;
  templateId: string;
  templateName: string;
  templateActive: boolean;
  every: number;
  unit: PlanUnit;
  frequency: string;
  startsOn: string;
  nextDueOn: string;
  leadDays: number;
  createsOn: string;
  technician: Person | null;
  isActive: boolean;
  lastError: string | null;
};

function parsePlan(value: unknown): PlanView | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  const every = Math.max(1, num(value.every, 1));
  const unit = parseUnit(value.unit);
  return {
    id,
    name: str(value.name) ?? 'Plan sin nombre',
    category: str(value.category) ?? '',
    assetCount: num(value.assetCount),
    templateId: str(value.templateId) ?? '',
    templateName: str(value.templateName) ?? 'Plantilla',
    templateActive: value.templateActive !== false,
    every,
    unit,
    frequency: str(value.frequency) ?? describeFrequency(every, unit),
    startsOn: str(value.startsOn) ?? '',
    nextDueOn: str(value.nextDueOn) ?? '',
    leadDays: num(value.leadDays, LEAD_DAYS_DEFAULT),
    createsOn: str(value.createsOn) ?? '',
    technician: parsePerson(value.technician),
    isActive: value.isActive !== false,
    lastError: str(value.lastError),
  };
}

export type RoundRow = {
  id: string;
  status: RoundStatus;
  category: string;
  dueOn: string;
  workOrder: { id: string; code: string | null; title: string };
  plan: { id: string; name: string } | null;
  technician: Person | null;
  counts: StopCounts;
};

function parseRoundRow(value: unknown): RoundRow | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const workOrder = isRecord(value.workOrder) ? value.workOrder : null;
  if (!id || !workOrder) return null;
  const plan = isRecord(value.plan) ? value.plan : null;
  return {
    id,
    status: parseRoundStatus(value.status),
    category: str(value.category) ?? '',
    dueOn: str(value.dueOn) ?? '',
    workOrder: {
      id: str(workOrder.id) ?? '',
      code: str(workOrder.code),
      title: str(workOrder.title) ?? 'Ronda',
    },
    plan:
      plan && str(plan.id)
        ? { id: str(plan.id) ?? '', name: str(plan.name) ?? 'Plan' }
        : null,
    technician: parsePerson(value.technician),
    counts: parseCounts(value.counts),
  };
}

export type CategoryOption = { category: string; count: number };

export type PlanOverview = {
  site: { id: string; name: string; customerName: string | null };
  plans: PlanView[];
  categories: CategoryOption[];
  rounds: RoundRow[];
};

export function parsePlanOverview(value: unknown): PlanOverview | null {
  if (!isRecord(value) || !isRecord(value.site)) return null;
  const siteId = str(value.site.id);
  if (!siteId) return null;
  return {
    site: {
      id: siteId,
      name: str(value.site.name) ?? 'Sitio',
      customerName: str(value.site.customerName),
    },
    plans: Array.isArray(value.plans)
      ? value.plans.map(parsePlan).filter((p): p is PlanView => p !== null)
      : [],
    categories: Array.isArray(value.categories)
      ? value.categories
          .map((c) =>
            isRecord(c) && str(c.category)
              ? { category: str(c.category) ?? '', count: num(c.count) }
              : null,
          )
          .filter((c): c is CategoryOption => c !== null)
      : [],
    rounds: Array.isArray(value.rounds)
      ? value.rounds.map(parseRoundRow).filter((r): r is RoundRow => r !== null)
      : [],
  };
}

export type StopView = {
  id: string;
  assetId: string | null;
  assetName: string;
  floorLevel: number | null;
  spaceKind: SpaceKind | null;
  spaceName: string | null;
  label: string;
  place: string;
  status: StopStatus;
  hasIssue: boolean;
  noAccessReason: string | null;
  doneAt: string | null;
  doneBy: Person | null;
};

function parseStop(value: unknown): StopView | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  const label = str(value.label) ?? 'Sin habitación';
  return {
    id,
    assetId: str(value.assetId),
    assetName: str(value.assetName) ?? 'Equipo',
    floorLevel: numOrNull(value.floorLevel),
    spaceKind:
      value.spaceKind === 'COMMON'
        ? 'COMMON'
        : value.spaceKind === 'ROOM'
          ? 'ROOM'
          : null,
    spaceName: str(value.spaceName),
    label,
    place: str(value.place) ?? label,
    status: parseStopStatus(value.status),
    hasIssue: value.hasIssue === true,
    noAccessReason: str(value.noAccessReason),
    doneAt: str(value.doneAt),
    doneBy: parsePerson(value.doneBy),
  };
}

export type Problem = {
  label: string;
  value: string | null;
  unit: string | null;
  notes: string | null;
  failed: boolean;
};

function parseProblem(value: unknown): Problem | null {
  if (!isRecord(value)) return null;
  return {
    label: str(value.label) ?? 'Punto',
    value: str(value.value),
    unit: str(value.unit),
    notes: str(value.notes),
    failed: value.failed === true,
  };
}

export type RoundFloor = {
  level: number | null;
  name: string;
  stops: StopView[];
};

export type RoundView = {
  id: string;
  status: RoundStatus;
  category: string;
  dueOn: string;
  closedAt: string | null;
  closeNote: string | null;
  closedBy: Person | null;
  workOrder: { id: string; code: string | null; title: string };
  technician: Person | null;
  site: { id: string; name: string; customerName: string | null };
  template: { id: string; name: string } | null;
  plan: { id: string; name: string; frequency: string } | null;
  counts: StopCounts;
  floors: RoundFloor[];
  incidents: {
    stopId: string;
    place: string;
    assetName: string;
    doneAt: string | null;
    doneBy: Person | null;
    problems: Problem[];
  }[];
  noAccess: {
    stopId: string;
    place: string;
    assetName: string;
    reason: string | null;
    at: string | null;
  }[];
};

export function parseRound(value: unknown): RoundView | null {
  if (!isRecord(value) || !isRecord(value.workOrder) || !isRecord(value.site))
    return null;
  const id = str(value.id);
  if (!id) return null;

  const template = isRecord(value.template) ? value.template : null;
  const plan = isRecord(value.plan) ? value.plan : null;

  return {
    id,
    status: parseRoundStatus(value.status),
    category: str(value.category) ?? '',
    dueOn: str(value.dueOn) ?? '',
    closedAt: str(value.closedAt),
    closeNote: str(value.closeNote),
    closedBy: parsePerson(value.closedBy),
    workOrder: {
      id: str(value.workOrder.id) ?? '',
      code: str(value.workOrder.code),
      title: str(value.workOrder.title) ?? 'Ronda',
    },
    technician: parsePerson(value.technician),
    site: {
      id: str(value.site.id) ?? '',
      name: str(value.site.name) ?? 'Sitio',
      customerName: str(value.site.customerName),
    },
    template:
      template && str(template.id)
        ? {
            id: str(template.id) ?? '',
            name: str(template.name) ?? 'Plantilla',
          }
        : null,
    plan:
      plan && str(plan.id)
        ? {
            id: str(plan.id) ?? '',
            name: str(plan.name) ?? 'Plan',
            frequency: str(plan.frequency) ?? '',
          }
        : null,
    counts: parseCounts(value.counts),
    floors: Array.isArray(value.floors)
      ? value.floors
          .map((floor): RoundFloor | null =>
            isRecord(floor)
              ? {
                  level: numOrNull(floor.level),
                  name: str(floor.name) ?? 'Planta',
                  stops: Array.isArray(floor.stops)
                    ? floor.stops
                        .map(parseStop)
                        .filter((s): s is StopView => s !== null)
                    : [],
                }
              : null,
          )
          .filter((f): f is RoundFloor => f !== null)
      : [],
    incidents: Array.isArray(value.incidents)
      ? value.incidents.filter(isRecord).map((incident) => ({
          stopId: str(incident.stopId) ?? '',
          place: str(incident.place) ?? '',
          assetName: str(incident.assetName) ?? 'Equipo',
          doneAt: str(incident.doneAt),
          doneBy: parsePerson(incident.doneBy),
          problems: Array.isArray(incident.problems)
            ? incident.problems
                .map(parseProblem)
                .filter((p): p is Problem => p !== null)
            : [],
        }))
      : [],
    noAccess: Array.isArray(value.noAccess)
      ? value.noAccess.filter(isRecord).map((row) => ({
          stopId: str(row.stopId) ?? '',
          place: str(row.place) ?? '',
          assetName: str(row.assetName) ?? 'Equipo',
          reason: str(row.reason),
          at: str(row.at),
        }))
      : [],
  };
}

export type StopItem = {
  id: string;
  label: string;
  section: string | null;
  type: string | null;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  status: string;
  value: string | null;
  notes: string | null;
};

export type StopDetail = StopView & { items: StopItem[] };

export function parseStopDetail(value: unknown): StopDetail | null {
  const stop = parseStop(value);
  if (!stop || !isRecord(value)) return null;
  return {
    ...stop,
    items: Array.isArray(value.items)
      ? value.items.filter(isRecord).map((item, index) => ({
          id: str(item.id) ?? `item-${index}`,
          label: str(item.label) ?? 'Punto',
          section: str(item.section),
          type: str(item.type),
          unit: str(item.unit),
          minValue: numOrNull(item.minValue),
          maxValue: numOrNull(item.maxValue),
          status: str(item.status) ?? 'PENDING',
          value: str(item.value),
          notes: str(item.notes),
        }))
      : [],
  };
}

// ---------------------------------------------------------------
// Historial de un equipo
// ---------------------------------------------------------------

export type HistoryEntry =
  | {
      kind: 'ROUND';
      id: string;
      date: string | null;
      roundId: string;
      roundStatus: RoundStatus;
      code: string | null;
      place: string;
      status: StopStatus;
      hasIssue: boolean;
      noAccessReason: string | null;
      doneBy: Person | null;
      measurements: {
        label: string;
        value: number;
        unit: string | null;
        outOfRange: boolean;
      }[];
      problems: Problem[];
    }
  | {
      kind: 'REPORT';
      id: string;
      date: string | null;
      reportId: string;
      code: string | null;
      title: string;
      status: string;
    };

export type AssetHistory = {
  plans: { id: string; name: string; frequency: string; nextDueOn: string }[];
  entries: HistoryEntry[];
};

export function parseAssetHistory(value: unknown): AssetHistory | null {
  if (!isRecord(value)) return null;
  const entries: HistoryEntry[] = [];
  for (const raw of Array.isArray(value.entries) ? value.entries : []) {
    if (!isRecord(raw)) continue;
    const id = str(raw.id);
    if (!id) continue;
    if (raw.kind === 'ROUND') {
      entries.push({
        kind: 'ROUND',
        id,
        date: str(raw.date),
        roundId: str(raw.roundId) ?? '',
        roundStatus: parseRoundStatus(raw.roundStatus),
        code: str(raw.code),
        place: str(raw.place) ?? '',
        status: parseStopStatus(raw.status),
        hasIssue: raw.hasIssue === true,
        noAccessReason: str(raw.noAccessReason),
        doneBy: parsePerson(raw.doneBy),
        measurements: Array.isArray(raw.measurements)
          ? raw.measurements
              .filter(isRecord)
              .filter((m) => numOrNull(m.value) !== null)
              .map((m) => ({
                label: str(m.label) ?? 'Medida',
                value: num(m.value),
                unit: str(m.unit),
                outOfRange: m.outOfRange === true,
              }))
          : [],
        problems: Array.isArray(raw.problems)
          ? raw.problems
              .map(parseProblem)
              .filter((p): p is Problem => p !== null)
          : [],
      });
    } else if (raw.kind === 'REPORT') {
      entries.push({
        kind: 'REPORT',
        id,
        date: str(raw.date),
        reportId: str(raw.reportId) ?? id,
        code: str(raw.code),
        title: str(raw.title) ?? 'Parte de trabajo',
        status: str(raw.status) ?? '',
      });
    }
  }

  return {
    plans: Array.isArray(value.plans)
      ? value.plans.filter(isRecord).map((plan) => ({
          id: str(plan.id) ?? '',
          name: str(plan.name) ?? 'Plan',
          frequency: str(plan.frequency) ?? '',
          nextDueOn: str(plan.nextDueOn) ?? '',
        }))
      : [],
    entries,
  };
}