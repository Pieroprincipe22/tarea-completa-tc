import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportItemDto } from './dto/update-maintenance-report-items.dto';

@Injectable()
export class MaintenanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromTemplate(companyId: string, userId: string | undefined, dto: CreateMaintenanceReportDto) {
    if (!companyId) throw new BadRequestException('Falta header x-company-id');
    if (!userId) throw new BadRequestException('Falta header x-user-id (createdByUserId es obligatorio)');

    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: { id: dto.templateId, companyId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!template) throw new NotFoundException('MaintenanceTemplate no encontrado para esta company.');
    if (!template.items.length) throw new BadRequestException('El template no tiene items.');

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.maintenanceReport.create({
        data: {
          companyId,
          templateId: template.id,
          templateName: template.name,
          templateDesc: template.description ?? undefined,
          createdByUserId: userId,

          customerId: dto.customerId,
          siteId: dto.siteId,
          assetId: dto.assetId,

          state: 'DRAFT',
        },
      });

      await tx.maintenanceReportItem.createMany({
        data: template.items.map((it) => ({
          companyId,
          reportId: report.id,
          templateItemId: it.id,
          sortOrder: it.sortOrder,
          title: it.label,
          description: it.hint ?? undefined,
          status: 'PENDING',
          resultValue: undefined,
          resultNotes: undefined,
        })),
      });

      return tx.maintenanceReport.findFirst({
        where: { id: report.id, companyId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async getById(companyId: string, id: string) {
    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado.');
    return report;
  }

  async updateItem(companyId: string, reportId: string, itemId: string, dto: UpdateMaintenanceReportItemDto) {
    const item = await this.prisma.maintenanceReportItem.findFirst({
      where: { id: itemId, reportId, companyId },
    });
    if (!item) throw new NotFoundException('Item no encontrado.');

    return this.prisma.maintenanceReportItem.update({
      where: { id: itemId },
      data: {
        status: dto.status,
        resultValue: dto.resultValue,
        resultNotes: dto.resultNotes,
      },
    });
  }

  async finalize(companyId: string, id: string) {
    const report = await this.prisma.maintenanceReport.findFirst({ where: { id, companyId } });
    if (!report) throw new NotFoundException('Reporte no encontrado.');

    return this.prisma.maintenanceReport.update({
      where: { id },
      data: {
        state: 'FINAL',
        finalizedAt: new Date(),
      },
    });
  }
}