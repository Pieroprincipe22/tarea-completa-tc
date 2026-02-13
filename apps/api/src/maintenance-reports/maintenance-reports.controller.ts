import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../common/tenant.guard';
import { getTenant } from '../common/tenant-context';
import type { TenantRequest } from '../common/tenant-context';
import { MaintenanceReportsService } from './maintenance-reports.service';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import { UpdateMaintenanceReportItemsDto } from './dto/update-maintenance-report-items.dto';
import { ListMaintenanceReportsQueryDto } from './dto/list-maintenance-reports.query';

@Controller('maintenance-reports')
@UseGuards(TenantGuard)
export class MaintenanceReportsController {
  constructor(private readonly service: MaintenanceReportsService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateMaintenanceReportDto) {
    return this.service.createFromTemplate(getTenant(req), dto);
  }

  @Get()
  list(
    @Req() req: TenantRequest,
    @Query() query: ListMaintenanceReportsQueryDto,
  ) {
    return this.service.list(getTenant(req), query);
  }

  @Get(':id')
  get(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.getById(getTenant(req), id);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceReportDto,
  ) {
    return this.service.updateHeader(getTenant(req), id, dto);
  }

  @Patch(':id/items')
  patchItems(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceReportItemsDto,
  ) {
    return this.service.patchItems(getTenant(req), id, dto);
  }

  @Post(':id/finalize')
  finalize(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.service.finalize(getTenant(req), id);
  }
}
