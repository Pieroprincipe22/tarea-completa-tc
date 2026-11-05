import { compareNames, spaceLabel } from '../building/building-plan';

/**
 * Reglas de los planes preventivos y de las rondas que no dependen de la
 * base de datos: fechas de cada ronda, qué ronda toca crear, cómo se
 * ordenan los equipos y cómo se cuentan. Se prueban por separado.
 *
 * Las fechas de los planes son días (sin hora): se guardan a las 00:00
 * UTC de ese día y "hoy" es el día que es en España.
 */

export const PLAN_UNITS = ['WEEK', 'MONTH'] as const;
export type PlanUnit = (typeof PLAN_UNITS)[number];

export const EVERY_MAX: Record<PlanUnit, number> = { WEEK: 52, MONTH: 24 };
export const LEAD_DAYS_MAX = 60;
export const LEAD_DAYS_DEFAULT = 7;
export const PLAN_NAME_MAX = 80;
export const CLOSE_NOTE_MAX = 1000;
// Una ronda no puede tener más equipos que esto (un hotel grande cabe de sobra).
export const ROUND_STOPS_MAX = 2000;

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------
// Días
// ---------------------------------------------------------------

/** "2026-11-04" → ese día a las 00:00 UTC. null si no es una fecha real. */
export function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
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

/** Ese día como "2026-11-04". */
export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** El día que es ahora en España (a las 00:00 UTC de ese día). */
export function todayInSpain(now: Date = new Date()): Date {
  const text = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return (
    parseDay(text) ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// Diferencia en minutos entre la hora de España y la UTC en ese momento
// (60 en invierno, 120 en verano).
function spainOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
  );
  return Math.round((local - at.getTime()) / 60_000);
}

/**
 * La hora a la que se programa la orden de una ronda: ese día a las 8:00
 * en España. Así la orden no sale "a la 1:00" (la medianoche UTC).
 */
export const ROUND_START_HOUR = 8;

export function roundStartsAt(day: Date): Date {
  const guess = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), ROUND_START_HOUR),
  );
  return new Date(guess.getTime() - spainOffsetMinutes(guess) * 60_000);
}

// 31 de enero + 1 mes = 28 (o 29) de febrero: nunca se pasa al mes siguiente.
function addMonthsClamped(start: Date, months: number): Date {
  const total = start.getUTCMonth() + months;
  const year = start.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)));
}

// "1 nov 2026"
export function formatLongDay(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace('.', '');
}

// ---------------------------------------------------------------
// Fechas de las rondas de un plan
// ---------------------------------------------------------------

export type PlanTiming = {
  startsOn: Date;
  unit: PlanUnit;
  every: number;
};

/**
 * La ronda número n de un plan (0 = la primera). Siempre se cuenta desde
 * la fecha de inicio: un plan que empieza el 31 cae a final de cada mes.
 */
export function occurrence(timing: PlanTiming, n: number): Date {
  return timing.unit === 'WEEK'
    ? addDays(timing.startsOn, n * timing.every * 7)
    : addMonthsClamped(timing.startsOn, n * timing.every);
}

/** La primera ronda del plan que cae después del día `after`. */
export function occurrenceAfter(timing: PlanTiming, after: Date): Date {
  if (after < timing.startsOn) return timing.startsOn;

  // Una estimación por debajo y se avanza hasta pasar `after`.
  let n =
    timing.unit === 'WEEK'
      ? Math.floor((after.getTime() - timing.startsOn.getTime()) / (timing.every * 7 * DAY_MS))
      : Math.floor(
          ((after.getUTCFullYear() - timing.startsOn.getUTCFullYear()) * 12 +
            (after.getUTCMonth() - timing.startsOn.getUTCMonth())) /
            timing.every,
        );
  n = Math.max(0, n - 1);

  let date = occurrence(timing, n);
  while (date <= after) {
    n += 1;
    date = occurrence(timing, n);
  }
  return date;
}

/** La primera ronda del plan que cae hoy o más tarde. */
export function firstDueFrom(timing: PlanTiming, today: Date): Date {
  return occurrenceAfter(timing, addDays(today, -1));
}

export type DuePick = {
  // Fecha de la ronda que hay que crear ahora.
  dueAt: Date;
  // Fecha de la ronda siguiente.
  nextDueAt: Date;
  // Rondas que ya pasaron enteras y no se crean.
  skipped: number;
};

/**
 * Qué ronda toca crear ahora. Cada ronda se crea `leadDays` días antes de
 * su fecha. Si el plan estuvo parado, las rondas que ya pasaron no se
 * crean todas: solo la más reciente, y se sigue contando desde ahí.
 */
export function pickDue(
  plan: PlanTiming & { nextDueAt: Date; leadDays: number },
  now: Date = new Date(),
): DuePick | null {
  const today = todayInSpain(now);
  if (plan.nextDueAt > addDays(today, plan.leadDays)) return null;

  let dueAt = plan.nextDueAt;
  let nextDueAt = occurrenceAfter(plan, dueAt);
  let skipped = 0;
  while (nextDueAt <= today) {
    dueAt = nextDueAt;
    nextDueAt = occurrenceAfter(plan, dueAt);
    skipped += 1;
  }
  return { dueAt, nextDueAt, skipped };
}

// "Cada mes", "Cada 3 meses", "Cada 2 semanas"
export function describeFrequency(every: number, unit: PlanUnit): string {
  if (unit === 'WEEK') return every === 1 ? 'Cada semana' : `Cada ${every} semanas`;
  return every === 1 ? 'Cada mes' : `Cada ${every} meses`;
}

// "Preventivo Fancoil · Hotel Four Points · 1 nov 2026"
export function roundTitle(category: string, siteName: string, dueAt: Date): string {
  return `Preventivo ${category} · ${siteName} · ${formatLongDay(dueAt)}`;
}

// "Fancoil · cada 3 meses"
export function defaultPlanName(category: string, every: number, unit: PlanUnit): string {
  const frequency = describeFrequency(every, unit);
  return `${category} · ${frequency.charAt(0).toLowerCase()}${frequency.slice(1)}`;
}

// ---------------------------------------------------------------
// Paradas de una ronda
// ---------------------------------------------------------------

export type StopPlace = {
  floorLevel: number | null;
  floorName: string | null;
  spaceKind: 'ROOM' | 'COMMON' | null;
  spaceName: string | null;
  assetName: string;
};

/**
 * El orden en que se recorre el edificio: de la planta más baja a la más
 * alta; en cada planta, primero las zonas comunes y luego las habitaciones
 * por número. Los equipos que no están en ninguna habitación, al final.
 */
export function compareStops(a: StopPlace, b: StopPlace): number {
  if (a.floorLevel === null || b.floorLevel === null) {
    if (a.floorLevel !== b.floorLevel) return a.floorLevel === null ? 1 : -1;
  } else if (a.floorLevel !== b.floorLevel) {
    return a.floorLevel - b.floorLevel;
  }

  const kindA = a.spaceKind === 'COMMON' ? 0 : 1;
  const kindB = b.spaceKind === 'COMMON' ? 0 : 1;
  if (kindA !== kindB) return kindA - kindB;

  const bySpace = compareNames(a.spaceName ?? '', b.spaceName ?? '');
  if (bySpace !== 0) return bySpace;

  return compareNames(a.assetName, b.assetName);
}

// "Hab. 204", "Cuarto de rack" o "Sin habitación".
export function stopLabel(stop: Pick<StopPlace, 'spaceKind' | 'spaceName'>): string {
  return stop.spaceKind && stop.spaceName
    ? spaceLabel(stop.spaceKind, stop.spaceName)
    : 'Sin habitación';
}

// "Planta 2 · Hab. 204"
export function stopPlace(stop: StopPlace): string {
  const label = stopLabel(stop);
  return stop.floorName && stop.spaceName ? `${stop.floorName} · ${label}` : label;
}

export type StopCounts = {
  total: number;
  done: number;
  pending: number;
  noAccess: number;
  issues: number;
};

export function countStops(
  stops: { status: 'PENDING' | 'DONE' | 'NO_ACCESS'; hasIssue: boolean }[],
): StopCounts {
  const counts: StopCounts = { total: 0, done: 0, pending: 0, noAccess: 0, issues: 0 };
  for (const stop of stops) {
    counts.total += 1;
    if (stop.status === 'DONE') counts.done += 1;
    else if (stop.status === 'NO_ACCESS') counts.noAccess += 1;
    else counts.pending += 1;
    if (stop.hasIssue) counts.issues += 1;
  }
  return counts;
}

// El texto de una incidencia anotada a mano ("Incidencias observadas").
export function isIssueNotesLabel(label: string | null): boolean {
  return Boolean(label && /incidencia/i.test(label));
}