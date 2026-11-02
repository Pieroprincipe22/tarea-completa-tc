import { BadRequestException } from '@nestjs/common';
import { NumberingService, documentYear, formatDocumentNumber } from './numbering.service';

function makeTx(prefixes: Record<string, string | null>, counterValue = 1) {
  return {
    company: { findUnique: jest.fn().mockResolvedValue(prefixes) },
    companyCounter: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({ value: counterValue }),
    },
  };
}

const PREFIXES = { workOrderPrefix: 'OT', quotePrefix: 'P', invoicePrefix: 'FAC' };
const JUNE_2026 = new Date('2026-06-15T10:00:00Z');

describe('formatDocumentNumber', () => {
  it('rellena con ceros hasta 4 cifras', () => {
    expect(formatDocumentNumber('OT', 2026, 7)).toBe('OT-2026-0007');
  });

  it('no corta los números de más de 4 cifras', () => {
    expect(formatDocumentNumber('OT', 2026, 12345)).toBe('OT-2026-12345');
  });
});

describe('documentYear', () => {
  it('usa la hora de España: las 00:30 del 1 de enero ya son año nuevo', () => {
    // 31/12/2026 23:30 UTC = 01/01/2027 00:30 en Madrid
    expect(documentYear(new Date('2026-12-31T23:30:00Z'))).toBe(2027);
  });
});

describe('NumberingService.next', () => {
  const service = new NumberingService({} as never);

  it('crea el contador si no existe y devuelve el número formateado', async () => {
    const tx = makeTx(PREFIXES, 7);
    await expect(service.next(tx as never, 'c1', 'workOrder', JUNE_2026)).resolves.toBe(
      'OT-2026-0007',
    );

    expect(tx.companyCounter.createMany).toHaveBeenCalledWith({
      data: [{ companyId: 'c1', key: 'work-order:2026', value: 0 }],
      skipDuplicates: true,
    });
    expect(tx.companyCounter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId_key: { companyId: 'c1', key: 'work-order:2026' } },
        data: { value: { increment: 1 } },
      }),
    );
  });

  it('usa un contador distinto para cada tipo de documento', async () => {
    const tx = makeTx(PREFIXES, 1);
    await expect(service.next(tx as never, 'c1', 'quote', JUNE_2026)).resolves.toBe('P-2026-0001');
    await expect(service.next(tx as never, 'c1', 'invoice', JUNE_2026)).resolves.toBe(
      'FAC-2026-0001',
    );
    const keys = tx.companyCounter.update.mock.calls.map((c) => c[0].where.companyId_key.key);
    expect(keys).toEqual(['quote:2026', 'invoice:2026']);
  });

  it('no deja facturar sin prefijo de facturación', async () => {
    const tx = makeTx({ ...PREFIXES, invoicePrefix: null });
    await expect(service.next(tx as never, 'c1', 'invoice', JUNE_2026)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.companyCounter.update).not.toHaveBeenCalled();
  });
});

describe('NumberingService.preview', () => {
  it('devuelve el siguiente número de cada tipo sin reservar nada', async () => {
    const prisma = {
      companyCounter: {
        findMany: jest.fn().mockResolvedValue([{ key: 'work-order:2026', value: 41 }]),
      },
    };
    const service = new NumberingService(prisma as never);

    await expect(service.preview('c1', JUNE_2026)).resolves.toEqual({
      year: 2026,
      next: { workOrder: 42, quote: 1, invoice: 1 },
    });
  });
});