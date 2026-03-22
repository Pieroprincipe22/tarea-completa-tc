import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MaintenanceItemStatus,
  MaintenanceReportStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportItemDto } from './dto/update-maintenance-report-items.dto';

const reportInclude = {
  template: {
    select: {
      id: true,
      title: true,
      description: true,
    },
  },
  customer: {
    select: { id: true, name: true },
  },
  site: {
    select: { id: true, name: true, address: true },
  },
  asset: {
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      serialNumber: true,
    },
  },
  createdByUser: {
    select: { id: true, email: true, name: true },
  },
  items: {
    orderBy: { itemOrder: 'asc' },
  },
} satisfies Prisma.MaintenanceReportInclude;

type ReportWithRelations = Prisma.MaintenanceReportGetPayload<{
  include: typeof reportInclude;
}>;

type ReportItemEntity = ReportWithRelations['items'][number];

function serializeReportItem(item: ReportItemEntity) {
  const parsedNumber =
    item.value !== null && item.value.trim() !== '' ? Number(item.value) : NaN;

  return {
    id: item.id,
    reportId: item.reportId,
    templateItemId: item.templateItemId,
    title: item.title,
    description: item.description,
    itemOrder: item.itemOrder,
    sortOrder: item.itemOrder,
    status: item.status,
    value: item.value,
    valueText: item.value,
    valueChoice: null,
    valueNumber: Number.isFinite(parsedNumber) ? parsedNumber : null,
    notes: item.notes,
    resultValue: item.value,
    resultNotes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeReport(report: ReportWithRelations) {
  return {
    id: report.id,
    companyId: report.companyId,
    customerId: report.customerId,
    siteId: report.siteId,
    assetId: report.assetId,
    templateId: report.templateId,
    workOrderId: report.workOrderId,
    title: report.title,
    description: report.description,
    notes: report.notes,
    status: report.status,
    state: report.status,
    createdByUserId: report.createdByUserId,
    completedByUserId: report.completedByUserId,
    completedAt: report.completedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,

    performedAt: report.completedAt ?? report.createdAt,
    templateName: report.template?.title ?? report.title,
    templateDesc: report.template?.description ?? report.description ?? null,
    summary: report.description ?? null,

    template: report.template,
    customer: report.customer,
    site: report.site,
    asset: report.asset,
    createdByUser: report.createdByUser,
    items: report.items.map(serializeReportItem),
  };
}

@Injectable()
export class MaintenanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    const items = await this.prisma.maintenanceReport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });

    return {
      items: items.map(serializeReport),
      count: items.length,
    };
  }

  async createFromTemplate(
    companyId: string,
    userId: string | undefined,
    dto: CreateMaintenanceReportDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    if (!userId) {
      throw new BadRequestException('Falta header x-user-id (createdByUserId es obligatorio)');
    }

    const createDto = dto as CreateMaintenanceReportDto & {
      title?: string;
      notes?: string;
    };

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        companyId,
        userId,
        active: true,
      },
      select: { id: true },
    });

    if (!userCompany) {
      throw new BadRequestException('El usuario del header no pertenece a esta company.');
    }

    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: {
        id: dto.templateId,
        companyId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: { itemOrder: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('MaintenanceTemplate no encontrado para esta company.');
    }

    if (!template.items.length) {
      throw new BadRequestException('El template no tiene items.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        companyId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer no encontrado para esta company.');
    }

    const site = await this.prisma.site.findFirst({
      where: {
        id: dto.siteId,
        companyId,
      },
      select: { id: true, customerId: true },
    });

    if (!site) {
      throw new NotFoundException('Site no encontrado para esta company.');
    }

    if (site.customerId !== customer.id) {
      throw new BadRequestException('El site no pertenece al customer indicado.');
    }

    const asset = await this.prisma.asset.findFirst({
      where: {
        id: dto.assetId,
        companyId,
      },
      select: { id: true, siteId: true },
    });

    if (!asset) {
      throw new NotFoundException('Asset no encontrado para esta company.');
    }

    if (asset.siteId !== site.id) {
      throw new BadRequestException('El asset no pertenece al site indicado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.maintenanceReport.create({
        data: {
          companyId,
          customerId: customer.id,
          siteId: site.id,
          assetId: asset.id,
          templateId: template.id,
          title: createDto.title?.trim() || template.title,
          description: template.description ?? null,
          notes: createDto.notes ?? null,
          status: MaintenanceReportStatus.DRAFT,
          createdByUserId: userId,
        },
      });

      await tx.maintenanceReportItem.createMany({
        data: template.items.map((it) => ({
          reportId: report.id,
          templateItemId: it.id,
          title: it.title,
          description: it.description ?? null,
          itemOrder: it.itemOrder,
          status: MaintenanceItemStatus.PENDING,
          value: null,
          notes: null,
        })),
      });

      const fullReport = await tx.maintenanceReport.findFirst({
        where: {
          id: report.id,
          companyId,
        },
        include: reportInclude,
      });

      if (!fullReport) {
        throw new NotFoundException('No se pudo recuperar el reporte creado.');
      }

      return serializeReport(fullReport);
    });
  }

  async getById(companyId: string, id: string) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId },
      include: reportInclude,
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    return serializeReport(report);
  }

  async updateItem(
    companyId: string,
    reportId: string,
    itemId: string,
    dto: UpdateMaintenanceReportItemDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    const report = await this.prisma.maintenanceReport.findFirst({
      where: {
        id: reportId,
        companyId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (
      report.status === MaintenanceReportStatus.COMPLETED ||
      report.status === MaintenanceReportStatus.CANCELLED
    ) {
      throw new BadRequestException('No se pueden editar items de un reporte cerrado.');
    }

    const item = await this.prisma.maintenanceReportItem.findFirst({
      where: {
        id: itemId,
        reportId,
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado.');
    }

    const updated = await this.prisma.maintenanceReportItem.update({
      where: { id: itemId },
      data: {
        status: dto.status ?? item.status,
        value: dto.value ?? dto.resultValue ?? item.value,
        notes: dto.notes ?? dto.resultNotes ?? item.notes,
      },
    });

    return serializeReportItem(updated);
  }

  async finalize(companyId: string, id: string) {
    if (!companyId) {
      throw new BadRequestException('Falta header x-company-id');
    }

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId },
      include: {
        items: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado.');
    }

    if (!report.items.length) {
      throw new BadRequestException('El reporte no tiene items.');
    }

    const pendingItems = report.items.filter((item) => item.status === MaintenanceItemStatus.PENDING);
    if (pendingItems.length > 0) {
      throw new BadRequestException('No se puede finalizar: todavía hay items en estado PENDING.');
    }

    const updated = await this.prisma.maintenanceReport.update({
      where: { id },
      data: {
        status: MaintenanceReportStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: reportInclude,
    });

    return serializeReport(updated);
  }
}