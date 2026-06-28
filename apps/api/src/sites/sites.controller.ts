import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateSiteDto) {
    return this.sites.create(t.companyId, dto);
  }

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.sites.list(t.companyId);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.sites.get(t.companyId, id);
  }
}