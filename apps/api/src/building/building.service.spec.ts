import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  assetLocation,
  compareNames,
  generatedAssetName,
  planGeneration,
  roomNumber,
} from './building-plan';
import { BuildingService } from './building.service';

describe('Numeración de habitaciones', () => {
  it('planta y número de dos cifras: 101, 115, 1001, 1115', () => {
    expect(roomNumber(1, 1)).toBe('101');
    expect(roomNumber(1, 15)).toBe('115');
    expect(roomNumber(10, 1)).toBe('1001');
    expect(roomNumber(11, 15)).toBe('1115');
  });

  it('el Four Points: 11 plantas de 15 habitaciones', () => {
    const result = planGeneration({ fromLevel: 1, toLevel: 11, roomsPerFloor: 15 });
    if (!result.ok) throw new Error(result.problem);

    expect(result.plan.totalRooms).toBe(165);
    expect(result.plan.floors).toHaveLength(11);
    expect(result.plan.floors[0]).toMatchObject({ level: 1, name: 'Planta 1' });
    expect(result.plan.floors[0].rooms[0]).toBe('101');
    expect(result.plan.floors[10].rooms.at(-1)).toBe('1115');
  });

  it('se puede empezar la numeración en otro número', () => {
    const result = planGeneration({ fromLevel: 2, toLevel: 2, roomsPerFloor: 3, firstNumber: 10 });
    expect(result.ok && result.plan.floors[0].rooms).toEqual(['210', '211', '212']);
  });

  it('explica qué está mal', () => {
    const problem = (input: Parameters<typeof planGeneration>[0]) => {
      const result = planGeneration(input);
      return result.ok ? null : result.problem;
    };

    expect(problem({ fromLevel: 0, toLevel: 3, roomsPerFloor: 10 })).toMatch(/desde la planta 1/);
    expect(problem({ fromLevel: 5, toLevel: 3, roomsPerFloor: 10 })).toMatch(/no puede ser menor/);
    expect(problem({ fromLevel: 1, toLevel: 3, roomsPerFloor: 0 })).toMatch(/entre 1 y 99/);
    expect(problem({ fromLevel: 1, toLevel: 3, roomsPerFloor: 50, firstNumber: 60 })).toMatch(
      /del 01 al 99/,
    );
    expect(problem({ fromLevel: 1, toLevel: 150, roomsPerFloor: 2 })).toMatch(/100 plantas/);
  });

  it('nombres y ubicación de los equipos', () => {
    expect(generatedAssetName('Fancoil', '204')).toBe('Fancoil · Hab. 204');
    expect(assetLocation('Planta 2', 'ROOM', '204')).toBe('Planta 2 · Hab. 204');
    expect(assetLocation('Planta baja', 'COMMON', 'Cuarto de rack')).toBe(
      'Planta baja · Cuarto de rack',
    );
  });

  it('ordena los números como números', () => {
    expect(['1001', '102', '101', '99'].sort(compareNames)).toEqual(['99', '101', '102', '1001']);
  });
});

// ---------------------------------------------------------------

const SITE = {
  id: 's1',
  name: 'Hotel Four Points',
  customerId: 'cu1',
  customer: { id: 'cu1', name: 'Four Points' },
};

function setup() {
  const prisma = {
    site: { findFirst: jest.fn().mockResolvedValue(SITE) },
    floor: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'f-new', ...data })),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'f1', ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    space: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ id: 'sp-new', ...data })),
      createMany: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sp1', ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    asset: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(),
  };
  // Dentro de la transacción se usan las mismas tablas simuladas.
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

  const planLimits = { assertAssetCapacity: jest.fn().mockResolvedValue(undefined) };
  const service = new BuildingService(prisma as never, planLimits as never);
  return { prisma, planLimits, service };
}

describe('BuildingService', () => {
  describe('generate()', () => {
    it('crea plantas, habitaciones y un equipo en cada una', async () => {
      const { prisma, planLimits, service } = setup();
      // Las plantas que se crean se vuelven a leer para saber su id.
      prisma.floor.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
        { id: 'f1', level: 1 },
        { id: 'f2', level: 2 },
      ]);
      prisma.space.findMany
        .mockResolvedValueOnce([]) // habitaciones que ya existían
        .mockResolvedValueOnce([
          { id: 'r101', name: '101', floor: { name: 'Planta 1' } },
          { id: 'r102', name: '102', floor: { name: 'Planta 1' } },
          { id: 'r201', name: '201', floor: { name: 'Planta 2' } },
          { id: 'r202', name: '202', floor: { name: 'Planta 2' } },
        ]);

      const result = await service.generate('c1', 's1', {
        fromLevel: 1,
        toLevel: 2,
        roomsPerFloor: 2,
        equipment: { category: 'Fancoil', brand: 'Daikin', model: null },
      });

      expect(result).toEqual({
        floorsCreated: 2,
        roomsCreated: 4,
        roomsSkipped: 0,
        assetsCreated: 4,
      });
      expect(planLimits.assertAssetCapacity).toHaveBeenCalledWith('c1', 4);
      expect(prisma.floor.createMany.mock.calls[0][0].data).toEqual([
        { companyId: 'c1', siteId: 's1', level: 1, name: 'Planta 1' },
        { companyId: 'c1', siteId: 's1', level: 2, name: 'Planta 2' },
      ]);
      expect(prisma.space.createMany.mock.calls[0][0].data[3]).toEqual({
        companyId: 'c1',
        siteId: 's1',
        floorId: 'f2',
        kind: 'ROOM',
        name: '202',
      });
      expect(prisma.asset.createMany.mock.calls[0][0].data[0]).toEqual({
        companyId: 'c1',
        customerId: 'cu1',
        siteId: 's1',
        spaceId: 'r101',
        name: 'Fancoil · Hab. 101',
        category: 'Fancoil',
        brand: 'Daikin',
        model: null,
        location: 'Planta 1 · Hab. 101',
      });
    });

    it('si se repite, no duplica: salta lo que ya existe', async () => {
      const { prisma, planLimits, service } = setup();
      prisma.floor.findMany.mockResolvedValueOnce([{ id: 'f1', level: 1 }]);
      prisma.space.findMany
        .mockResolvedValueOnce([
          { id: 'r101', name: '101', _count: { assets: 1 } },
          { id: 'r102', name: '102', _count: { assets: 0 } },
        ])
        .mockResolvedValueOnce([{ id: 'r102', name: '102', floor: { name: 'Planta 1' } }]);

      const result = await service.generate('c1', 's1', {
        fromLevel: 1,
        toLevel: 1,
        roomsPerFloor: 2,
        equipment: { category: 'Split' },
      });

      expect(result).toEqual({
        floorsCreated: 0,
        roomsCreated: 0,
        roomsSkipped: 2,
        assetsCreated: 1,
      });
      // Solo la 102, que estaba vacía, recibe equipo.
      expect(planLimits.assertAssetCapacity).toHaveBeenCalledWith('c1', 1);
      expect(prisma.floor.createMany).not.toHaveBeenCalled();
      expect(prisma.space.createMany).not.toHaveBeenCalled();
    });

    it('sin equipo, solo crea plantas y habitaciones', async () => {
      const { prisma, planLimits, service } = setup();
      prisma.floor.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'f3', level: 3 }]);

      const result = await service.generate('c1', 's1', {
        fromLevel: 3,
        toLevel: 3,
        roomsPerFloor: 15,
      });

      expect(result.roomsCreated).toBe(15);
      expect(result.assetsCreated).toBe(0);
      expect(planLimits.assertAssetCapacity).toHaveBeenCalledWith('c1', 0);
      expect(prisma.asset.createMany).not.toHaveBeenCalled();
    });

    it('si no caben en el plan, no crea nada', async () => {
      const { prisma, planLimits, service } = setup();
      planLimits.assertAssetCapacity.mockRejectedValue(
        new BadRequestException('Tu plan PRO permite hasta 500 equipos.'),
      );

      await expect(
        service.generate('c1', 's1', {
          fromLevel: 1,
          toLevel: 11,
          roomsPerFloor: 15,
          equipment: { category: 'Fancoil' },
        }),
      ).rejects.toThrow('Tu plan PRO permite hasta 500 equipos.');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza datos imposibles con un mensaje claro', async () => {
      const { service } = setup();

      await expect(
        service.generate('c1', 's1', { fromLevel: 4, toLevel: 2, roomsPerFloor: 10 }),
      ).rejects.toThrow('La última planta no puede ser menor que la primera.');
    });
  });

  describe('plantas y espacios', () => {
    it('no deja dos plantas en el mismo nivel', async () => {
      const { prisma, service } = setup();
      prisma.floor.findFirst.mockResolvedValue({ name: 'Planta baja' });

      const attempt = service.createFloor('c1', 's1', { name: 'Recepción', level: 0 });
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow('Ya hay una planta en el nivel 0 (Planta baja).');
      expect(prisma.floor.create).not.toHaveBeenCalled();
    });

    it('un número de habitación no se repite en el hotel', async () => {
      const { prisma, service } = setup();
      prisma.floor.findFirst.mockResolvedValue({ id: 'f2', name: 'Planta 2', level: 2 });
      prisma.space.findFirst.mockResolvedValue({ floor: { name: 'Planta 2' } });

      await expect(
        service.createSpace('c1', 's1', { floorId: 'f2', kind: 'ROOM', name: '204' }),
      ).rejects.toThrow('La habitación 204 ya existe en Planta 2.');
    });

    it('crea una zona común con su tipo', async () => {
      const { prisma, service } = setup();
      prisma.floor.findFirst.mockResolvedValue({ id: 'f0', name: 'Planta baja', level: 0 });

      await service.createSpace('c1', 's1', {
        floorId: 'f0',
        kind: 'COMMON',
        name: 'Cuarto de rack',
        category: 'Cuarto de rack',
      });

      expect(prisma.space.create.mock.calls[0][0].data).toMatchObject({
        companyId: 'c1',
        siteId: 's1',
        floorId: 'f0',
        kind: 'COMMON',
        name: 'Cuarto de rack',
        category: 'Cuarto de rack',
      });
    });

    it('no borra una planta con equipos', async () => {
      const { prisma, service } = setup();
      prisma.floor.findFirst.mockResolvedValue({ id: 'f1', name: 'Planta 1', level: 1 });
      prisma.asset.count.mockResolvedValue(15);

      await expect(service.deleteFloor('c1', 's1', 'f1')).rejects.toThrow(
        '«Planta 1» tiene 15 equipos. Quítalos o muévelos a otra planta antes de borrarla.',
      );
      expect(prisma.floor.delete).not.toHaveBeenCalled();
    });

    it('al cambiar el nombre de una planta actualiza la ubicación de sus equipos', async () => {
      const { prisma, service } = setup();
      prisma.floor.findFirst.mockResolvedValue({ id: 'f1', name: 'Planta 1', level: 1 });
      prisma.space.findMany.mockResolvedValue([{ id: 'r101', kind: 'ROOM', name: '101' }]);

      await service.updateFloor('c1', 's1', 'f1', { name: 'Primera planta' });

      expect(prisma.asset.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', spaceId: 'r101' },
        data: { location: 'Primera planta · Hab. 101' },
      });
    });

    it('no deja tocar el edificio de un sitio de otra empresa', async () => {
      const { prisma, service } = setup();
      prisma.site.findFirst.mockResolvedValue(null);

      await expect(service.get('c2', 's1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.site.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1', companyId: 'c2' } }),
      );
    });

    it('una planta de otro sitio no se encuentra', async () => {
      const { prisma, service } = setup();

      await expect(
        service.createSpace('c1', 's1', { floorId: 'f-otro', kind: 'ROOM', name: '101' }),
      ).rejects.toThrow('Planta no encontrada en este sitio.');
      expect(prisma.floor.findFirst).toHaveBeenCalledWith({
        where: { id: 'f-otro', companyId: 'c1', siteId: 's1' },
      });
    });
  });

  describe('get()', () => {
    it('devuelve las plantas en orden con zonas comunes primero y habitaciones en orden', async () => {
      const { prisma, service } = setup();
      prisma.floor.findMany.mockResolvedValue([
        {
          id: 'f1',
          level: 1,
          name: 'Planta 1',
          spaces: [
            { id: 'a', kind: 'ROOM', name: '110', category: null, notes: null, assets: [] },
            {
              id: 'b',
              kind: 'ROOM',
              name: '102',
              category: null,
              notes: null,
              assets: [{ id: 'x' }],
            },
            {
              id: 'c',
              kind: 'COMMON',
              name: 'Office',
              category: 'Office',
              notes: null,
              assets: [],
            },
          ],
        },
      ]);
      prisma.asset.findMany.mockResolvedValue([{ id: 'y', name: 'Enfriadora' }]);

      const building = await service.get('c1', 's1');

      expect(building.floors[0].spaces.map((s) => s.label)).toEqual([
        'Office',
        'Hab. 102',
        'Hab. 110',
      ]);
      expect(building.totals).toEqual({
        floors: 1,
        rooms: 2,
        commons: 1,
        placedAssets: 1,
        unplacedAssets: 1,
      });
    });
  });
});