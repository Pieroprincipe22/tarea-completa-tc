import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatusValue } from './dto/update-invoice-status.dto';

// Redondeo a 2 decimales seguro para dinero.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
  ) {}

  // ---------------------------------------------------------------
  // Numeración: PREFIJO-AÑO-CORRELATIVO (ej. HR-2026-0001).
  // Usa CompanyCounter con una key por año ("invoice:2026") para que
  // el correlativo se reinicie cada año y sea correlativo sin huecos.
  // Se ejecuta DENTRO de la transacción de creación.
  // ---------------------------------------------------------------
  private async nextInvoiceNumber(
    tx: any,
    companyId: string,
  ): Promise<string> {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { invoicePrefix: true },
    });

    if (!company?.invoicePrefix) {
      throw new BadRequestException(
        'La empresa no tiene prefijo de facturación configurado. Configúralo antes de emitir facturas.',
      );
    }

    const year = new Date().getFullYear();
    const counterKey = `invoice:${year}`;

    // upsert atómico: crea el contador del año si no existe, o lo incrementa.
    const counter = await tx.companyCounter.upsert({
      where: { companyId_key: { companyId, key: counterKey } },
      create: { companyId, key: counterKey, value: 1 },
      update: { value: { increment: 1 } },
    });

    const correlative = String(counter.value).padStart(4, '0');
    return `${company.invoicePrefix}-${year}-${correlative}`;
  }

  // ---------------------------------------------------------------
  // Crear factura.
  // ---------------------------------------------------------------
  async create(companyId: string, dto: CreateInvoiceDto) {
    // 1) Validaciones de origen (si viene de orden o parte, deben ser de esta empresa).
    let reportId: string | null = null;

    if (dto.maintenanceReportId) {
      const report = await this.prisma.maintenanceReport.findFirst({
        where: { id: dto.maintenanceReportId, companyId },
        select: { id: true, laborHours: true },
      });
      if (!report) {
        throw new NotFoundException('Parte no encontrado en esta empresa.');
      }
      reportId = report.id;
    }

    if (dto.workOrderId) {
      const wo = await this.prisma.workOrder.findFirst({
        where: { id: dto.workOrderId, companyId },
        select: { id: true },
      });
      if (!wo) {
        throw new NotFoundException('Orden no encontrada en esta empresa.');
      }
    }

    // 2) Mano de obra: importe directo gana; si no, horas x precio.
    let laborAmount = 0;
    if (typeof dto.laborAmount === 'number') {
      laborAmount = dto.laborAmount;
    } else if (
      typeof dto.laborHours === 'number' &&
      typeof dto.laborHourlyRate === 'number'
    ) {
      laborAmount = dto.laborHours * dto.laborHourlyRate;
    }
    laborAmount = round2(laborAmount);

    // 3) Materiales del parte (si se pide arrastrarlos).
    type LineInput = {
      description: string;
      quantity: number;
      unit: string | null;
      unitPrice: number;
      lineTotal: number;
      maintenanceReportMaterialId: string | null;
    };

    const lines: LineInput[] = [];

    if (dto.includeReportMaterials && reportId) {
      const materials = await this.prisma.maintenanceReportMaterial.findMany({
        where: { reportId, billable: true },
        orderBy: { sortOrder: 'asc' },
      });

      for (const m of materials) {
        const unitPrice = m.unitCost ? Number(m.unitCost) : 0;
        const qty = m.quantity ?? 1;
        lines.push({
          description: m.name,
          quantity: qty,
          unit: m.unit ?? null,
          unitPrice: round2(unitPrice),
          lineTotal: round2(qty * unitPrice),
          maintenanceReportMaterialId: m.id,
        });
      }
    }

    // 4) Líneas manuales (instalación, desplazamiento, etc.).
    for (const l of dto.lines ?? []) {
      lines.push({
        description: l.description.trim(),
        quantity: l.quantity,
        unit: l.unit?.trim() || null,
        unitPrice: round2(l.unitPrice),
        lineTotal: round2(l.quantity * l.unitPrice),
        maintenanceReportMaterialId: null,
      });
    }

    // 5) Totales: subtotal = mano de obra + líneas; IVA configurable.
    const materialsAmount = round2(
      lines.reduce((sum, l) => sum + l.lineTotal, 0),
    );
    const subtotal = round2(laborAmount + materialsAmount);
    const taxAmount = round2(subtotal * (dto.taxRate / 100));
    const total = round2(subtotal + taxAmount);

    if (subtotal <= 0) {
      throw new BadRequestException(
        'La factura está vacía: añade mano de obra o al menos una línea.',
      );
    }

    // 6) Crear todo en transacción: número + factura + líneas.
    return this.prisma.$transaction(async (tx: any) => {
      const invoiceNumber = await this.nextInvoiceNumber(tx, companyId);

      const invoice = await tx.invoice.create({
        data: {
          companyId,
          workOrderId: dto.workOrderId ?? null,
          maintenanceReportId: reportId,
          invoiceNumber,
          status: 'DRAFT',
          currency: 'EUR',
          laborAmount,
          materialsAmount,
          subtotal,
          taxRate: dto.taxRate,
          taxAmount,
          total,
          notes: dto.notes ?? null,
        },
      });

      if (lines.length > 0) {
        await tx.invoiceItem.createMany({
          data: lines.map((l, i) => ({
            invoiceId: invoice.id,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
            sortOrder: i,
            maintenanceReportMaterialId: l.maintenanceReportMaterialId,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  // ---------------------------------------------------------------
  // Listar facturas de la empresa.
  // ---------------------------------------------------------------
  async list(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        taxRate: true,
        total: true,
        createdAt: true,
        workOrderId: true,
        maintenanceReportId: true,
      },
    });
  }

  // ---------------------------------------------------------------
  // Ver una factura con sus líneas.
  // ---------------------------------------------------------------
  async get(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        workOrder: { select: { id: true, code: true, title: true } },
        maintenanceReport: { select: { id: true, title: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Factura no encontrada.');
    return invoice;
  }

  // ---------------------------------------------------------------
  // Generar el PDF, subirlo a MinIO y devolver el buffer para la
  // respuesta HTTP. La clave de almacenamiento es fija por factura, así
  // que cada llamada simplemente sobrescribe con el estado actual.
  // ---------------------------------------------------------------
  async getPdfBuffer(companyId: string, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        workOrder: {
          select: {
            customer: { select: { name: true } },
            site: { select: { name: true } },
          },
        },
        maintenanceReport: {
          select: {
            customer: { select: { name: true } },
            site: { select: { name: true } },
          },
        },
        company: { select: { name: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Factura no encontrada.');

    const customerName =
      invoice.workOrder?.customer?.name ?? invoice.maintenanceReport?.customer?.name ?? null;
    const siteName =
      invoice.workOrder?.site?.name ?? invoice.maintenanceReport?.site?.name ?? null;

    const buffer = await this.pdf.renderInvoicePdf({
      companyName: invoice.company.name,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      createdAt: invoice.createdAt,
      customerName,
      siteName,
      laborAmount: invoice.laborAmount,
      materialsAmount: invoice.materialsAmount,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });

    const objectKey = `company/${companyId}/invoices/${id}.pdf`;
    await this.storage.putObject(objectKey, buffer, 'application/pdf');

    await this.prisma.invoice.update({
      where: { id },
      data: { pdfUrl: objectKey },
    });

    const filename = `${invoice.invoiceNumber ?? id}.pdf`;
    return { buffer, filename };
  }

  // ---------------------------------------------------------------
  // Cambiar estado (Parte B; lo dejamos ya listo).
  // ---------------------------------------------------------------
  async updateStatus(
    companyId: string,
    id: string,
    status: InvoiceStatusValue,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada.');

    const stamps: Record<string, Date> = {};
    if (status === 'GENERATED') stamps.generatedAt = new Date();
    if (status === 'SENT') stamps.sentAt = new Date();
    if (status === 'PAID') stamps.paidAt = new Date();

    return this.prisma.invoice.update({
      where: { id },
      data: { status, ...stamps },
    });
  }
}