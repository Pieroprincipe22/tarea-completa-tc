import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { CreateMaintenanceTemplateDto } from './dto/create-maintenance-template.dto';
import { UpdateMaintenanceTemplateDto } from './dto/update-maintenance-template.dto';
import { MaintenanceTemplatesService } from './maintenance-templates.service';

// Todos los miembros de la empresa pueden ver las plantillas (los técnicos
// las necesitan para rellenar partes); solo el administrador las cambia.
@Controller('maintenance-templates')
@UseGuards(RolesGuard)
export class MaintenanceTemplatesController {
  constructor(private readonly service: MaintenanceTemplatesService) {}

  @Get()
  findAll(@Tenant() t: TenantContext, @Query('includeArchived') includeArchived?: string) {
    return this.service.findAll(t.companyId, includeArchived === 'true');
  }

  @Get(':id')
  findOne(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.findOne(t.companyId, id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Tenant() t: TenantContext, @Body() dto: CreateMaintenanceTemplateDto) {
    return this.service.create(t.companyId, dto);
  }

  @Post(':id/duplicate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  duplicate(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.duplicate(t.companyId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceTemplateDto,
  ) {
    return this.service.update(t.companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  archive(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.archive(t.companyId, id);
  }
}