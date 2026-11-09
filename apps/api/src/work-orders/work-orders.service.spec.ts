import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

function makePrisma() {
  const prisma = {
    workOrder: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Por defecto todo lo que se enlaza es de la empresa; cada test cambia lo que necesite.
    customer: { findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }) },
    site: {
      findFirst: jest.fn().mockResolvedValue({ id: 'site-1', customerId: 'customer-1' }),
    },
    asset: { findFirst: jest.fn().mockResolvedValue({ id: 'asset-1' }) },
    userCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }) },
    // La transacción ejecuta el callback con el mismo cliente simulado.
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

function makeNumbering() {
  return { next: jest.fn().mockResolvedValue('OT-2026-0001') };
}

describe('WorkOrdersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let numbering: ReturnType<typeof makeNumbering>;
  let service: WorkOrdersService;

  beforeEach(() => {
    prisma = makePrisma();
    numbering = makeNumbering();
    service = new WorkOrdersService(prisma as any, numbering as any);
  });

  describe('create() — numeración', () => {
    it('pone el siguiente número de la empresa y no deja elegirlo desde fuera', async () => {
      prisma.workOrder.create.mockImplementation(({ data }) => Promise.resolve(data));

      const created = await service.create(
        'company-1',
        { title: 'Revisión split', code: 'OT-2026-9999' },
        'user-1',
      );

      expect(numbering.next).toHaveBeenCalledWith(prisma, 'company-1', 'workOrder');
      expect(created).toMatchObject({
        code: 'OT-2026-0001',
        companyId: 'company-1',
        createdById: 'user-1',
      });
    });

    it('no crea la orden si no se pudo reservar el número', async () => {
      numbering.next.mockRejectedValue(new Error('sin prefijo'));

      await expect(service.create('company-1', { title: 'Revisión split' })).rejects.toThrow(
        'sin prefijo',
      );
      expect(prisma.workOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('create() / update() — solo datos de la propia empresa', () => {
    it('rechaza un cliente de otra empresa y no gasta número', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company-1', { title: 'Revisión', customerId: 'customer-ajeno' }),
      ).rejects.toThrow('El cliente elegido no existe en tu empresa.');

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'customer-ajeno', companyId: 'company-1' } }),
      );
      expect(numbering.next).not.toHaveBeenCalled();
      expect(prisma.workOrder.create).not.toHaveBeenCalled();
    });

    it('rechaza un site que no es del cliente elegido', async () => {
      prisma.site.findFirst.mockResolvedValue({ id: 'site-2', customerId: 'customer-2' });

      await expect(
        service.create('company-1', {
          title: 'Revisión',
          customerId: 'customer-1',
          siteId: 'site-2',
        }),
      ).rejects.toThrow('El site elegido no es de ese cliente.');
    });

    it('rechaza un técnico que no pertenece a la empresa', async () => {
      prisma.userCompany.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company-1', { title: 'Revisión', assignedToId: 'user-ajeno' }),
      ).rejects.toThrow('El técnico elegido no pertenece a tu empresa o está desactivado.');
    });

    it('crea la orden cuando todo es de la empresa', async () => {
      prisma.workOrder.create.mockImplementation(({ data }) => Promise.resolve(data));

      await expect(
        service.create('company-1', {
          title: 'Revisión',
          customerId: 'customer-1',
          siteId: 'site-1',
          assetId: 'asset-1',
          assignedToId: 'user-1',
        }),
      ).resolves.toMatchObject({ code: 'OT-2026-0001', assignedToUserId: 'user-1' });
    });

    it('al editar, rechaza un equipo de otra empresa', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1', companyId: 'company-1' });
      prisma.asset.findFirst.mockResolvedValue(null);

      await expect(service.update('company-1', 'wo-1', { assetId: 'asset-ajeno' })).rejects.toThrow(
        'El equipo elegido no existe en tu empresa.',
      );
      expect(prisma.workOrder.update).not.toHaveBeenCalled();
    });

    it('al editar solo el site, lo compara con el cliente que ya tenía la orden', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        companyId: 'company-1',
        customerId: 'customer-1',
      });
      prisma.site.findFirst.mockResolvedValue({ id: 'site-9', customerId: 'customer-9' });

      await expect(service.update('company-1', 'wo-1', { siteId: 'site-9' })).rejects.toThrow(
        'El site elegido no es de ese cliente.',
      );
    });
  });

  describe('findOne() — aislamiento multiempresa', () => {
    it('lanza 404 si la orden pertenece a otra empresa (no puede leerla ni por ID directo)', async () => {
      // findFirst con where.companyId filtrado no encuentra nada porque
      // la orden real pertenece a "company-2", no a "company-1".
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne('company-1', 'wo-de-otra-empresa')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'wo-de-otra-empresa',
            companyId: 'company-1',
          }),
        }),
      );
    });

    it('devuelve la orden cuando sí pertenece a la empresa pedida', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1', companyId: 'company-1' });

      const result = await service.findOne('company-1', 'wo-1');
      expect(result).toMatchObject({ id: 'wo-1' });
    });
  });

  describe('updateStatus()', () => {
    it('rechaza un estado que no existe en el enum', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1', companyId: 'company-1' });

      await expect(service.updateStatus('company-1', 'wo-1', 'NO_EXISTE')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.workOrder.update).not.toHaveBeenCalled();
    });

    it('rechaza si falta el estado', async () => {
      await expect(service.updateStatus('company-1', 'wo-1', '')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('actualiza el estado cuando es válido y la orden es de la empresa', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1', companyId: 'company-1' });
      prisma.workOrder.update.mockResolvedValue({ id: 'wo-1', status: 'IN_PROGRESS' });

      await service.updateStatus('company-1', 'wo-1', 'IN_PROGRESS');

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1' },
          data: { status: 'IN_PROGRESS' },
        }),
      );
    });
  });

  describe('acciones semánticas (start/markDone/reopen/cancel)', () => {
    beforeEach(() => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1', companyId: 'company-1' });
      prisma.workOrder.update.mockResolvedValue({ id: 'wo-1' });
    });

    it('start() pone status IN_PROGRESS y sella startedAt', async () => {
      await service.start('company-1', 'wo-1');

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS', startedAt: expect.any(Date) }),
        }),
      );
    });

    it('markDone() pone status DONE y sella completedAt', async () => {
      await service.markDone('company-1', 'wo-1');

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DONE', completedAt: expect.any(Date) }),
        }),
      );
    });

    it('reopen() vuelve a PENDING (primer estado válido de la lista) y limpia completedAt', async () => {
      await service.reopen('company-1', 'wo-1');

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING', completedAt: null }),
        }),
      );
    });

    it('cancel() pone status CANCELLED', async () => {
      await service.cancel('company-1', 'wo-1');

      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('todas las acciones semánticas verifican primero que la orden es de esta empresa', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.start('company-1', 'wo-ajena')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.workOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('assign()', () => {
    it('rechaza si falta el técnico asignado', async () => {
      await expect(service.assign('company-1', 'wo-1', '')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza asignar un técnico de otra empresa', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1', companyId: 'company-1' });
      prisma.userCompany.findFirst.mockResolvedValue(null);

      await expect(service.assign('company-1', 'wo-1', 'user-ajeno')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.userCompany.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-ajeno', companyId: 'company-1' }),
        }),
      );
      expect(prisma.workOrder.update).not.toHaveBeenCalled();
    });

    it('en una ronda no se cambia el técnico desde la orden', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({
        id: 'wo-1',
        companyId: 'company-1',
        round: { id: 'round-1', status: 'OPEN' },
      });

      await expect(service.assign('company-1', 'wo-1', 'user-1')).rejects.toThrow(
        'Los técnicos de una ronda se cambian desde la propia ronda.',
      );
      expect(prisma.workOrder.update).not.toHaveBeenCalled();
    });
  });
});