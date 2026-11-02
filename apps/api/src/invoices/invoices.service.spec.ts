import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NumberingService, documentYear } from '../numbering/numbering.service';
import { InvoicesService } from './invoices.service';

const PREFIXES = { workOrderPrefix: 'OT', quotePrefix: 'P', invoicePrefix: 'HR' };

function makeTx(overrides: Partial<Record<string, any>> = {}) {
  return {
    company: {
      findUnique: jest.fn().mockResolvedValue(PREFIXES),
    },
    companyCounter: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({ value: 1 }),
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

// La numeración real (no simulada) trabajando sobre la transacción simulada.
function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new InvoicesService(prisma as any, {} as any, {} as any, new NumberingService({} as any));
}

describe('InvoicesService', () => {
  describe('create()', () => {
    it('rechaza crear factura si la empresa no tiene prefijo de facturación', async () => {
      const tx = makeTx({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...PREFIXES, invoicePrefix: null }),
        },
      });
      const prisma = makePrisma(tx);
      const service = makeService(prisma);

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
      const service = makeService(prisma);

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
      const service = makeService(prisma);

      await service.create('company-1', {
        taxRate: 21,
        laborAmount: 100,
        lines: [{ description: 'Material eléctrico', quantity: 2, unitPrice: 25 }],
      } as any);

      const year = documentYear();
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

    it('usa el contador de facturas del año (el mismo que ya existía)', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      const service = makeService(prisma);

      await service.create('company-1', { taxRate: 21, laborAmount: 100 } as any);

      expect(tx.companyCounter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId_key: { companyId: 'company-1', key: `invoice:${documentYear()}` },
          },
        }),
      );
    });

    it('calcula la mano de obra a partir de horas x tarifa cuando no hay importe directo', async () => {
      const tx = makeTx();
      const prisma = makePrisma(tx);
      const service = makeService(prisma);

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
      const service = makeService(prisma);

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
      const service = makeService(prisma);

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
      const service = makeService(prisma);

      await expect(
        service.updateStatus('company-1', 'invoice-ajena', 'PAID'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});