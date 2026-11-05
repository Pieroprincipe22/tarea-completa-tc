import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MaintenancePlansService } from './maintenance-plans.service';

// 4 de noviembre de 2026 por la tarde, en España.
const NOW = new Date('2026-11-04T17:00:00Z');
const day = (text: string) => new Date(`${text}T00:00:00Z`);

const PLAN_ROW = {
  id: 'p1',
  companyId: 'c1',
  siteId: 's1',
  templateId: 't1',
  category: 'Fancoil',
  name: 'Fancoil · cada 3 meses',
  assignedTechnicianId: 'u-tech',
  isActive: true,
  startsOn: day('2026-11-08'),
  unit: 'MONTH',
  every: 3,
  nextDueAt: day('2026-11-08'),
  leadDays: 7,
  lastError: null,
  lastErrorAt: null,
  template: { id: 't1', name: 'Mantenimiento de fancoil', title: null, isActive: true },
  assignedTechnician: { id: 'u-tech', name: 'Piero' },
};

function setup() {
  const prisma = {
    site: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 's1', name: 'Hotel Four Points', customer: null }),
    },
    maintenanceTemplate: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 't1', name: 'Fancoil', title: null, isActive: true }),
    },
    maintenancePlan: {
      create: jest.fn().mockResolvedValue({ id: 'p1' }),
      findFirst: jest.fn().mockResolvedValue(PLAN_ROW),
      findUnique: jest.fn().mockResolvedValue(PLAN_ROW),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({}),
    },
    maintenanceRound: { findFirst: jest.fn().mockResolvedValue(null) },
    asset: {
      groupBy: jest.fn().mockResolvedValue([{ category: 'Fancoil', _count: { _all: 165 } }]),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));

  const rounds = {
    createRound: jest
      .fn()
      .mockResolvedValue({ id: 'round1', workOrderId: 'wo1', code: 'OT-2026-0001', stops: 165 }),
    assertMember: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue({ items: [] }),
  };
  const service = new MaintenancePlansService(prisma as never, rounds as never);
  return { prisma, rounds, service };
}

describe('MaintenancePlansService', () => {
  describe('create()', () => {
    it('calcula la próxima ronda y le pone nombre', async () => {
      const { prisma, service } = setup();
      // Tras crearlo no toca todavía ninguna ronda.
      prisma.maintenancePlan.findUnique.mockResolvedValue({
        ...PLAN_ROW,
        nextDueAt: day('2026-12-01'),
      });

      await service.create(
        'c1',
        's1',
        {
          templateId: 't1',
          category: ' Fancoil ',
          every: 3,
          unit: 'MONTH',
          startsOn: '2026-09-01',
        },
        NOW,
      );

      // La última se hizo el 1 de septiembre: la próxima es el 1 de diciembre.
      expect(prisma.maintenancePlan.create.mock.calls[0][0].data).toEqual({
        companyId: 'c1',
        siteId: 's1',
        templateId: 't1',
        category: 'Fancoil',
        name: 'Fancoil · cada 3 meses',
        every: 3,
        unit: 'MONTH',
        startsOn: day('2026-09-01'),
        nextDueAt: day('2026-12-01'),
        leadDays: 7,
        assignedTechnicianId: null,
      });
    });

    it('rechaza frecuencias imposibles y plantillas archivadas', async () => {
      const { prisma, service } = setup();
      await expect(
        service.create('c1', 's1', {
          templateId: 't1',
          category: 'Fancoil',
          every: 30,
          unit: 'MONTH',
          startsOn: '2026-11-08',
        }),
      ).rejects.toThrow('Como mucho cada 24 meses.');

      prisma.maintenanceTemplate.findFirst.mockResolvedValue({
        id: 't1',
        name: 'Vieja',
        title: null,
        isActive: false,
      });
      await expect(
        service.create('c1', 's1', {
          templateId: 't1',
          category: 'Fancoil',
          every: 1,
          unit: 'MONTH',
          startsOn: '2026-11-08',
        }),
      ).rejects.toThrow('La plantilla «Vieja» está archivada. Elige otra.');
      expect(prisma.maintenancePlan.create).not.toHaveBeenCalled();
    });
  });

  describe('materializePlan()', () => {
    it('crea la ronda que toca y avanza el plan', async () => {
      const { prisma, rounds, service } = setup();
      prisma.maintenancePlan.findUnique
        .mockResolvedValueOnce(PLAN_ROW)
        .mockResolvedValueOnce({ ...PLAN_ROW, nextDueAt: day('2027-02-08') });

      expect(await service.materializePlan('p1', new Date('2026-11-02T10:00:00Z'))).toBe(1);

      expect(prisma.maintenancePlan.updateMany.mock.calls[0][0]).toEqual({
        where: { id: 'p1', isActive: true, nextDueAt: day('2026-11-08') },
        data: { nextDueAt: day('2027-02-08'), lastError: null, lastErrorAt: null },
      });
      expect(rounds.createRound).toHaveBeenCalledWith(
        'c1',
        {
          siteId: 's1',
          templateId: 't1',
          category: 'Fancoil',
          dueAt: day('2026-11-08'),
          technicianId: 'u-tech',
          planId: 'p1',
        },
        null,
        prisma,
      );
    });

    it('antes de tiempo no hace nada', async () => {
      const { rounds, service } = setup();
      expect(await service.materializePlan('p1', new Date('2026-10-25T10:00:00Z'))).toBe(0);
      expect(rounds.createRound).not.toHaveBeenCalled();
    });

    it('si otra petición ya la creó, no la repite', async () => {
      const { prisma, rounds, service } = setup();
      prisma.maintenancePlan.updateMany.mockResolvedValue({ count: 0 });
      expect(await service.materializePlan('p1', NOW)).toBe(0);
      expect(rounds.createRound).not.toHaveBeenCalled();
    });

    it('si no se puede crear, guarda el motivo en el plan', async () => {
      const { prisma, rounds, service } = setup();
      rounds.createRound.mockRejectedValue(
        new BadRequestException('En Hotel Four Points no hay equipos activos de tipo «Fancoil».'),
      );

      expect(await service.materializePlan('p1', NOW)).toBe(0);
      expect(prisma.maintenancePlan.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          lastError:
            'Ronda del 8 nov 2026: En Hotel Four Points no hay equipos activos de tipo «Fancoil».',
          lastErrorAt: NOW,
        },
      });
    });

    it('si la ronda de esa fecha ya existía, solo avanza el plan', async () => {
      const { prisma, rounds, service } = setup();
      prisma.maintenancePlan.findUnique
        .mockResolvedValueOnce(PLAN_ROW)
        .mockResolvedValueOnce({ ...PLAN_ROW, nextDueAt: day('2027-02-08') });
      rounds.createRound.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      expect(await service.materializePlan('p1', NOW)).toBe(0);
      expect(prisma.maintenancePlan.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'p1', nextDueAt: day('2026-11-08') },
        data: { nextDueAt: day('2027-02-08') },
      });
      expect(prisma.maintenancePlan.update).not.toHaveBeenCalled();
    });

    it('un plan en pausa no crea rondas', async () => {
      const { prisma, rounds, service } = setup();
      prisma.maintenancePlan.findUnique.mockResolvedValue({ ...PLAN_ROW, isActive: false });
      expect(await service.materializePlan('p1', NOW)).toBe(0);
      expect(rounds.createRound).not.toHaveBeenCalled();
    });
  });

  describe('runNow()', () => {
    it('crea ya la próxima ronda', async () => {
      const { prisma, rounds, service } = setup();
      await service.runNow('c1', 's1', 'p1', 'u-admin');
      expect(prisma.maintenancePlan.updateMany.mock.calls[0][0].data.nextDueAt).toEqual(
        day('2027-02-08'),
      );
      expect(rounds.createRound.mock.calls[0][2]).toBe('u-admin');
    });

    it('no con el plan en pausa', async () => {
      const { prisma, service } = setup();
      prisma.maintenancePlan.findFirst.mockResolvedValue({ ...PLAN_ROW, isActive: false });
      await expect(service.runNow('c1', 's1', 'p1', 'u-admin')).rejects.toThrow('en pausa');
    });
  });
});