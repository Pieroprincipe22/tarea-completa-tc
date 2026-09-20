import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

function makeTx(overrides: Partial<Record<string, any>> = {}) {
  return {
    company: {
      findUnique: jest.fn().mockResolvedValue({ invoicePrefix: 'HR' }),
    },
    companyCounter: {
      upsert: jest.fn().mockResolvedValue({ value: 1 }),
    },
    invoice: {
      create: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'invoice-1', items: [] }),
    },
    invoiceItem: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>) {
  return {
    maintenanceReport: { findFirst: jest.fn() },
    workOrder: { findFirst: jest.fn() },
    maintenanceReportMaterial: { findMany: jest.fn() },
    invoice: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
  };
}

describe('InvoicesService', () => {
  describe('create()', () => {
    it('rechaza crear factura si la empresa no tiene prefijo de facturación', async () => {
      const tx = makeTx({
        company: { findUnique: jest.fn().mockResolvedValue({ invoicePrefix: null }) },
      });
      const prisma = makePrisma(tx);
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await expect(
        service.create('company-1', {
          taxRate: 21,
          laborAmount: 100,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una factura vacía (sin mano de obra ni líneas)', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await expect(
        service.create('company-1', {
          taxRate: 21,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(tx.invoice.create).not.toHaveBeenCalled();
    });

    it('numera la factura como PREFIJO-AÑO-0001 y calcula bien los totales', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await service.create('company-1', {
        taxRate: 21,
        laborAmount: 100,
        lines: [{ description: 'Material eléctrico', quantity: 2, unitPrice: 25 }],
      } as any);

      const year = new Date().getFullYear();
      expect(tx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: `HR-${year}-0001`,
            laborAmount: 100,
            materialsAmount: 50,
            subtotal: 150,
            taxAmount: 31.5,
            total: 181.5,
          }),
        }),
      );
    });

    it('calcula la mano de obra a partir de horas x tarifa cuando no hay importe directo', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await service.create('company-1', {
        taxRate: 0,
        laborHours: 3,
        laborHourlyRate: 20,
      } as any);

      expect(tx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            laborAmount: 60,
            subtotal: 60,
            total: 60,
          }),
        }),
      );
    });

    it('lanza 404 si el parte de mantenimiento indicado no es de esta empresa', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.maintenanceReport.findFirst.mockResolvedValue(null);
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await expect(
        service.create('company-1', {
          taxRate: 21,
          laborAmount: 50,
          maintenanceReportId: 'report-of-another-company',
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus()', () => {
    it('marca generatedAt/sentAt/paidAt según el nuevo estado', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.invoice.findFirst.mockResolvedValue({ id: 'invoice-1' });
      prisma.invoice.update.mockResolvedValue({ id: 'invoice-1', status: 'PAID' });
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await service.updateStatus('company-1', 'invoice-1', 'PAID');

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            paidAt: expect.any(Date),
          }),
        }),
      );
    });

    it('lanza 404 si la factura no pertenece a la empresa', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      prisma.invoice.findFirst.mockResolvedValue(null);
      const service = new InvoicesService(prisma as any, {} as any, {} as any);

      await expect(
        service.updateStatus('company-1', 'invoice-ajena', 'PAID'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
