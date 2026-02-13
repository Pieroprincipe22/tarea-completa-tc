import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  MaintenanceReportItemStatus,
  MaintenanceReportState,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import type { Tenant } from '../common/tenant-context';

import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import { UpdateMaintenanceReportItemsDto } from './dto/update-maintenance-report-items.dto';
import { ListMaintenanceReportsQuery } from './dto/list-maintenance-reports.query';

@Injectable()
export class MaintenanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromTemplate(tenant: Tenant, dto: CreateMaintenanceReportDto) {
    const { companyId, userId } = tenant;

    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: { id: dto.templateId, companyId, archivedAt: null },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!template) throw new NotFoundException('MaintenanceTemplate not found');
    if (template.items.length === 0)
      throw new BadRequestException('Template has no items');

    return this.prisma.maintenanceReport.create({
      data: {
        companyId,
        templateId: template.id,
        templateName: template.name,
        templateDesc: template.description ?? null,
        createdByUserId: userId,
        customerId: dto.customerId ?? null,
        siteId: dto.siteId ?? null,
        assetId: dto.assetId ?? null,
        performedAt: new Date(),
        state: MaintenanceReportState.DRAFT,
        notes: dto.notes ?? null,
        items: {
          create: template.items.map((it) => ({
            companyId,
            templateItemId: it.id,
            sortOrder: it.sortOrder,
            title: it.label,
            description: it.hint ?? null,
            status: MaintenanceReportItemStatus.PENDING,
            resultNotes: null,
            resultValue: null,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async list(tenant: Tenant, query: ListMaintenanceReportsQuery) {
    const { companyId } = tenant;

    const where: Prisma.MaintenanceReportWhereInput = { companyId };

    if (query.assetId) where.assetId = query.assetId;
    if (query.siteId) where.siteId = query.siteId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.templateId) where.templateId = query.templateId;
    if (query.state) where.state = query.state;

    const take = query.take ?? 50;
    const skip = query.skip ?? 0;

    return await this.prisma.maintenanceReport.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      take,
      skip,
    });
  }

  async getById(tenant: Tenant, id: string) {
    const { companyId } = tenant;

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!report) throw new NotFoundException('MaintenanceReport not found');
    return report;
  }

  async updateHeader(
    tenant: Tenant,
    id: string,
    dto: UpdateMaintenanceReportDto,
  ) {
    const { companyId } = tenant;

    const current = await this.prisma.maintenanceReport.findFirst({
      where: { id, companyId },
      select: { id: true, state: true },
    });

    if (!current) throw new NotFoundException('MaintenanceReport not found');
    if (current.state === MaintenanceReportState.FINAL) {
      throw new ConflictException('Report is FINAL and cannot be modified');
    }

    return this.prisma.maintenanceReport.update({
      where: { id },
      data: {
        summary: dto.summary ?? undefined,
        notes: dto.notes ?? undefined,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async patchItems(
    tenant: Tenant,
    reportId: string,
    dto: UpdateMaintenanceReportItemsDto,
  ) {
    const { companyId } = tenant;

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id: reportId, companyId },
      select: { id: true, state: true },
    });

    if (!report) throw new NotFoundException('MaintenanceReport not found');
    if (report.state === MaintenanceReportState.FINAL) {
      throw new ConflictException('Report is FINAL and cannot be modified');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('items must contain at least 1 elements');
    }

    await this.prisma.$transaction(
      dto.items.map((it) =>
        this.prisma.maintenanceReportItem.updateMany({
          where: { id: it.id, companyId, reportId },
          data: {
            status: it.status ?? undefined,
            resultNotes: it.resultNotes ?? undefined,
            resultValue: it.resultValue ?? undefined,
          },
        }),
      ),
    );

    return this.getById(tenant, reportId);
  }

  async finalize(tenant: Tenant, reportId: string) {
    const { companyId } = tenant;

    const report = await this.prisma.maintenanceReport.findFirst({
      where: { id: reportId, companyId },
      include: { items: true },
    });

    if (!report) throw new NotFoundException('MaintenanceReport not found');
    if (report.state === MaintenanceReportState.FINAL) return report;

    if (!report.items || report.items.length === 0) {
      throw new ConflictException('Cannot finalize report without items');
    }

    const hasPending = report.items.some(
      (i) => i.status === MaintenanceReportItemStatus.PENDING,
    );
    if (hasPending) {
      throw new BadRequestException(
        'Cannot finalize report with PENDING items',
      );
    }

    return this.prisma.maintenanceReport.update({
      where: { id: reportId },
      data: {
        state: MaintenanceReportState.FINAL,
        finalizedAt: new Date(),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }
}
