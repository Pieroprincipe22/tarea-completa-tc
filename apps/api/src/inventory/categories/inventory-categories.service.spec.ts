import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryCategoriesService } from './inventory-categories.service';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    name: 'Fijaciones',
    sortOrder: 10,
    isActive: true,
    createdAt: new Date('2026-11-05T10:00:00Z'),
    updatedAt: new Date('2026-11-05T10:00:00Z'),
    ...overrides,
  };
}

describe('InventoryCategoriesService', () => {
  let prisma: {
    inventoryCategory: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
  };
  let service: InventoryCategoriesService;

  beforeEach(() => {
    prisma = {
      inventoryCategory: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 20 } }),
      },
    };
    service = new InventoryCategoriesService(prisma as never);
  });

  it('list filtra por la empresa del tenant y oculta las archivadas', async () => {
    prisma.inventoryCategory.findMany.mockResolvedValue([makeRow({ _count: { parts: 3 } })]);

    const items = await service.list('company-a');

    expect(prisma.inventoryCategory.findMany.mock.calls[0][0].where).toEqual({
      companyId: 'company-a',
      isActive: true,
    });
    expect(items[0]).toMatchObject({ id: 'cat-1', name: 'Fijaciones', partsCount: 3 });
  });

  it('create rechaza un nombre repetido sin distinguir mayúsculas', async () => {
    prisma.inventoryCategory.findFirst.mockResolvedValue({ id: 'cat-1' });

    await expect(service.create('company-a', { name: 'fijaciones' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.inventoryCategory.findFirst.mock.calls[0][0].where).toMatchObject({
      companyId: 'company-a',
      name: { equals: 'fijaciones', mode: 'insensitive' },
    });
    expect(prisma.inventoryCategory.create).not.toHaveBeenCalled();
  });

  it('create pone la categoría al final si no se indica orden', async () => {
    prisma.inventoryCategory.create.mockResolvedValue(makeRow({ name: 'Gases', sortOrder: 30 }));

    await service.create('company-a', { name: 'Gases' });

    expect(prisma.inventoryCategory.create).toHaveBeenCalledWith({
      data: { companyId: 'company-a', name: 'Gases', sortOrder: 30 },
    });
  });

  it('update no toca categorías de otra empresa', async () => {
    prisma.inventoryCategory.findFirst.mockResolvedValue(null);

    await expect(
      service.update('company-a', 'cat-de-otra-empresa', { name: 'Nuevo nombre' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.inventoryCategory.findFirst.mock.calls[0][0].where).toEqual({
      id: 'cat-de-otra-empresa',
      companyId: 'company-a',
    });
    expect(prisma.inventoryCategory.update).not.toHaveBeenCalled();
  });

  it('createDefaults solo crea las categorías iniciales que faltan', async () => {
    prisma.inventoryCategory.findMany
      .mockResolvedValueOnce([{ name: 'fijaciones' }, { name: 'Frigorifico' }])
      .mockResolvedValueOnce([]);

    const result = await service.createDefaults('company-a');

    const created = prisma.inventoryCategory.createMany.mock.calls[0][0].data as Array<{
      companyId: string;
      name: string;
    }>;
    const names = created.map((row) => row.name);

    expect(result.created).toBe(6);
    expect(names).not.toContain('Fijaciones');
    expect(names).not.toContain('Frigorífico');
    expect(names).toContain('Protección eléctrica');
    expect(created.every((row) => row.companyId === 'company-a')).toBe(true);
  });
});
