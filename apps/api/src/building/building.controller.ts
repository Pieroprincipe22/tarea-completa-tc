import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { BuildingService } from './building.service';
import {
  CreateFloorDto,
  CreateSpaceDto,
  GenerateRoomsDto,
  UpdateFloorDto,
  UpdateSpaceDto,
} from './dto/building.dto';

// Todos los miembros de la empresa ven el edificio (el técnico necesita
// saber dónde está cada equipo); solo el administrador lo cambia.
@Controller('sites/:siteId/building')
@UseGuards(RolesGuard)
export class BuildingController {
  constructor(private readonly building: BuildingService) {}

  @Get()
  get(@Tenant() t: TenantContext, @Param('siteId') siteId: string) {
    return this.building.get(t.companyId, siteId);
  }

  @Post('generate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  generate(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Body() dto: GenerateRoomsDto,
  ) {
    return this.building.generate(t.companyId, siteId, dto);
  }

  @Post('floors')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createFloor(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Body() dto: CreateFloorDto,
  ) {
    return this.building.createFloor(t.companyId, siteId, dto);
  }

  @Patch('floors/:floorId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateFloor(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('floorId') floorId: string,
    @Body() dto: UpdateFloorDto,
  ) {
    return this.building.updateFloor(t.companyId, siteId, floorId, dto);
  }

  @Delete('floors/:floorId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteFloor(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('floorId') floorId: string,
  ) {
    return this.building.deleteFloor(t.companyId, siteId, floorId);
  }

  @Post('spaces')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createSpace(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Body() dto: CreateSpaceDto,
  ) {
    return this.building.createSpace(t.companyId, siteId, dto);
  }

  @Patch('spaces/:spaceId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateSpace(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('spaceId') spaceId: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.building.updateSpace(t.companyId, siteId, spaceId, dto);
  }

  @Delete('spaces/:spaceId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteSpace(
    @Tenant() t: TenantContext,
    @Param('siteId') siteId: string,
    @Param('spaceId') spaceId: string,
  ) {
    return this.building.deleteSpace(t.companyId, siteId, spaceId);
  }
}