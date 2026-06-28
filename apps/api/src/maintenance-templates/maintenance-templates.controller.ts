import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MaintenanceTemplatesService } from './maintenance-templates.service';
import { CreateMaintenanceTemplateDto } from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('maintenance-templates')
export class MaintenanceTemplatesController {
  constructor(private readonly service: MaintenanceTemplatesService) {}

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateMaintenanceTemplateDto) {
    return this.service.create(t.companyId, dto);
  }

  @Get()
  findAll(
    @Tenant() t: TenantContext,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.service.findAll(t.companyId, includeArchived === 'true');
  }

  @Get(':id')
  findOne(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.findOne(t.companyId, id);
  }

  @Patch(':id')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceTemplateDto,
  ) {
    return this.service.update(t.companyId, id, dto);
  }

  @Delete(':id')
  archive(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.archive(t.companyId, id);
  }
}