import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { MaintenanceReportsService } from './maintenance-reports.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportItemDto } from './dto/update-maintenance-report-items.dto';

@Controller('maintenance-reports')
export class MaintenanceReportsController {
  constructor(private readonly service: MaintenanceReportsService) {}

  @Get()
  list(@Headers('x-company-id') companyId: string) {
    return this.service.list(companyId);
  }

  @Get('work-order/:workOrderId')
  listByWorkOrderId(
    @Headers('x-company-id') companyId: string,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.service.listByWorkOrderId(companyId, workOrderId);
  }

  @Post()
  create(
    @Headers('x-company-id') companyId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateMaintenanceReportDto,
  ) {
    return this.service.createFromTemplate(companyId, userId, dto);
  }

  @Get(':id')
  get(@Headers('x-company-id') companyId: string, @Param('id') id: string) {
    return this.service.getById(companyId, id);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Headers('x-company-id') companyId: string,
    @Param('id') reportId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMaintenanceReportItemDto,
  ) {
    return this.service.updateItem(companyId, reportId, itemId, dto);
  }

  @Post(':id/finalize')
  finalize(
    @Headers('x-company-id') companyId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.finalize(companyId, id, userId);
  }
}