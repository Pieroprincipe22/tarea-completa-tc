import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { CreatePlanDto, UpdatePlanDto } from './dto/rounds.dto';
import { MaintenancePlansService } from './maintenance-plans.service';

// El plan preventivo de un sitio: solo lo ve y lo cambia el administrador.
@Controller('sites/:siteId/plans')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MaintenancePlansController {
  constructor(private readonly plans: MaintenancePlansService) {}

  @Get()
  overview(@Tenant() t: TenantContext, @Param('siteId') siteId: string) {
    return this.plans.overview(t.companyId, siteId, t);
  }

  @Post()
  create(@Tenant() t: TenantContext, @Param('siteId') siteId: string, @Body() dto: CreatePlanDto) {
    return this.plans.create(t.companyId, siteId, dto);
  }

  @Patch(':planId')
  update(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plans.update(t.companyId, siteId, planId, dto);
  }

  @Delete(':planId')
  remove(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('planId') planId: string,
  ) {
    return this.plans.remove(t.companyId, siteId, planId);
  }

  // Crear ya la próxima ronda, sin esperar a su fecha.
  @Post(':planId/run')
  run(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('planId') planId: string,
  ) {
    return this.plans.runNow(t.companyId, siteId, planId, t.userId);
  }
}