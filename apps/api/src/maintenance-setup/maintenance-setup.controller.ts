import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { MaintenanceSetupDto } from './dto/maintenance-setup.dto';
import { MaintenanceSetupService } from './maintenance-setup.service';

// Preparar el mantenimiento de un hotel es cosa de la oficina.
@Controller('maintenance')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MaintenanceSetupController {
  constructor(private readonly setup: MaintenanceSetupService) {}

  // Los hoteles y cómo va su mantenimiento.
  @Get()
  list(@Tenant() t: TenantContext) {
    return this.setup.list(t.companyId);
  }

  // Lo que necesita el asistente para un hotel.
  @Get('sites/:siteId')
  context(@Tenant() t: TenantContext, @Param('siteId') siteId: string) {
    return this.setup.context(t.companyId, siteId);
  }

  // Lo deja preparado (o, con dryRun, dice lo que haría).
  @Post('sites/:siteId')
  run(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Body() dto: MaintenanceSetupDto,
  ) {
    return this.setup.setup(t.companyId, siteId, dto);
  }
}