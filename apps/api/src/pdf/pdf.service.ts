import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const NAVY = '#0f2942';
const SLATE = '#334155';
const MUTED = '#64748b';
const BORDER = '#cbd5e1';

// Acepta number/string y también Prisma.Decimal (que solo garantiza
// toString()), sin acoplar este módulo a @prisma/client.
type Moneyish = number | string | { toString(): string } | null | undefined;

function money(value: Moneyish, currency = 'EUR'): string {
  const n = typeof value === 'number' ? value : Number(value?.toString() ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(safe);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

// OJO: no llama a doc.end() aquí — eso hay que hacerlo DESPUÉS de dibujar
// todo el contenido. Esta función solo arma la promesa que junta los
// bytes a medida que el stream los va emitiendo.
function collect(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function header(doc: PDFKit.PDFDocument, companyName: string, docTitle: string) {
  doc
    .rect(0, 0, doc.page.width, 90)
    .fill(NAVY);

  doc
    .fillColor('#ffffff')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(companyName, 40, 30);

  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#bfdbfe')
    .text(docTitle, 40, 55);

  doc.fillColor(SLATE).font('Helvetica');
  doc.y = 110;
}

function footer(doc: PDFKit.PDFDocument) {
  const bottom = doc.page.height - 50;
  doc
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `Generado el ${formatDate(new Date())} — TC Mantenimiento`,
      40,
      bottom,
      { align: 'center', width: doc.page.width - 80 },
    );
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.8);
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor(NAVY)
    .text(text.toUpperCase());
  doc
    .moveTo(doc.x, doc.y + 2)
    .lineTo(doc.page.width - 40, doc.y + 2)
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.6);
  doc.font('Helvetica').fillColor(SLATE);
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(9).fillColor(MUTED).text(label, { continued: false });
  doc.fontSize(10).fillColor(SLATE).text(value || '—');
  doc.moveDown(0.4);
}

type TableColumn = { header: string; width: number; align?: 'left' | 'right' | 'center' };

const TABLE_CELL_PAD_X = 4;
const TABLE_CELL_PAD_Y = 6;
const TABLE_MIN_ROW_HEIGHT = 20;

// Altura que necesita una fila = la celda más alta de esa fila (una celda
// con texto largo hace wrap y necesita más alto que TABLE_MIN_ROW_HEIGHT;
// antes se usaba una altura fija y el texto largo se salía encima de la
// fila siguiente).
function measureRowHeight(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  row: string[],
): number {
  const tallest = row.reduce((max, cell, ci) => {
    const h = doc.heightOfString(cell || '', {
      width: columns[ci].width - TABLE_CELL_PAD_X * 2,
      align: columns[ci].align ?? 'left',
    });
    return Math.max(max, h);
  }, 0);

  return Math.max(TABLE_MIN_ROW_HEIGHT, tallest + TABLE_CELL_PAD_Y * 2);
}

function table(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: string[][],
) {
  const startX = doc.x;
  const tableWidth = columns.reduce((s, c) => s + c.width, 0);
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  const headerHeight = measureRowHeight(
    doc,
    columns,
    columns.map((c) => c.header),
  );
  doc.rect(startX, y, tableWidth, headerHeight).fill(NAVY);

  let x = startX;
  for (const col of columns) {
    doc.fillColor('#ffffff').text(col.header, x + TABLE_CELL_PAD_X, y + TABLE_CELL_PAD_Y, {
      width: col.width - TABLE_CELL_PAD_X * 2,
      align: col.align ?? 'left',
    });
    x += col.width;
  }
  y += headerHeight;

  doc.font('Helvetica').fontSize(9);

  rows.forEach((row, i) => {
    const rowHeight = measureRowHeight(doc, columns, row);

    if (y + rowHeight > doc.page.height - 80) {
      doc.addPage();
      y = 50;
    }

    if (i % 2 === 1) {
      doc.rect(startX, y, tableWidth, rowHeight).fill('#f1f5f9');
    }

    x = startX;
    row.forEach((cell, ci) => {
      doc.fillColor(SLATE).text(cell, x + TABLE_CELL_PAD_X, y + TABLE_CELL_PAD_Y, {
        width: columns[ci].width - TABLE_CELL_PAD_X * 2,
        align: columns[ci].align ?? 'left',
      });
      x += columns[ci].width;
    });
    y += rowHeight;
  });

  doc.x = startX;
  doc.y = y + 8;
}

// ---------------------------------------------------------------
// Factura
// ---------------------------------------------------------------
export type InvoicePdfInput = {
  companyName: string;
  invoiceNumber: string | null;
  status: string;
  currency: string;
  createdAt: Date;
  customerName?: string | null;
  siteName?: string | null;
  laborAmount: Moneyish;
  materialsAmount: Moneyish;
  subtotal: Moneyish;
  taxRate: Moneyish;
  taxAmount: Moneyish;
  total: Moneyish;
  notes?: string | null;
  items: {
    description: string;
    quantity: number;
    unit?: string | null;
    unitPrice: Moneyish;
    lineTotal: Moneyish;
  }[];
};

// ---------------------------------------------------------------
// Parte de mantenimiento
// ---------------------------------------------------------------
export type MaintenanceReportPdfInput = {
  companyName: string;
  title: string | null;
  status: string;
  customerName?: string | null;
  siteName?: string | null;
  assetName?: string | null;
  technicianName?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  diagnosis?: string | null;
  workPerformed?: string | null;
  recommendations?: string | null;
  observations?: string | null;
  items: {
    label: string;
    status: string;
    value?: string | null;
    notes?: string | null;
  }[];
  materials: {
    name: string;
    quantity: number;
    unit?: string | null;
    unitCost?: number | string | null;
    totalCost?: number | string | null;
  }[];
};

@Injectable()
export class PdfService {
  async renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const bufferPromise = collect(doc);

    header(doc, input.companyName, `Factura ${input.invoiceNumber ?? '(borrador)'}`);

    doc.fontSize(9).fillColor(MUTED);
    doc.text(`Estado: ${input.status}`, { continued: true });
    doc.text(`   ·   Fecha: ${formatDate(input.createdAt)}`, { align: 'left' });
    doc.moveDown(0.6);

    if (input.customerName) {
      sectionTitle(doc, 'Cliente');
      labelValue(doc, 'Cliente', input.customerName);
      if (input.siteName) labelValue(doc, 'Sitio', input.siteName);
    }

    sectionTitle(doc, 'Líneas');

    const rows: string[][] = [];

    if (Number(input.laborAmount) > 0) {
      rows.push(['Mano de obra', '1', '-', money(input.laborAmount, input.currency), money(input.laborAmount, input.currency)]);
    }

    for (const item of input.items) {
      rows.push([
        item.description,
        String(item.quantity),
        item.unit ?? '-',
        money(item.unitPrice, input.currency),
        money(item.lineTotal, input.currency),
      ]);
    }

    table(
      doc,
      [
        { header: 'Descripción', width: 230 },
        { header: 'Cant.', width: 50, align: 'right' },
        { header: 'Ud.', width: 50, align: 'center' },
        { header: 'Precio', width: 85, align: 'right' },
        { header: 'Total', width: 85, align: 'right' },
      ],
      rows,
    );

    const totalsX = doc.page.width - 240;
    doc.x = totalsX;
    doc.fontSize(10);

    const totalLine = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? NAVY : SLATE);
      doc.text(label, totalsX, doc.y, { continued: true, width: 120 });
      doc.text(value, { align: 'right', width: 80 });
    };

    totalLine('Subtotal', money(input.subtotal, input.currency));
    totalLine(`IVA (${Number(input.taxRate ?? 0)}%)`, money(input.taxAmount, input.currency));
    doc.moveDown(0.2);
    totalLine('TOTAL', money(input.total, input.currency), true);

    if (input.notes) {
      doc.moveDown(1);
      sectionTitle(doc, 'Notas');
      doc.fontSize(9).fillColor(SLATE).text(input.notes);
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      footer(doc);
    }

    doc.end();
    return bufferPromise;
  }

  async renderMaintenanceReportPdf(input: MaintenanceReportPdfInput): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const bufferPromise = collect(doc);

    header(doc, input.companyName, input.title ?? 'Parte de mantenimiento');

    doc.fontSize(9).fillColor(MUTED);
    doc.text(`Estado: ${input.status}`, { continued: true });
    doc.text(
      `   ·   Fecha: ${formatDate(input.createdAt)}${input.completedAt ? `   ·   Cerrado: ${formatDate(input.completedAt)}` : ''}`,
    );
    doc.moveDown(0.4);

    sectionTitle(doc, 'Datos generales');
    if (input.customerName) labelValue(doc, 'Cliente', input.customerName);
    if (input.siteName) labelValue(doc, 'Sitio', input.siteName);
    if (input.assetName) labelValue(doc, 'Activo', input.assetName);
    if (input.technicianName) labelValue(doc, 'Técnico', input.technicianName);

    if (input.diagnosis) {
      sectionTitle(doc, 'Diagnóstico');
      doc.fontSize(9).text(input.diagnosis);
    }

    if (input.workPerformed) {
      sectionTitle(doc, 'Trabajo realizado');
      doc.fontSize(9).text(input.workPerformed);
    }

    if (input.items.length > 0) {
      sectionTitle(doc, 'Checklist');
      table(
        doc,
        [
          { header: 'Punto', width: 220 },
          { header: 'Estado', width: 70, align: 'center' },
          { header: 'Valor', width: 100 },
          { header: 'Notas', width: 110 },
        ],
        input.items.map((item) => [
          item.label,
          item.status,
          item.value ?? '-',
          item.notes ?? '-',
        ]),
      );
    }

    if (input.materials.length > 0) {
      sectionTitle(doc, 'Materiales');
      table(
        doc,
        [
          { header: 'Material', width: 200 },
          { header: 'Cant.', width: 60, align: 'right' },
          { header: 'Ud.', width: 60, align: 'center' },
          { header: 'Coste unit.', width: 90, align: 'right' },
          { header: 'Total', width: 90, align: 'right' },
        ],
        input.materials.map((m) => [
          m.name,
          String(m.quantity),
          m.unit ?? '-',
          m.unitCost != null ? money(m.unitCost) : '-',
          m.totalCost != null ? money(m.totalCost) : '-',
        ]),
      );
    }

    if (input.recommendations) {
      sectionTitle(doc, 'Recomendaciones');
      doc.fontSize(9).text(input.recommendations);
    }

    if (input.observations) {
      sectionTitle(doc, 'Observaciones');
      doc.fontSize(9).text(input.observations);
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      footer(doc);
    }

    doc.end();
    return bufferPromise;
  }
}
