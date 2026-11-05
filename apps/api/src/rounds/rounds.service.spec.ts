import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoundsService } from './rounds.service';

const DUE = new Date('2026-11-08T00:00:00Z');

const TEMPLATE = {
  id: 't1',
  name: 'Mantenimiento de fancoil',
  title: null,
  isActive: true,
  items: [
    {
      id: 'i1',
      label: 'Limpieza de filtros',
      title: null,
      type: 'CHOICE',
      sortOrder: 1,
      itemOrder: 1,
      options: null,
    },
    {
      id: 'i2',
      label: 'Temperatura de impulsión',
      title: null,
      type: 'NUMBER',
      unit: '°C',
      sortOrder: 2,
      itemOrder: 2,
      options: null,
    },
  ],
};

const asset = (id: string, level: number | null, room: string | null) => ({
  id,
  name: room ? `Fancoil · Hab. ${room}` : 'Fancoil almacén',
  spaceId: room ? `r${room}` : null,
  space: room
    ? {
        kind: 'ROOM',
        name: room,
        floor: { level, name: level === 0 ? 'Planta baja' : `Planta ${level}` },
      }
    : null,
});

function setup() {
  const tx = {
    site: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 's1', name: 'Hotel Four Points', customerId: 'cu1' }),
    },
    maintenanceTemplate: { findFirst: jest.fn().mockResolvedValue(TEMPLATE) },
    userCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    asset: {
      findMany: jest
        .fn()
        .mockResolvedValue([asset('a3', null, null), asset('a2', 2, '201'), asset('a1', 1, '102')]),
    },
    workOrder: {
      create: jest.fn().mockResolvedValue({ id: 'wo1', code: 'OT-2026-0007' }),
      update: jest.fn().mockResolvedValue({}),
    },
    maintenanceRound: {
      create: jest.fn().mockResolvedValue({ id: 'round1' }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    roundStop: {
      createManyAndReturn: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve(
          data.map((row: { assetId: string; spaceKind: string; spaceName: string }, i: number) => ({
            id: `stop${i + 1}`,
            assetId: row.assetId,
            spaceKind: row.spaceKind,
            spaceName: row.spaceName,
          })),
        ),
      ),
      count: jest.fn().mockResolvedValue(0),
    },
    maintenanceReport: {
      createManyAndReturn: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve(data.map((_: unknown, i: number) => ({ id: `rep${i + 1}` }))),
        ),
    },
    maintenanceReportItem: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn(),
  };
  tx.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (t: typeof tx) => unknown)(tx)
      : Promise.all(arg as unknown[]),
  );

  const numbering = { next: jest.fn().mockResolvedValue('OT-2026-0007') };
  const service = new RoundsService(tx as never, numbering as never);
  return { tx, numbering, service };
}

const NEW_ROUND = {
  siteId: 's1',
  templateId: 't1',
  category: ' Fancoil ',
  dueAt: DUE,
  technicianId: 'u-tech',
  planId: 'p1',
};

describe('RoundsService', () => {
  describe('createRound()', () => {
    it('crea la orden, una parada por equipo en el orden del edificio y su hoja', async () => {
      const { tx, numbering, service } = setup();

      const created = await service.createRound('c1', NEW_ROUND, null);

      expect(created).toEqual({ id: 'round1', workOrderId: 'wo1', code: 'OT-2026-0007', stops: 3 });
      expect(numbering.next).toHaveBeenCalledWith(tx, 'c1', 'workOrder');
      expect(tx.asset.findMany.mock.calls[0][0].where).toEqual({
        companyId: 'c1',
        siteId: 's1',
        category: { equals: 'Fancoil', mode: 'insensitive' },
        status: { in: ['ACTIVE', 'MAINTENANCE'] },
      });
      expect(tx.workOrder.create.mock.calls[0][0].data).toMatchObject({
        companyId: 'c1',
        customerId: 'cu1',
        siteId: 's1',
        maintenanceTemplateId: 't1',
        code: 'OT-2026-0007',
        title: 'Preventivo Fancoil · Hotel Four Points · 8 nov 2026',
        status: 'ASSIGNED',
        // El día de la ronda a las 8:00 en España (7:00 UTC en invierno).
        scheduledAt: new Date('2026-11-08T07:00:00Z'),
        scheduledFor: new Date('2026-11-08T07:00:00Z'),
        assignedTechnicianId: 'u-tech',
        assignedToUserId: 'u-tech',
      });
      expect(tx.maintenanceRound.create.mock.calls[0][0].data).toEqual({
        companyId: 'c1',
        siteId: 's1',
        workOrderId: 'wo1',
        planId: 'p1',
        templateId: 't1',
        category: 'Fancoil',
        dueAt: DUE,
      });

      // Planta 1, planta 2 y al final el equipo sin habitación.
      const stops = tx.roundStop.createManyAndReturn.mock.calls[0][0].data;
      expect(
        stops.map((s: { assetId: string; sortOrder: number }) => [s.assetId, s.sortOrder]),
      ).toEqual([
        ['a1', 1],
        ['a2', 2],
        ['a3', 3],
      ]);
      expect(stops[0]).toMatchObject({
        floorLevel: 1,
        floorName: 'Planta 1',
        spaceKind: 'ROOM',
        spaceName: '102',
        spaceId: 'r102',
      });

      const reports = tx.maintenanceReport.createManyAndReturn.mock.calls[0][0].data;
      expect(reports[0]).toMatchObject({
        roundStopId: 'stop1',
        assetId: 'a1',
        templateId: 't1',
        title: 'Mantenimiento de fancoil · Hab. 102',
        status: 'DRAFT',
      });
      expect(reports[2].title).toBe('Mantenimiento de fancoil · Sin habitación');

      // 3 hojas x 2 puntos, copiados de la plantilla.
      const items = tx.maintenanceReportItem.createMany.mock.calls[0][0].data;
      expect(items).toHaveLength(6);
      expect(items[1]).toMatchObject({
        reportId: 'rep1',
        templateItemId: 'i2',
        unit: '°C',
        status: 'PENDING',
      });
    });

    it('sin técnico, la orden queda abierta', async () => {
      const { tx, service } = setup();
      await service.createRound('c1', { ...NEW_ROUND, technicianId: null }, null);
      expect(tx.workOrder.create.mock.calls[0][0].data.status).toBe('OPEN');
      expect(tx.userCompany.findFirst).not.toHaveBeenCalled();
    });

    it('explica por qué no se puede crear', async () => {
      const { tx, service } = setup();

      tx.asset.findMany.mockResolvedValueOnce([]);
      await expect(service.createRound('c1', NEW_ROUND, null)).rejects.toThrow(
        'En Hotel Four Points no hay equipos activos de tipo «Fancoil».',
      );

      tx.maintenanceTemplate.findFirst.mockResolvedValueOnce({ ...TEMPLATE, isActive: false });
      await expect(service.createRound('c1', NEW_ROUND, null)).rejects.toThrow(
        'La plantilla «Mantenimiento de fancoil» está archivada. Elige otra.',
      );

      tx.maintenanceTemplate.findFirst.mockResolvedValueOnce({ ...TEMPLATE, items: [] });
      await expect(service.createRound('c1', NEW_ROUND, null)).rejects.toThrow('no tiene puntos');

      tx.userCompany.findFirst.mockResolvedValueOnce(null);
      await expect(service.createRound('c1', NEW_ROUND, null)).rejects.toThrow(
        'El técnico elegido no pertenece a tu empresa o está desactivado.',
      );

      tx.site.findFirst.mockResolvedValueOnce(null);
      await expect(service.createRound('c2', NEW_ROUND, null)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(tx.workOrder.create).not.toHaveBeenCalled();
    });

    it('una ronda suelta necesita una fecha real', async () => {
      const { service } = setup();
      await expect(
        service.createManual(
          'c1',
          { siteId: 's1', templateId: 't1', category: 'Fancoil', dueOn: '2026-02-30' },
          'u-admin',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cerrar, reabrir y cancelar', () => {
    const ADMIN = { userId: 'u-admin', role: 'ADMIN' };

    function withRound(status: string) {
      const ctx = setup();
      ctx.tx.maintenanceRound.findFirst.mockResolvedValue({
        id: 'round1',
        status,
        workOrderId: 'wo1',
        workOrder: { assignedTechnicianId: 'u-tech', assignedToUserId: 'u-tech' },
      });
      // La vista final de la ronda no interesa aquí.
      jest.spyOn(ctx.service, 'get').mockResolvedValue({ id: 'round1' } as never);
      return ctx;
    }

    it('cerrar deja la orden terminada aunque queden habitaciones', async () => {
      const { tx, service } = withRound('IN_PROGRESS');
      await service.close('c1', 'round1', ADMIN, 'Faltan 3 ocupadas');

      expect(tx.maintenanceRound.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'round1' },
        data: { status: 'DONE', closedById: 'u-admin', closeNote: 'Faltan 3 ocupadas' },
      });
      expect(tx.workOrder.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'wo1' },
        data: { status: 'DONE' },
      });
    });

    it('no se cierra dos veces ni se cancela una cerrada', async () => {
      const { service } = withRound('DONE');
      await expect(service.close('c1', 'round1', ADMIN, null)).rejects.toThrow('ya está cerrada');
      await expect(service.cancel('c1', 'round1', ADMIN)).rejects.toThrow('no se cancela');
    });

    it('al reabrir vuelve a como estaba', async () => {
      const { tx, service } = withRound('DONE');
      tx.roundStop.count.mockResolvedValue(12);
      await service.reopen('c1', 'round1', ADMIN);

      expect(tx.maintenanceRound.update.mock.calls[0][0].data).toEqual({
        status: 'IN_PROGRESS',
        closedAt: null,
        closedById: null,
        closeNote: null,
      });
      expect(tx.workOrder.update.mock.calls[0][0].data).toEqual({
        status: 'IN_PROGRESS',
        completedAt: null,
      });
    });

    it('una ronda de otra empresa no se encuentra', async () => {
      const { tx, service } = setup();
      tx.maintenanceRound.findFirst.mockResolvedValue(null);
      await expect(service.close('c2', 'round1', ADMIN, null)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(tx.maintenanceRound.findFirst.mock.calls[0][0].where).toEqual({
        id: 'round1',
        companyId: 'c2',
      });
    });
  });

  describe('get()', () => {
    it('un técnico solo ve sus rondas', async () => {
      const { tx, service } = setup();
      tx.maintenanceRound.findFirst.mockResolvedValue({
        id: 'round1',
        workOrder: { assignedTechnicianId: 'u-tech', assignedToUserId: 'u-tech' },
        stops: [],
      });

      await expect(
        service.get('c1', 'round1', { userId: 'u-otro', role: 'TECHNICIAN' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});