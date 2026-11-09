import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RoundWorkService } from './round-work.service';
import { RoundsService } from './rounds.service';

const PIERO = { userId: 'u-piero', role: 'TECHNICIAN' };
const MARC = { userId: 'u-marc', role: 'TECHNICIAN' };
const OTHER = { userId: 'u-otro', role: 'TECHNICIAN' };
const ADMIN = { userId: 'u-admin', role: 'ADMIN' };

const TEAM = {
  assignedTechnicianId: 'u-piero',
  assignedToUserId: 'u-piero',
  technicians: [{ userId: 'u-piero' }, { userId: 'u-marc' }],
};

const ITEMS = [
  {
    id: 'i-filtro',
    label: 'Limpieza de filtros',
    title: null,
    type: 'CHOICE',
    required: true,
    status: 'PENDING',
    value: null,
    valueText: null,
    valueNumber: null,
  },
  {
    id: 'i-impulsion',
    label: 'Temperatura de impulsión',
    title: null,
    type: 'NUMBER',
    required: true,
    status: 'PENDING',
    value: null,
    valueText: null,
    valueNumber: null,
  },
  {
    id: 'i-incidencias',
    label: 'Incidencias observadas',
    title: null,
    type: 'TEXT',
    required: false,
    status: 'PENDING',
    value: null,
    valueText: null,
    valueNumber: null,
  },
  {
    id: 'i-foto',
    label: 'Foto del equipo',
    title: null,
    type: 'PHOTO',
    required: true,
    status: 'PENDING',
    value: null,
    valueText: null,
    valueNumber: null,
  },
];

const FILLED = [
  { id: 'i-filtro', status: 'OK' as const, value: 'Limpio' },
  { id: 'i-impulsion', status: 'OK' as const, value: '21,5' },
];

function setup(roundStatus = 'IN_PROGRESS', storedSavedAt: Date | null = null) {
  const prisma = {
    roundStop: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'stop-204',
        savedAt: storedSavedAt,
        round: { id: 'round1', status: roundStatus, workOrderId: 'wo1', workOrder: TEAM },
        report: { id: 'rep-204', items: ITEMS },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    maintenanceRound: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    workOrder: { update: jest.fn().mockResolvedValue({}) },
    maintenanceReportItem: { update: jest.fn().mockResolvedValue({}) },
    maintenanceReport: { update: jest.fn().mockResolvedValue({}) },
    roundStopPart: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

  const real = new RoundsService(prisma as never, {} as never);
  const rounds = {
    findForChange: jest.fn().mockResolvedValue({
      id: 'round1',
      status: roundStatus,
      workOrderId: 'wo1',
      workOrder: { status: 'ASSIGNED', ...TEAM },
    }),
    assertCanSee: real.assertCanSee.bind(real),
    get: jest.fn().mockResolvedValue({ id: 'round1' }),
    getStop: jest.fn().mockResolvedValue({ id: 'stop-204' }),
  };
  const service = new RoundWorkService(prisma as never, rounds as never);
  return { prisma, rounds, service };
}

const NOW = new Date('2026-11-05T10:00:00Z');
const save = (
  service: RoundWorkService,
  body: Record<string, unknown>,
  viewer: { userId: string; role: string } = PIERO,
) =>
  service.saveStop(
    'c1',
    'round1',
    'stop-204',
    { savedAt: '2026-11-05T09:30:00Z', ...body } as never,
    viewer,
    NOW,
  );

describe('RoundWorkService', () => {
  describe('start()', () => {
    it('el técnico la inicia: ronda y orden en curso', async () => {
      const { prisma, service } = setup('OPEN');
      await service.start('c1', 'round1', MARC);
      expect(prisma.maintenanceRound.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'round1', status: 'OPEN' },
        data: { status: 'IN_PROGRESS' },
      });
      expect(prisma.workOrder.update.mock.calls[0][0].data).toMatchObject({
        status: 'IN_PROGRESS',
      });
    });

    it('si ya estaba en curso no cambia nada', async () => {
      const { prisma, service } = setup('IN_PROGRESS');
      await service.start('c1', 'round1', PIERO);
      expect(prisma.maintenanceRound.updateMany).not.toHaveBeenCalled();
    });

    it('un técnico que no va a la ronda no la inicia', async () => {
      const { service } = setup('OPEN');
      await expect(service.start('c1', 'round1', OTHER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('una ronda enviada no se vuelve a iniciar', async () => {
      const { service } = setup('SUBMITTED');
      await expect(service.start('c1', 'round1', PIERO)).rejects.toThrow('ya está enviada');
    });
  });

  describe('saveStop()', () => {
    it('guarda la habitación hecha con sus puntos y la temperatura como número', async () => {
      const { prisma, service } = setup();
      const result = await save(service, { status: 'DONE', items: FILLED });

      expect(result).toMatchObject({ stale: false });
      expect(prisma.roundStop.updateMany.mock.calls[0][0]).toEqual({
        where: {
          id: 'stop-204',
          OR: [{ savedAt: null }, { savedAt: { lt: new Date('2026-11-05T09:30:00Z') } }],
        },
        data: {
          status: 'DONE',
          noAccessReason: null,
          urgent: false,
          hasIssue: false,
          savedAt: new Date('2026-11-05T09:30:00Z'),
          doneAt: new Date('2026-11-05T09:30:00Z'),
          doneById: 'u-piero',
        },
      });
      expect(prisma.maintenanceReportItem.update).toHaveBeenCalledWith({
        where: { id: 'i-impulsion' },
        data: { status: 'OK', value: '21.5', valueText: null, valueNumber: 21.5, notes: null },
      });
      expect(prisma.maintenanceReport.update.mock.calls[0][0].data).toMatchObject({
        status: 'COMPLETED',
        completedByUserId: 'u-piero',
      });
    });

    it('no se da por hecha si falta un punto obligatorio', async () => {
      const { prisma, service } = setup();
      await expect(save(service, { status: 'DONE', items: [FILLED[0]] })).rejects.toThrow(
        'Falta rellenar: Temperatura de impulsión.',
      );
      expect(prisma.roundStop.updateMany).not.toHaveBeenCalled();
    });

    it('una temperatura que no es un número se rechaza', async () => {
      const { service } = setup();
      await expect(
        save(service, {
          status: 'DONE',
          items: [FILLED[0], { id: 'i-impulsion', status: 'OK', value: '21 grados' }],
        }),
      ).rejects.toThrow('«Temperatura de impulsión» tiene que ser un número.');
    });

    it('sin acceso hay que decir por qué', async () => {
      const { service } = setup();
      await expect(save(service, { status: 'NO_ACCESS' })).rejects.toThrow(
        'Pon por qué no se pudo entrar.',
      );
    });

    it('la incidencia escrita o urgente la pone en rojo, con los recambios', async () => {
      const { prisma, service } = setup();
      await save(service, {
        status: 'DONE',
        urgent: true,
        items: [...FILLED, { id: 'i-incidencias', status: 'OK', value: 'Motor con ruido en V3' }],
        parts: [{ name: 'Motor ventilador', quantity: 1 }],
      });
      expect(prisma.roundStop.updateMany.mock.calls[0][0].data).toMatchObject({
        urgent: true,
        hasIssue: true,
      });
      expect(prisma.roundStopPart.createMany).toHaveBeenCalledWith({
        data: [
          {
            companyId: 'c1',
            stopId: 'stop-204',
            name: 'Motor ventilador',
            quantity: 1,
            unit: null,
            sortOrder: 1,
          },
        ],
      });
    });

    it('un cambio más viejo que llega tarde no pisa al nuevo', async () => {
      const { prisma, service } = setup('IN_PROGRESS', new Date('2026-11-05T09:45:00Z'));
      const result = await save(service, { status: 'DONE', items: FILLED });
      expect(result).toMatchObject({ stale: true });
      expect(prisma.roundStop.updateMany).not.toHaveBeenCalled();
    });

    it('si otro técnico guardó a la vez algo más nuevo, tampoco pisa', async () => {
      const { prisma, service } = setup();
      prisma.roundStop.updateMany.mockResolvedValue({ count: 0 });
      const result = await save(service, { status: 'DONE', items: FILLED }, MARC);
      expect(result).toMatchObject({ stale: true });
      expect(prisma.maintenanceReportItem.update).not.toHaveBeenCalled();
    });

    it('si la ronda no estaba iniciada, guardar la inicia', async () => {
      const { prisma, service } = setup('OPEN');
      await save(service, { status: 'DONE', items: FILLED });
      expect(prisma.maintenanceRound.updateMany.mock.calls[0][0].data).toMatchObject({
        status: 'IN_PROGRESS',
      });
    });

    it('enviada al encargado: el técnico ya no la cambia, el encargado sí', async () => {
      const { service } = setup('SUBMITTED');
      await expect(save(service, { status: 'DONE', items: FILLED })).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(save(service, { status: 'DONE', items: FILLED }, ADMIN)).resolves.toMatchObject({
        stale: false,
      });
    });
  });

  describe('submit()', () => {
    it('no se envía mientras quede algo sin hacer o sin acceso', async () => {
      const { prisma, service } = setup();
      prisma.roundStop.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { _all: 2 } },
        { status: 'NO_ACCESS', _count: { _all: 1 } },
      ]);
      await expect(service.submit('c1', 'round1', PIERO)).rejects.toThrow(
        'Faltan 3 equipos (2 sin hacer y 1 sin acceso). La ronda se envía cuando estén todos hechos.',
      );
      expect(prisma.maintenanceRound.updateMany).not.toHaveBeenCalled();
    });

    it('si solo queda una, lo dice en singular', async () => {
      const { service, prisma } = setup();
      prisma.roundStop.groupBy.mockResolvedValue([{ status: 'NO_ACCESS', _count: { _all: 1 } }]);
      await expect(service.submit('c1', 'round1', PIERO)).rejects.toThrow(
        'Falta 1 equipo (1 sin acceso).',
      );
    });

    it('con todo hecho pasa a revisión y la orden a pendiente de revisar', async () => {
      const { prisma, service } = setup();
      await service.submit('c1', 'round1', MARC);
      expect(prisma.maintenanceRound.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'round1', status: 'IN_PROGRESS' },
        data: { status: 'SUBMITTED', submittedById: 'u-marc' },
      });
      expect(prisma.workOrder.update.mock.calls[0][0].data).toEqual({ status: 'PENDING' });
    });

    it('sin iniciar no se envía', async () => {
      const { service } = setup('OPEN');
      await expect(service.submit('c1', 'round1', PIERO)).rejects.toThrow(
        'Primero inicia la ronda',
      );
    });
  });
});