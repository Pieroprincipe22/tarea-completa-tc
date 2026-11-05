import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { normalizeLocationCode } from './dto/location.dto';
import { InventoryLocationsService } from './inventory-locations.service';

const NOW = new Date('2026-11-05T10:00:00Z');

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'loc-1',
    companyId: 'company-a',
    parentId: null,
    type: 'WAREHOUSE',
    code: 'A',
    name: 'Almacén central',
    assignedUserId: null,
    notes: null,
    sortOrder: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    assignedUser: null,
    _count: { children: 0, stocks: 0 },
    ...overrides,
  };
}

describe('normalizeLocationCode', () => {
  it('pasa a mayúsculas y cambia espacios por guiones', () => {
    expect(normalizeLocationCode('  e1 b2 ')).toBe('E1-B2');
  });
});

describe('InventoryLocationsService', () => {
  let prisma: {
    inventoryLocation: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    inventoryStock: { count: jest.Mock };
    userCompany: { findUnique: jest.Mock };
  };
  let service: InventoryLocationsService;

  beforeEach(() => {
    prisma = {
      inventoryLocation: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-loc' }),
        update: jest.fn().mockResolvedValue({ id: 'loc-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      inventoryStock: { count: jest.fn().mockResolvedValue(0) },
      userCompany: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    service = new InventoryLocationsService(prisma as never);
  });

  describe('list', () => {
    it('filtra por empresa y construye la ruta almacén › estantería › balda', async () => {
      prisma.inventoryLocation.findMany.mockResolvedValue([
        makeRow({ id: 'w', code: 'A', name: 'Almacén central' }),
        makeRow({ id: 'r', parentId: 'w', type: 'RACK', code: 'E1', name: 'Estantería 1' }),
        makeRow({ id: 's', parentId: 'r', type: 'SHELF', code: 'E1-B2', name: 'Balda 2' }),
      ]);

      const items = await service.list('company-a');

      expect(prisma.inventoryLocation.findMany.mock.calls[0][0].where).toEqual({
        companyId: 'company-a',
        isActive: true,
      });
      const shelf = items.find((item) => item.id === 's');
      expect(shelf?.path).toEqual(['Almacén central', 'Estantería 1', 'Balda 2']);
      expect(shelf?.parent).toMatchObject({ id: 'r', code: 'E1' });
    });
  });

  describe('create', () => {
    it('no deja crear una estantería sin almacén', async () => {
      await expect(
        service.create('company-a', { type: 'RACK', code: 'E1', name: 'Estantería 1' }),
      ).rejects.toThrow('Una estantería tiene que estar dentro de un almacén.');
      expect(prisma.inventoryLocation.create).not.toHaveBeenCalled();
    });

    it('no deja meter un almacén dentro de otra ubicación', async () => {
      await expect(
        service.create('company-a', {
          type: 'WAREHOUSE',
          code: 'B',
          name: 'Nave 2',
          parentId: 'w',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no acepta como padre una ubicación de otra empresa', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create('company-a', {
          type: 'SHELF',
          code: 'E1-B1',
          name: 'Balda 1',
          parentId: 'rack-de-otra-empresa',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.inventoryLocation.findFirst.mock.calls[0][0].where).toEqual({
        id: 'rack-de-otra-empresa',
        companyId: 'company-a',
      });
    });

    it('exige que el padre de una balda sea una estantería', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce({
        id: 'w',
        type: 'WAREHOUSE',
        isActive: true,
      });

      await expect(
        service.create('company-a', {
          type: 'SHELF',
          code: 'E1-B1',
          name: 'Balda 1',
          parentId: 'w',
        }),
      ).rejects.toThrow('Una balda tiene que estar dentro de una estantería.');
    });

    it('solo asigna técnicos a furgonetas', async () => {
      await expect(
        service.create('company-a', {
          type: 'WAREHOUSE',
          code: 'A',
          name: 'Almacén',
          assignedUserId: 'user-1',
        }),
      ).rejects.toThrow('Solo se puede asignar un técnico a una furgoneta.');
    });

    it('rechaza asignar una furgoneta a alguien que no es de la empresa', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.create('company-a', {
          type: 'VAN',
          code: 'F1',
          name: 'Furgoneta 1',
          assignedUserId: 'user-de-otra-empresa',
        }),
      ).rejects.toThrow('Ese usuario no pertenece a la empresa.');
      expect(prisma.userCompany.findUnique).toHaveBeenCalledWith({
        where: { userId_companyId: { userId: 'user-de-otra-empresa', companyId: 'company-a' } },
        select: { active: true },
      });
    });

    it('rechaza un código repetido en la misma empresa', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce({ id: 'otra' });

      await expect(
        service.create('company-a', { type: 'WAREHOUSE', code: 'a', name: 'Almacén' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.inventoryLocation.findFirst.mock.calls[0][0].where).toEqual({
        companyId: 'company-a',
        code: 'A',
      });
    });

    it('crea una furgoneta con su técnico y el código en mayúsculas', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ active: true });
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...makeRow({
          id: 'new-loc',
          type: 'VAN',
          code: 'F1',
          name: 'Furgoneta 1',
          assignedUserId: 'user-1',
        }),
        parent: null,
        children: [],
      });

      const created = await service.create('company-a', {
        type: 'VAN',
        code: 'f1',
        name: 'Furgoneta 1',
        assignedUserId: 'user-1',
      });

      expect(prisma.inventoryLocation.create.mock.calls[0][0].data).toMatchObject({
        companyId: 'company-a',
        type: 'VAN',
        code: 'F1',
        parentId: null,
        assignedUserId: 'user-1',
      });
      expect(created.code).toBe('F1');
    });
  });

  describe('update', () => {
    it('no toca ubicaciones de otra empresa', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update('company-a', 'loc-de-otra-empresa', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.inventoryLocation.update).not.toHaveBeenCalled();
    });

    it('no archiva una ubicación que todavía tiene material', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce({
        id: 'loc-1',
        type: 'SHELF',
        parentId: 'r',
        isActive: true,
        parent: { isActive: true },
      });
      prisma.inventoryStock.count.mockResolvedValue(2);

      await expect(service.update('company-a', 'loc-1', { isActive: false })).rejects.toThrow(
        'No se puede archivar: todavía tiene material.',
      );
      expect(prisma.inventoryStock.count).toHaveBeenCalledWith({
        where: { companyId: 'company-a', locationId: 'loc-1', quantity: { gt: 0 } },
      });
      expect(prisma.inventoryLocation.update).not.toHaveBeenCalled();
    });

    it('no archiva una estantería con baldas activas', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce({
        id: 'r',
        type: 'RACK',
        parentId: 'w',
        isActive: true,
        parent: { isActive: true },
      });
      prisma.inventoryLocation.count.mockResolvedValue(3);

      await expect(service.update('company-a', 'r', { isActive: false })).rejects.toThrow(
        'Primero archiva las ubicaciones que tiene dentro.',
      );
    });
  });

  describe('getByCode', () => {
    it('busca el código normalizado dentro de la empresa', async () => {
      prisma.inventoryLocation.findFirst.mockResolvedValueOnce(null);

      await expect(service.getByCode('company-a', 'e1 b2')).rejects.toThrow(
        'No hay ninguna ubicación con el código E1-B2.',
      );
      expect(prisma.inventoryLocation.findFirst.mock.calls[0][0].where).toEqual({
        companyId: 'company-a',
        code: 'E1-B2',
      });
    });
  });
});
