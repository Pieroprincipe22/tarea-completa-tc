import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('assets')
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
}