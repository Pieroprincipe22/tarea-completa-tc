import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

// Tipos de documento que llevan número correlativo por empresa y año.
export type DocumentKind = 'workOrder' | 'quote' | 'invoice';

const DOCUMENT_KINDS: DocumentKind[] = ['workOrder', 'quote', 'invoice'];

// La clave del contador: un contador por tipo de documento y año.
// "invoice:<año>" es la misma clave que ya usaba la facturación.
const COUNTER_KEY: Record<DocumentKind, string> = {
  workOrder: 'work-order',
  quote: 'quote',
  invoice: 'invoice',
};

// Letras y números, de 1 a 8 caracteres, sin espacios: OT, P, FAC2026…
export const PREFIX_PATTERN = /^[A-Z0-9]{1,8}$/;

// Las empresas trabajan en hora de España: a las 00:30 del 1 de enero
// ya es el año nuevo aunque el servidor esté en hora UTC.
export function documentYear(date: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric' }).format(date),
  );
}

export function formatDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

export type NextNumbers = {
  year: number;
  next: Record<DocumentKind, number>;
};

type CounterClient = Pick<Prisma.TransactionClient, 'company' | 'companyCounter'>;

@Injectable()
export class NumberingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserva y devuelve el siguiente número (p. ej. "OT-2026-0007").
   * Hay que llamarlo DENTRO de la transacción que crea el documento:
   * si la creación falla, el número no se gasta y no quedan huecos.
   */
  async next(
    tx: CounterClient,
    companyId: string,
    kind: DocumentKind,
    now: Date = new Date(),
  ): Promise<string> {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { workOrderPrefix: true, quotePrefix: true, invoicePrefix: true },
    });

    const prefix = {
      workOrder: company?.workOrderPrefix,
      quote: company?.quotePrefix,
      invoice: company?.invoicePrefix,
    }[kind];

    if (!prefix) {
      throw new BadRequestException(
        kind === 'invoice'
          ? 'La empresa no tiene prefijo de facturación. Configúralo en Configuración → Empresa.'
          : 'La empresa no tiene prefijo de numeración. Configúralo en Configuración → Empresa.',
      );
    }

    const year = documentYear(now);
    const key = `${COUNTER_KEY[kind]}:${year}`;

    // 1) Crea el contador del año si aún no existe (sin error si otra petición
    //    lo crea a la vez: ON CONFLICT DO NOTHING).
    await tx.companyCounter.createMany({
      data: [{ companyId, key, value: 0 }],
      skipDuplicates: true,
    });

    // 2) Lo incrementa en una sola sentencia: la base de datos bloquea la fila,
    //    así que dos órdenes creadas a la vez nunca reciben el mismo número.
    const counter = await tx.companyCounter.update({
      where: { companyId_key: { companyId, key } },
      data: { value: { increment: 1 } },
      select: { value: true },
    });

    return formatDocumentNumber(prefix, year, counter.value);
  }

  /**
   * Qué número tocaría ahora a cada tipo de documento, sin reservarlo.
   * Sirve para la vista previa de la pantalla de Configuración.
   */
  async preview(companyId: string, now: Date = new Date()): Promise<NextNumbers> {
    const year = documentYear(now);
    const keys = DOCUMENT_KINDS.map((kind) => `${COUNTER_KEY[kind]}:${year}`);

    const counters = await this.prisma.companyCounter.findMany({
      where: { companyId, key: { in: keys } },
      select: { key: true, value: true },
    });

    const current = new Map(counters.map((c) => [c.key, c.value]));
    const next = {} as Record<DocumentKind, number>;
    for (const kind of DOCUMENT_KINDS) {
      next[kind] = (current.get(`${COUNTER_KEY[kind]}:${year}`) ?? 0) + 1;
    }

    return { year, next };
  }
}