import { machineNames, planSetup, type SiteSnapshot } from './setup-plan';

const EMPTY: SiteSnapshot = { floors: [], spaces: [], assets: [] };

function ok(result: ReturnType<typeof planSetup>) {
  if (!result.ok) throw new Error(result.problem);
  return result.plan;
}

function problem(result: ReturnType<typeof planSetup>) {
  if (result.ok) throw new Error('Se esperaba un problema');
  return result.problem;
}

describe('machineNames', () => {
  it('una máquina por sitio va sin número', () => {
    expect(machineNames('Fancoil', 'Hab. 101', 1, 0, new Set())).toEqual(['Fancoil · Hab. 101']);
  });

  it('varias por sitio van numeradas', () => {
    expect(machineNames('Fancoil', 'Recepción', 3, 0, new Set())).toEqual([
      'Fancoil 1 · Recepción',
      'Fancoil 2 · Recepción',
      'Fancoil 3 · Recepción',
    ]);
  });

  it('si ya había una sin número, la nueva es la 2', () => {
    const taken = new Set(['fancoil · hab. 101']);
    expect(machineNames('Fancoil', 'Hab. 101', 2, 1, taken)).toEqual(['Fancoil 2 · Hab. 101']);
  });

  it('no repite un nombre que ya existe en ese sitio', () => {
    // Una dada de baja con el nombre "normal": la nueva se numera.
    const taken = new Set(['fancoil · hab. 101']);
    expect(machineNames('Fancoil', 'Hab. 101', 1, 0, taken)).toEqual(['Fancoil 2 · Hab. 101']);
  });

  it('no crea nada si ya están todas', () => {
    expect(machineNames('Fancoil', 'Hab. 101', 1, 1, new Set())).toEqual([]);
    expect(machineNames('Fancoil', 'Hab. 101', 1, 3, new Set())).toEqual([]);
  });
});

describe('planSetup', () => {
  it('prepara un hotel vacío: plantas, habitaciones, zonas y máquinas', () => {
    const plan = ok(
      planSetup(
        {
          building: { floors: [1, 2, 3, 4, 5].map((level) => ({ level, rooms: 10 })) },
          zones: [
            { name: 'Recepción', level: 0 },
            { name: 'Cubierta', level: 6, floorName: 'Cubierta' },
          ],
          machines: [
            {
              category: 'Fancoil',
              perRoom: 1,
              zones: [{ name: 'Recepción', level: 0, quantity: 2 }],
            },
            {
              category: 'Unidad exterior VRF',
              zones: [{ name: 'Cubierta', level: 6, quantity: 4 }],
            },
          ],
        },
        EMPTY,
      ),
    );

    expect(plan.floors).toEqual([
      { level: 1, name: 'Planta 1' },
      { level: 2, name: 'Planta 2' },
      { level: 3, name: 'Planta 3' },
      { level: 4, name: 'Planta 4' },
      { level: 5, name: 'Planta 5' },
      { level: 0, name: 'Planta baja' },
      { level: 6, name: 'Cubierta' },
    ]);
    expect(plan.rooms).toHaveLength(50);
    expect(plan.rooms[0]).toEqual({ level: 1, name: '101' });
    expect(plan.rooms[49]).toEqual({ level: 5, name: '510' });
    expect(plan.zones).toEqual([
      { level: 0, name: 'Recepción' },
      { level: 6, name: 'Cubierta' },
    ]);
    expect(plan.machines).toEqual([
      { category: 'Fancoil', existing: 0, adding: 52 },
      { category: 'Unidad exterior VRF', existing: 0, adding: 4 },
    ]);
    expect(plan.assets[0]).toEqual({
      level: 1,
      floorName: 'Planta 1',
      kind: 'ROOM',
      spaceName: '101',
      name: 'Fancoil · Hab. 101',
      category: 'Fancoil',
      brand: null,
      model: null,
    });
    expect(plan.assets.filter((a) => a.spaceName === 'Cubierta').map((a) => a.name)).toEqual([
      'Unidad exterior VRF 1 · Cubierta',
      'Unidad exterior VRF 2 · Cubierta',
      'Unidad exterior VRF 3 · Cubierta',
      'Unidad exterior VRF 4 · Cubierta',
    ]);
    expect(plan.totals).toEqual({ floors: 7, rooms: 50, zones: 2 });
  });

  it('cada planta puede tener sus habitaciones', () => {
    const plan = ok(
      planSetup(
        {
          building: {
            firstNumber: 1,
            floors: [
              { level: 1, rooms: 12 },
              { level: 2, rooms: 8 },
            ],
          },
        },
        EMPTY,
      ),
    );
    expect(plan.rooms).toHaveLength(20);
    expect(plan.rooms.at(-1)).toEqual({ level: 2, name: '208' });
  });

  it('repetirlo no duplica nada', () => {
    const snapshot: SiteSnapshot = {
      floors: [
        { level: 0, name: 'Planta baja' },
        { level: 1, name: 'Planta 1' },
      ],
      spaces: [
        { level: 0, kind: 'COMMON', name: 'Recepción' },
        { level: 1, kind: 'ROOM', name: '101' },
        { level: 1, kind: 'ROOM', name: '102' },
      ],
      assets: [
        {
          place: { level: 1, name: '101' },
          name: 'Fancoil · Hab. 101',
          category: 'Fancoil',
          active: true,
        },
        {
          place: { level: 1, name: '102' },
          name: 'Fancoil · Hab. 102',
          category: 'fancoil',
          active: true,
        },
        {
          place: { level: 0, name: 'Recepción' },
          name: 'Fancoil 1 · Recepción',
          category: 'Fancoil',
          active: true,
        },
      ],
    };

    const plan = ok(
      planSetup(
        {
          building: { floors: [{ level: 1, rooms: 2 }] },
          zones: [{ name: 'recepción', level: 0 }],
          machines: [
            {
              category: 'FANCOIL',
              perRoom: 1,
              zones: [{ name: 'Recepción', level: 0, quantity: 1 }],
            },
          ],
        },
        snapshot,
      ),
    );

    expect(plan.floors).toEqual([]);
    expect(plan.rooms).toEqual([]);
    expect(plan.zones).toEqual([]);
    expect(plan.assets).toEqual([]);
    expect(plan.machines).toEqual([{ category: 'FANCOIL', existing: 3, adding: 0 }]);
  });

  it('añade solo lo que falta: habitaciones nuevas y la segunda máquina', () => {
    const snapshot: SiteSnapshot = {
      floors: [{ level: 1, name: 'Primera' }],
      spaces: [{ level: 1, kind: 'ROOM', name: '101' }],
      assets: [
        {
          place: { level: 1, name: '101' },
          name: 'Fancoil · Hab. 101',
          category: 'Fancoil',
          active: true,
        },
      ],
    };

    const plan = ok(
      planSetup(
        {
          building: { floors: [{ level: 1, rooms: 2 }] },
          machines: [{ category: 'Fancoil', perRoom: 2, brand: ' Daikin ' }],
        },
        snapshot,
      ),
    );

    expect(plan.rooms).toEqual([{ level: 1, name: '102' }]);
    expect(plan.assets.map((a) => `${a.floorName} · ${a.name} · ${a.brand}`)).toEqual([
      'Primera · Fancoil 2 · Hab. 101 · Daikin',
      'Primera · Fancoil 1 · Hab. 102 · Daikin',
      'Primera · Fancoil 2 · Hab. 102 · Daikin',
    ]);
  });

  it('una máquina dada de baja no cuenta: se pone otra', () => {
    const snapshot: SiteSnapshot = {
      floors: [{ level: 1, name: 'Planta 1' }],
      spaces: [{ level: 1, kind: 'ROOM', name: '101' }],
      assets: [
        {
          place: { level: 1, name: '101' },
          name: 'Fancoil · Hab. 101',
          category: 'Fancoil',
          active: false,
        },
      ],
    };

    const plan = ok(planSetup({ machines: [{ category: 'Fancoil', perRoom: 1 }] }, snapshot));
    expect(plan.assets.map((a) => a.name)).toEqual(['Fancoil 2 · Hab. 101']);
    expect(plan.machines).toEqual([{ category: 'Fancoil', existing: 0, adding: 1 }]);
  });

  it('las máquinas por habitación van en todas las del hotel', () => {
    const snapshot: SiteSnapshot = {
      floors: [{ level: 1, name: 'Planta 1' }],
      spaces: [{ level: 1, kind: 'ROOM', name: '150' }],
      assets: [],
    };
    const plan = ok(
      planSetup(
        {
          building: { floors: [{ level: 2, rooms: 1 }] },
          machines: [{ category: 'Unidad interior VRF', perRoom: 1 }],
        },
        snapshot,
      ),
    );
    expect(plan.assets.map((a) => a.name)).toEqual([
      'Unidad interior VRF · Hab. 150',
      'Unidad interior VRF · Hab. 201',
    ]);
  });

  describe('explica lo que no cuadra', () => {
    it('habitaciones en la planta baja', () => {
      expect(problem(planSetup({ building: { floors: [{ level: 0, rooms: 5 }] } }, EMPTY))).toMatch(
        /de la planta 1/,
      );
    });

    it('una planta repetida', () => {
      expect(
        problem(
          planSetup(
            {
              building: {
                floors: [
                  { level: 1, rooms: 5 },
                  { level: 1, rooms: 6 },
                ],
              },
            },
            EMPTY,
          ),
        ),
      ).toBe('La planta 1 está repetida.');
    });

    it('la numeración se pasa del 99', () => {
      expect(
        problem(
          planSetup({ building: { firstNumber: 95, floors: [{ level: 1, rooms: 10 }] } }, EMPTY),
        ),
      ).toMatch(/pasarían del 199/);
    });

    it('máquinas en habitaciones de un hotel sin habitaciones', () => {
      expect(
        problem(planSetup({ machines: [{ category: 'Fancoil', perRoom: 1 }] }, EMPTY)),
      ).toMatch(/todavía no tiene habitaciones/);
    });

    it('una zona que no existe', () => {
      expect(
        problem(
          planSetup(
            {
              machines: [
                { category: 'Enfriadora', zones: [{ name: 'Cubierta', level: 6, quantity: 1 }] },
              ],
            },
            EMPTY,
          ),
        ),
      ).toBe('Enfriadora: la zona «Cubierta» no está en el hotel. Añádela en el paso Edificio.');
    });

    it('el mismo tipo de máquina dos veces', () => {
      expect(
        problem(
          planSetup(
            {
              building: { floors: [{ level: 1, rooms: 1 }] },
              machines: [
                { category: 'Fancoil', perRoom: 1 },
                { category: ' fancoil ', perRoom: 1 },
              ],
            },
            EMPTY,
          ),
        ),
      ).toMatch(/está dos veces/);
    });

    it('una zona con el número de una habitación', () => {
      expect(
        problem(
          planSetup(
            { building: { floors: [{ level: 1, rooms: 2 }] }, zones: [{ name: '101', level: 1 }] },
            EMPTY,
          ),
        ),
      ).toBe('En Planta 1 ya hay una habitación 101. Ponle otro nombre a la zona.');
    });
  });
});