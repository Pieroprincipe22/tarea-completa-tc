import { inflateSync } from 'node:zlib';
import { PdfService } from './pdf.service';

function isValidPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

// Descomprime los content streams (pdfkit los comprime con Flate por
// defecto) y junta el texto real dibujado. Sirve para detectar bugs tipo
// "el PDF es válido pero está en blanco" que un chequeo de tamaño de
// buffer no pilla — nos pasó de verdad: llamábamos a doc.end() antes de
// dibujar nada, y el PDF resultante era "válido" pero vacío.
function extractDrawnText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let combined = '';
  let match: RegExpExecArray | null;

  while ((match = streamRe.exec(raw))) {
    const streamBytes = Buffer.from(match[1], 'latin1');
    try {
      combined += inflateSync(streamBytes).toString('latin1');
    } catch {
      // No todos los streams son Flate (fuentes embebidas, etc.) — se ignoran.
    }
  }

  // pdfkit dibuja el texto como "[<hex> ...] TJ" (hex-encoded, no strings
  // literales entre paréntesis) — extraemos cada <hex> y lo decodificamos.
  const hexRe = /<([0-9A-Fa-f]+)>/g;
  const hexParts: string[] = [];
  while ((match = hexRe.exec(combined))) {
    hexParts.push(Buffer.from(match[1], 'hex').toString('latin1'));
  }

  return hexParts.join('');
}

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(() => {
    service = new PdfService();
  });

  describe('renderInvoicePdf()', () => {
    it('genera un PDF válido con líneas y totales', async () => {
      const buffer = await service.renderInvoicePdf({
        companyName: 'Hotel Indigo',
        invoiceNumber: 'HI-2026-0001',
        status: 'GENERATED',
        currency: 'EUR',
        createdAt: new Date('2026-09-20'),
        customerName: 'Cliente Demo',
        siteName: 'Sala técnica',
        laborAmount: 100,
        materialsAmount: 50,
        subtotal: 150,
        taxRate: 21,
        taxAmount: 31.5,
        total: 181.5,
        notes: 'Pago a 30 días.',
        items: [
          { description: 'Material eléctrico', quantity: 2, unit: 'ud', unitPrice: 25, lineTotal: 50 },
        ],
      });

      expect(isValidPdf(buffer)).toBe(true);

      const text = extractDrawnText(buffer);
      expect(text).toContain('Hotel Indigo');
      expect(text).toContain('Cliente Demo');
      expect(text).toContain('Material eléctrico');
    });

    it('no revienta con importes tipo Prisma.Decimal (objetos con toString)', async () => {
      const decimalLike = { toString: () => '99.90' };

      const buffer = await service.renderInvoicePdf({
        companyName: 'Hotel Indigo',
        invoiceNumber: null,
        status: 'DRAFT',
        currency: 'EUR',
        createdAt: new Date('2026-09-20'),
        laborAmount: decimalLike,
        materialsAmount: null,
        subtotal: decimalLike,
        taxRate: decimalLike,
        taxAmount: decimalLike,
        total: decimalLike,
        items: [],
      });

      expect(isValidPdf(buffer)).toBe(true);
    });

    it('genera un PDF válido sin líneas ni notas (factura mínima)', async () => {
      const buffer = await service.renderInvoicePdf({
        companyName: 'Hotel Indigo',
        invoiceNumber: 'HI-2026-0002',
        status: 'DRAFT',
        currency: 'EUR',
        createdAt: new Date(),
        laborAmount: 0,
        materialsAmount: 0,
        subtotal: 0,
        taxRate: 21,
        taxAmount: 0,
        total: 0,
        items: [],
      });

      expect(isValidPdf(buffer)).toBe(true);
    });
  });

  describe('renderMaintenanceReportPdf()', () => {
    it('genera un PDF válido con checklist y materiales', async () => {
      const buffer = await service.renderMaintenanceReportPdf({
        companyName: 'Hotel Indigo',
        title: 'Revisión preventiva',
        status: 'APPROVED',
        customerName: 'Cliente Demo',
        siteName: 'Sala técnica',
        assetName: 'Bomba principal',
        technicianName: 'Técnico Prueba',
        createdAt: new Date('2026-09-20'),
        completedAt: new Date('2026-09-21'),
        diagnosis: 'Todo correcto.',
        workPerformed: 'Revisión general.',
        recommendations: 'Ninguna.',
        observations: null,
        items: [{ label: 'Presión', status: 'OK', value: '2.4 bar', notes: null }],
        materials: [{ name: 'Filtro', quantity: 1, unit: 'ud', unitCost: 10, totalCost: 10 }],
      });

      expect(isValidPdf(buffer)).toBe(true);

      const text = extractDrawnText(buffer);
      expect(text).toContain('Hotel Indigo');
      expect(text).toContain('Revisión preventiva');
      expect(text).toContain('Bomba principal');
      expect(text).toContain('Filtro');
    });

    it('genera un PDF válido sin checklist ni materiales', async () => {
      const buffer = await service.renderMaintenanceReportPdf({
        companyName: 'Hotel Indigo',
        title: null,
        status: 'DRAFT',
        createdAt: new Date(),
        items: [],
        materials: [],
      });

      expect(isValidPdf(buffer)).toBe(true);
    });
  });
});
