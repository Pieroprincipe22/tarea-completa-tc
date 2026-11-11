import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { PlanLimitsService } from '../common/plan-limits.service';
import { PrismaService } from '../database/prisma.service';
import { MaintenanceTemplatesService } from '../maintenance-templates/maintenance-templates.service';
import { MaintenancePlansService } from '../rounds/maintenance-plans.service';
import { RoundsService } from '../rounds/rounds.service';
import { MaintenanceSetupDto } from './dto/maintenance-setup.dto';
import { MaintenanceSetupService } from './maintenance-setup.service';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const SITE = { id: 's1', name: 'Four Points', customerId: 'cu1' };

// Un hotel con la planta 1 y dos habitaciones, sin máquinas.
function setup() {
  const prisma = {
    site: { findFirst: jest.fn().mockResolvedValue(SITE) },
    floor: { findMany: jest.fn().mockResolvedValue([{ level: 1, name: 'Planta 1' }]) },
    space: {
      findMany: jest.fn().mockResolvedValue([
        { kind: 'ROOM', name: '101', floor: { level: 1 } },
        { kind: 'ROOM', name: '102', floor: { level: 1 } },
      ]),
    },
    asset: { findMany: jest.fn().mockResolvedValue([]) },
    maintenancePlan: { findMany: jest.fn().mockResolvedValue([]) },
    maintenanceTemplate: { findFirst: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'u-piero', name: 'Piero' }]) },
    $transaction: jest.fn(),
  };
  const planLimits = { assertAssetCapacity: jest.fn().mockResolvedValue(undefined) };
  const templates = {
    checkItems: jest.fn(),
    freeName: jest.fn((_: string, base: string) => Promise.resolve(base)),
  };
  const plans = { insertPlan: jest.fn(), materializePlan: jest.fn() };
  const rounds = { assertTeam: jest.fn((_: unknown, __: string, ids: string[]) => ids) };

  const service = new MaintenanceSetupService(
    prisma as unknown as PrismaService,
    planLimits as unknown as PlanLimitsService,
    templates as unknown as MaintenanceTemplatesService,
    plans as unknown as MaintenancePlansService,
    rounds as unknown as RoundsService,
  );
  return { service, prisma, planLimits, templates, rounds };
}

const FANCOIL_PLAN = {
  category: 'Fancoil',
  template: {
    name: 'Mantenimiento de fancoil',
    items: [{ label: 'Limpieza de filtros', type: 'CHECKLIST' as const }],
  },
  every: 3,
  unit: 'MONTH' as const,
  startsOn: '2026-11-12',
  technicianIds: ['u-piero'],
};

describe('MaintenanceSetupService.setup', () => {
  it('con dryRun cuenta lo que haría y no guarda nada', async () => {
    const { service, prisma, planLimits, rounds } = setup();

    const result = await service.setup(
      'c1',
      's1',
      { dryRun: true, machines: [{ category: 'Fancoil', perRoom: 1 }], plans: [FANCOIL_PLAN] },
      NOW,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(planLimits.assertAssetCapacity).toHaveBeenCalledWith('c1', 2);
    expect(rounds.assertTeam).toHaveBeenCalledWith(prisma, 'c1', ['u-piero']);
    expect(result).toMatchObject({
      dryRun: true,
      machinesAdded: 2,
      machines: [{ category: 'Fancoil', existing: 0, adding: 2 }],
      plans: [
        {
          id: null,
          name: 'Fancoil · cada 3 meses',
          template: { id: null, name: 'Mantenimiento de fancoil', isNew: true },
          technicians: [{ id: 'u-piero', name: 'Piero' }],
        },
      ],
    });
  });

  it('no deja un segundo plan del mismo tipo en el hotel', async () => {
    const { service, prisma } = setup();
    prisma.maintenancePlan.findMany.mockResolvedValue([{ category: 'FANCOIL' }]);

    const attempt = service.setup(
      'c1',
      's1',
      { machines: [{ category: 'Fancoil', perRoom: 1 }], plans: [FANCOIL_PLAN] },
      NOW,
    );
    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow('Four Points ya tiene un plan para «Fancoil».');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cada plan necesita su hoja', async () => {
    const { service } = setup();
    const withoutSheet = { ...FANCOIL_PLAN, template: undefined };

    await expect(
      service.setup(
        'c1',
        's1',
        { machines: [{ category: 'Fancoil', perRoom: 1 }], plans: [withoutSheet] },
        NOW,
      ),
    ).rejects.toThrow('Elige la hoja de revisión de «Fancoil».');
  });

  it('no deja usar una hoja archivada', async () => {
    const { service, prisma } = setup();
    prisma.maintenanceTemplate.findFirst.mockResolvedValue({
      id: 't1',
      name: 'Fancoil viejo',
      title: null,
      isActive: false,
    });

    await expect(
      service.setup(
        'c1',
        's1',
        {
          machines: [{ category: 'Fancoil', perRoom: 1 }],
          plans: [{ ...FANCOIL_PLAN, template: undefined, templateId: 't1' }],
        },
        NOW,
      ),
    ).rejects.toThrow('La hoja «Fancoil viejo» está archivada. Elige otra para «Fancoil».');
  });

  it('dice qué hoja tiene el problema', async () => {
    const { service, templates } = setup();
    templates.checkItems.mockImplementation(() => {
      throw new BadRequestException('En «Desagüe» pon al menos 2 opciones.');
    });

    await expect(
      service.setup(
        'c1',
        's1',
        { machines: [{ category: 'Fancoil', perRoom: 1 }], plans: [FANCOIL_PLAN] },
        NOW,
      ),
    ).rejects.toThrow('Hoja de «Fancoil»: En «Desagüe» pon al menos 2 opciones.');
  });

  it('explica lo que no cuadra antes de mirar nada más', async () => {
    const { service, planLimits } = setup();

    await expect(
      service.setup(
        'c1',
        's1',
        {
          machines: [
            { category: 'Enfriadora', zones: [{ name: 'Cubierta', level: 2, quantity: 1 }] },
          ],
        },
        NOW,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(planLimits.assertAssetCapacity).not.toHaveBeenCalled();
  });

  it('un hotel de otra empresa no existe', async () => {
    const { service, prisma } = setup();
    prisma.site.findFirst.mockResolvedValue(null);

    await expect(service.setup('c2', 's1', {}, NOW)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.site.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1', companyId: 'c2' } }),
    );
  });
});

// Junta los mensajes de error, también los anidados.
function collect(errors: ValidationError[]): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...collect(e.children ?? []),
  ]);
}

describe('MaintenanceSetupDto', () => {
  async function check(body: Record<string, unknown>) {
    const dto = plainToInstance(MaintenanceSetupDto, body);
    return collect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true }));
  }

  it('acepta el Four Points', async () => {
    expect(
      await check({
        building: { floors: [{ level: 1, rooms: 10 }] },
        zones: [{ name: 'Cubierta', level: 2, floorName: 'Cubierta' }],
        machines: [{ category: 'Fancoil', perRoom: 1, brand: '' }],
        plans: [FANCOIL_PLAN],
      }),
    ).toEqual([]);
  });

  it('valida también lo de dentro, en español', async () => {
    expect(
      await check({
        building: { floors: [{ level: 0, rooms: 120 }] },
        machines: [{ category: 'Fancoil', perRoom: 9 }],
        plans: [{ ...FANCOIL_PLAN, template: { name: '', items: [] }, startsOn: '12/11/2026' }],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Las habitaciones van de la planta 1 en adelante.',
        'Como mucho 99 habitaciones por planta.',
        'Como mucho 4 máquinas iguales por habitación.',
        'La plantilla necesita un nombre.',
        'La plantilla necesita al menos un punto.',
        'La fecha de la primera ronda no es válida.',
      ]),
    );
  });

  it('rechaza campos que no existen', async () => {
    expect((await check({ companyId: 'otra' })).length).toBeGreaterThan(0);
  });
});