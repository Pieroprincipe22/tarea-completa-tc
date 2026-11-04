import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('assets')
@UseGuards(RolesGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.assets.list(t.companyId);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.assets.get(t.companyId, id);
  }

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateAssetDto) {
    return this.assets.create(t.companyId, dto);
  }

  // Cambiar datos o mover el equipo de habitación: solo el administrador.
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Tenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(t.companyId, id, dto);
  }
}