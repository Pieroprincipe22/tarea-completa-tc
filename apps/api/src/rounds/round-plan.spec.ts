import {
  compareStops,
  countStops,
  defaultPlanName,
  describeFrequency,
  firstDueFrom,
  formatDay,
  occurrence,
  occurrenceAfter,
  parseDay,
  pickDue,
  roundStartsAt,
  roundTitle,
  stopLabel,
  stopPlace,
  todayInSpain,
  type PlanTiming,
  type StopPlace,
} from './round-plan';

const day = (text: string) => parseDay(text)!;
const days = (dates: Date[]) => dates.map(formatDay);

describe('Fechas de los planes', () => {
  it('lee fechas reales y rechaza las que no existen', () => {
    expect(formatDay(day('2026-11-04'))).toBe('2026-11-04');
    expect(parseDay('2026-02-30')).toBeNull();
    expect(parseDay('04/11/2026')).toBeNull();
  });

  it('"hoy" es el día que es en España', () => {
    // 23:30 UTC del 4 de noviembre = 00:30 del 5 en Madrid.
    expect(formatDay(todayInSpain(new Date('2026-11-04T23:30:00Z')))).toBe('2026-11-05');
    expect(formatDay(todayInSpain(new Date('2026-11-04T22:30:00Z')))).toBe('2026-11-04');
  });

  it('la orden de la ronda se programa a las 8:00 de España', () => {
    expect(roundStartsAt(day('2026-11-08')).toISOString()).toBe('2026-11-08T07:00:00.000Z');
    expect(roundStartsAt(day('2026-07-01')).toISOString()).toBe('2026-07-01T06:00:00.000Z');
    // El día que cambia la hora (29 de marzo de 2026) ya es horario de verano a las 8.
    expect(roundStartsAt(day('2026-03-29')).toISOString()).toBe('2026-03-29T06:00:00.000Z');
  });

  it('un plan mensual que empieza el 31 cae siempre a final de mes', () => {
    const timing: PlanTiming = { startsOn: day('2026-01-31'), unit: 'MONTH', every: 1 };
    expect(days([0, 1, 2, 3].map((n) => occurrence(timing, n)))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('trimestral y semanal', () => {
    const quarterly: PlanTiming = { startsOn: day('2026-11-08'), unit: 'MONTH', every: 3 };
    expect(days([1, 2, 4].map((n) => occurrence(quarterly, n)))).toEqual([
      '2027-02-08',
      '2027-05-08',
      '2027-11-08',
    ]);
    const biweekly: PlanTiming = { startsOn: day('2026-11-02'), unit: 'WEEK', every: 2 };
    expect(formatDay(occurrence(biweekly, 3))).toBe('2026-12-14');
  });

  it('la siguiente ronda después de una fecha', () => {
    const timing: PlanTiming = { startsOn: day('2026-11-08'), unit: 'MONTH', every: 3 };
    expect(formatDay(occurrenceAfter(timing, day('2026-11-01')))).toBe('2026-11-08');
    expect(formatDay(occurrenceAfter(timing, day('2026-11-08')))).toBe('2027-02-08');
    expect(formatDay(occurrenceAfter(timing, day('2030-06-01')))).toBe('2030-08-08');
  });

  it('si ya lleváis el mantenimiento, la próxima se calcula desde la última', () => {
    // La última se hizo el 1 de septiembre y es trimestral: toca el 1 de diciembre.
    const timing: PlanTiming = { startsOn: day('2026-09-01'), unit: 'MONTH', every: 3 };
    expect(formatDay(firstDueFrom(timing, day('2026-11-04')))).toBe('2026-12-01');
    // Si toca justo hoy, es hoy.
    expect(formatDay(firstDueFrom(timing, day('2026-12-01')))).toBe('2026-12-01');
  });
});

describe('Qué ronda toca crear', () => {
  const plan = {
    startsOn: day('2026-11-08'),
    unit: 'MONTH' as const,
    every: 3,
    nextDueAt: day('2026-11-08'),
    leadDays: 7,
  };

  it('se crea los días de antelación que diga el plan', () => {
    expect(pickDue(plan, new Date('2026-10-31T10:00:00Z'))).toBeNull();
    const pick = pickDue(plan, new Date('2026-11-01T10:00:00Z'));
    expect(pick && days([pick.dueAt, pick.nextDueAt])).toEqual(['2026-11-08', '2027-02-08']);
    expect(pick?.skipped).toBe(0);
  });

  it('una ronda que se retrasa unos días se crea igual', () => {
    const pick = pickDue(plan, new Date('2026-11-20T10:00:00Z'));
    expect(pick && formatDay(pick.dueAt)).toBe('2026-11-08');
  });

  it('si el plan estuvo parado, no crea todas las atrasadas', () => {
    const pick = pickDue(plan, new Date('2027-09-01T10:00:00Z'));
    expect(pick && days([pick.dueAt, pick.nextDueAt])).toEqual(['2027-08-08', '2027-11-08']);
    expect(pick?.skipped).toBe(3);
  });

  it('con antelación mayor que la frecuencia no se salta ninguna', () => {
    const weekly = {
      startsOn: day('2026-11-09'),
      unit: 'WEEK' as const,
      every: 1,
      nextDueAt: day('2026-11-09'),
      leadDays: 14,
    };
    const pick = pickDue(weekly, new Date('2026-11-04T10:00:00Z'));
    expect(pick && days([pick.dueAt, pick.nextDueAt])).toEqual(['2026-11-09', '2026-11-16']);
    expect(pick?.skipped).toBe(0);
  });
});

describe('Textos', () => {
  it('frecuencia, nombre del plan y título de la orden', () => {
    expect(describeFrequency(1, 'MONTH')).toBe('Cada mes');
    expect(describeFrequency(3, 'MONTH')).toBe('Cada 3 meses');
    expect(describeFrequency(1, 'WEEK')).toBe('Cada semana');
    expect(describeFrequency(2, 'WEEK')).toBe('Cada 2 semanas');
    expect(defaultPlanName('Fancoil', 3, 'MONTH')).toBe('Fancoil · cada 3 meses');
    expect(roundTitle('Fancoil', 'Hotel Four Points', day('2026-11-08'))).toBe(
      'Preventivo Fancoil · Hotel Four Points · 8 nov 2026',
    );
  });
});

describe('Paradas de la ronda', () => {
  const stop = (
    floorLevel: number | null,
    spaceKind: 'ROOM' | 'COMMON' | null,
    spaceName: string | null,
    assetName = 'Fancoil',
  ): StopPlace => ({
    floorLevel,
    floorName:
      floorLevel === null ? null : floorLevel === 0 ? 'Planta baja' : `Planta ${floorLevel}`,
    spaceKind,
    spaceName,
    assetName,
  });

  it('recorre el edificio de abajo arriba, zonas comunes primero', () => {
    const sorted = [
      stop(null, null, null, 'Fancoil almacén'),
      stop(2, 'ROOM', '210'),
      stop(1, 'ROOM', '115'),
      stop(2, 'ROOM', '202'),
      stop(0, 'COMMON', 'Recepción'),
      stop(2, 'COMMON', 'Office'),
      stop(1, 'ROOM', '102'),
    ].sort(compareStops);

    expect(sorted.map(stopLabel)).toEqual([
      'Recepción',
      'Hab. 102',
      'Hab. 115',
      'Office',
      'Hab. 202',
      'Hab. 210',
      'Sin habitación',
    ]);
    expect(stopPlace(sorted[4])).toBe('Planta 2 · Hab. 202');
    expect(stopPlace(sorted[6])).toBe('Sin habitación');
  });

  it('cuenta hechas, pendientes, sin acceso e incidencias', () => {
    expect(
      countStops([
        { status: 'DONE', hasIssue: true },
        { status: 'DONE', hasIssue: false },
        { status: 'NO_ACCESS', hasIssue: false },
        { status: 'PENDING', hasIssue: false },
      ]),
    ).toEqual({ total: 4, done: 2, pending: 1, noAccess: 1, issues: 1 });
  });
});