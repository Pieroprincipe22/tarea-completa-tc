import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceTemplatesService } from './maintenance-templates.service';

const SPLIT = {
  id: 't1',
  companyId: 'c1',
  name: 'Mantenimiento split',
  title: 'Mantenimiento split',
  category: 'Split',
  description: 'Revisión trimestral',
  isActive: true,
  items: [
    {
      id: 'i1',
      label: 'Limpiar filtros',
      title: 'Limpiar filtros',
      description: null,
      type: 'CHECKLIST',
      valueType: 'CHECKLIST',
      required: true,
      sortOrder: 1,
      itemOrder: 1,
      unit: null,
      helpText: null,
      placeholder: null,
      section: 'Unidad interior',
      minValue: null,
      maxValue: null,
    },
    {
      id: 'i2',
      label: 'Presión de alta',
      title: 'Presión de alta',
      description: null,
      type: 'NUMBER',
      valueType: 'NUMBER',
      required: true,
      sortOrder: 2,
      itemOrder: 2,
      unit: 'bar',
      helpText: 'Con el equipo en frío',
      placeholder: null,
      section: 'Unidad exterior',
      minValue: 18,
      maxValue: 28,
    },
  ],
};

function setup() {
  const prisma = {
    maintenanceTemplate: {
      findMany: jest.fn().mockResolvedValue([SPLIT]),
      findFirst: jest.fn().mockResolvedValue(SPLIT),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...SPLIT, ...data })),
    },
  };
  const service = new MaintenanceTemplatesService(prisma as never);
  return { prisma, service };
}

describe('MaintenanceTemplatesService', () => {
  it('crea la plantilla con los puntos en el orden en que llegan', async () => {
    const { prisma, service } = setup();

    await service.create('c1', {
      name: 'Mantenimiento split',
      category: 'Split',
      items: [
        { label: 'Limpiar filtros', type: 'CHECKLIST', section: 'Unidad interior', required: true },
        {
          label: 'Presión de alta',
          type: 'NUMBER',
          section: 'Unidad exterior',
          unit: 'bar',
          minValue: 18,
          maxValue: 28,
        },
      ],
    });

    const data = prisma.maintenanceTemplate.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      companyId: 'c1',
      name: 'Mantenimiento split',
      title: 'Mantenimiento split',
      category: 'Split',
      isActive: true,
    });
    expect(data.items.create).toEqual([
      expect.objectContaining({
        label: 'Limpiar filtros',
        type: 'CHECKLIST',
        section: 'Unidad interior',
        required: true,
        sortOrder: 1,
      }),
      expect.objectContaining({
        label: 'Presión de alta',
        type: 'NUMBER',
        unit: 'bar',
        minValue: 18,
        maxValue: 28,
        required: false,
        sortOrder: 2,
      }),
    ]);
  });

  it('solo las mediciones guardan unidad y rango', async () => {
    const { prisma, service } = setup();

    await service.create('c1', {
      name: 'Revisión',
      items: [
        { label: 'Estado general', type: 'CHECKLIST', unit: 'bar', minValue: 1, maxValue: 2 },
      ],
    });

    const [row] = prisma.maintenanceTemplate.create.mock.calls[0][0].data.items.create;
    expect(row).toMatchObject({ unit: null, minValue: null, maxValue: null });
  });

  it('rechaza un rango con el mínimo mayor que el máximo y dice en qué punto', async () => {
    const { prisma, service } = setup();

    const attempt = service.create('c1', {
      name: 'Revisión',
      items: [{ label: 'Presión de baja', type: 'NUMBER', minValue: 9.5, maxValue: 4 }],
    });

    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toThrow(
      'En «Presión de baja» el mínimo (9,5) es mayor que el máximo (4).',
    );
    expect(prisma.maintenanceTemplate.create).not.toHaveBeenCalled();
  });

  it('al editar con puntos nuevos, sustituye todos los anteriores', async () => {
    const { prisma, service } = setup();

    await service.update('c1', 't1', {
      name: 'Split pared',
      items: [{ label: 'Revisar drenaje', type: 'CHECKLIST' }],
    });

    const { where, data } = prisma.maintenanceTemplate.update.mock.calls[0][0];
    expect(where).toEqual({ id: 't1' });
    expect(data).toMatchObject({ name: 'Split pared', title: 'Split pared' });
    expect(data.items.deleteMany).toEqual({});
    expect(data.items.create).toHaveLength(1);
  });

  it('al editar solo el nombre, no toca los puntos', async () => {
    const { prisma, service } = setup();

    await service.update('c1', 't1', { name: 'Split pared' });

    expect(prisma.maintenanceTemplate.update.mock.calls[0][0].data).not.toHaveProperty('items');
  });

  it('duplica la plantilla con todos sus puntos', async () => {
    const { prisma, service } = setup();

    await service.duplicate('c1', 't1');

    const data = prisma.maintenanceTemplate.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ companyId: 'c1', name: 'Mantenimiento split (copia)' });
    expect(data.items.create).toEqual([
      expect.objectContaining({ label: 'Limpiar filtros', sortOrder: 1 }),
      expect.objectContaining({
        label: 'Presión de alta',
        minValue: 18,
        maxValue: 28,
        sortOrder: 2,
      }),
    ]);
  });

  it('no deja ver ni cambiar plantillas de otra empresa', async () => {
    const { prisma, service } = setup();
    prisma.maintenanceTemplate.findFirst.mockResolvedValue(null);

    await expect(service.findOne('c2', 't1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update('c2', 't1', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.maintenanceTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1', companyId: 'c2' } }),
    );
    expect(prisma.maintenanceTemplate.update).not.toHaveBeenCalled();
  });

  it('archivar no borra: solo la deja inactiva', async () => {
    const { prisma, service } = setup();

    await service.archive('c1', 't1');

    expect(prisma.maintenanceTemplate.update.mock.calls[0][0].data).toEqual({ isActive: false });
  });

  it('por defecto lista solo las activas', async () => {
    const { prisma, service } = setup();

    await service.findAll('c1');
    expect(prisma.maintenanceTemplate.findMany.mock.calls[0][0].where).toEqual({
      companyId: 'c1',
      isActive: true,
    });

    await service.findAll('c1', true);
    expect(prisma.maintenanceTemplate.findMany.mock.calls[1][0].where).toEqual({ companyId: 'c1' });
  });
});