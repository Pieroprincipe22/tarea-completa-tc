import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Tenant, TenantContext } from '../../common/tenant.decorator';
import { InventoryProductGuard } from '../inventory-product.guard';
import { CreateInventoryLocationDto, UpdateInventoryLocationDto } from './dto/location.dto';
import { InventoryLocationsService } from './inventory-locations.service';

@Controller('inventory/locations')
@UseGuards(InventoryProductGuard, RolesGuard)
export class InventoryLocationsController {
  constructor(private readonly locations: InventoryLocationsService) {}

  @Get()
  list(@Tenant() t: TenantContext, @Query('includeInactive') includeInactive?: string) {
    return this.locations.list(t.companyId, includeInactive === 'true');
  }

  @Get('by-code/:code')
  getByCode(@Tenant() t: TenantContext, @Param('code') code: string) {
    return this.locations.getByCode(t.companyId, code);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.locations.get(t.companyId, id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Tenant() t: TenantContext, @Body() dto: CreateInventoryLocationDto) {
    return this.locations.create(t.companyId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryLocationDto,
  ) {
    return this.locations.update(t.companyId, id, dto);
  }
}
