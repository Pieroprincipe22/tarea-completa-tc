import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Post()
  create(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateSiteDto,
  ) {
    return this.sites.create(companyId, dto);
  }

  @Get()
  list(@Headers('x-company-id') companyId: string) {
    return this.sites.list(companyId);
  }

  @Get(':id')
  get(@Headers('x-company-id') companyId: string, @Param('id') id: string) {
    return this.sites.get(companyId, id);
  }
}