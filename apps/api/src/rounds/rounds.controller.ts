import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import {
  CloseRoundDto,
  CreateRoundDto,
  ReturnRoundDto,
  SaveStopDto,
  SetTechniciansDto,
} from './dto/rounds.dto';
import { RoundWorkService } from './round-work.service';
import { RoundsService } from './rounds.service';

// El administrador ve todas las rondas; el técnico, las que tiene asignadas.
@Controller()
@UseGuards(RolesGuard)
export class RoundsController {
  constructor(
    private readonly rounds: RoundsService,
    private readonly work: RoundWorkService,
  ) {}

  @Get('rounds')
  list(@Tenant() t: TenantContext, @Query('siteId') siteId?: string) {
    return this.rounds.list(t.companyId, { siteId: siteId?.trim() || undefined }, t);
  }

  // Una ronda suelta, sin plan.
  @Post('rounds')
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Tenant() t: TenantContext, @Body() dto: CreateRoundDto) {
    return this.rounds.createManual(t.companyId, dto, t.userId);
  }

  @Get('rounds/:id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.rounds.get(t.companyId, id, t);
  }

  @Get('rounds/:id/stops/:stopId')
  getStop(@Tenant() t: TenantContext, @Param('id') id: string, @Param('stopId') stopId: string) {
    return this.rounds.getStop(t.companyId, id, stopId, t);
  }

  // ---- Los técnicos ----

  @Post('rounds/:id/start')
  start(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.work.start(t.companyId, id, t);
  }

  // La ronda entera, para trabajar en el móvil sin cobertura.
  @Get('rounds/:id/sheet')
  sheet(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.work.sheet(t.companyId, id, t);
  }

  @Patch('rounds/:id/stops/:stopId')
  saveStop(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @Body() dto: SaveStopDto,
  ) {
    return this.work.saveStop(t.companyId, id, stopId, dto, t);
  }

  @Post('rounds/:id/submit')
  submit(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.work.submit(t.companyId, id, t);
  }

  // ---- El encargado y la oficina ----

  @Post('rounds/:id/approve')
  @Roles('ADMIN', 'SUPER_ADMIN')
  approve(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: CloseRoundDto) {
    return this.rounds.approve(t.companyId, id, t, dto.note ?? null);
  }

  @Post('rounds/:id/return')
  @Roles('ADMIN', 'SUPER_ADMIN')
  returnToTeam(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: ReturnRoundDto) {
    return this.rounds.returnToTeam(t.companyId, id, t, dto.note);
  }

  @Patch('rounds/:id/technicians')
  @Roles('ADMIN', 'SUPER_ADMIN')
  setTechnicians(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: SetTechniciansDto,
  ) {
    return this.rounds.setTechnicians(t.companyId, id, dto.technicianIds, t);
  }

  // Cerrar sin terminar (la oficina).
  @Post('rounds/:id/close')
  @Roles('ADMIN', 'SUPER_ADMIN')
  close(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: CloseRoundDto) {
    return this.rounds.close(t.companyId, id, t, dto.note ?? null);
  }

  @Post('rounds/:id/reopen')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reopen(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.rounds.reopen(t.companyId, id, t);
  }

  @Post('rounds/:id/cancel')
  @Roles('ADMIN', 'SUPER_ADMIN')
  cancel(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.rounds.cancel(t.companyId, id, t);
  }

  // Lo que se le ha hecho a un equipo: rondas, partes y su plan.
  @Get('assets/:assetId/history')
  history(@Tenant() t: TenantContext, @Param('assetId') assetId: string) {
    return this.rounds.assetHistory(t.companyId, assetId);
  }
}