import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

function makePrisma() {
  return {
    workOrder: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('WorkOrdersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: WorkOrdersService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new WorkOrdersService(prisma as any);
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

      await expect(
        service.updateStatus('company-1', 'wo-1', 'NO_EXISTE'),
      ).rejects.toBeInstanceOf(BadRequestException);

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
  });
});
