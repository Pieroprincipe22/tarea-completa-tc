import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MaintenanceReportsService } from './maintenance-reports.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { ReviewMaintenanceReportDto } from './dto/review-maintenance-report.dto';
import { UpdateMaintenanceReportItemDto } from './dto/update-maintenance-report-items.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('maintenance-reports')
export class MaintenanceReportsController {
  constructor(private readonly service: MaintenanceReportsService) {}

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.service.list(t.companyId);
  }

  @Get('work-order/:workOrderId')
  listByWorkOrderId(
    @Tenant() t: TenantContext,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.service.listByWorkOrderId(t.companyId, workOrderId);
  }

  @Post('work-order/:workOrderId/ensure')
  ensureForWorkOrder(
    @Tenant() t: TenantContext,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.service.ensureForWorkOrder(t.companyId, t.userId, workOrderId);
  }

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateMaintenanceReportDto) {
    return this.service.createFromTemplate(t.companyId, t.userId, dto);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.getById(t.companyId, id);
  }

  @Patch(':id')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceReportDto,
  ) {
    return this.service.updateReport(t.companyId, id, t.userId, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Tenant() t: TenantContext,
    @Param('id') reportId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMaintenanceReportItemDto,
  ) {
    return this.service.updateItem(t.companyId, reportId, itemId, dto);
  }

  @Post(':id/finalize')
  finalize(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.finalize(t.companyId, id, t.userId);
  }

  @Post(':id/review')
  review(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: ReviewMaintenanceReportDto,
  ) {
    return this.service.review(t.companyId, id, t.userId, dto);
  }
}