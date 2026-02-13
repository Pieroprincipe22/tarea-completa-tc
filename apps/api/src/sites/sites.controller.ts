import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantGuard } from '../common/tenant.guard';
import { CreateSiteDto } from './dto/create-site.dto';
import { SitesService } from './sites.service';

type AuthedRequest = Request & { companyId?: string };

@Controller('sites')
@UseGuards(TenantGuard)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateSiteDto) {
    return this.sites.create(req.companyId!, dto);
  }

  @Get()
  findAll(@Req() req: AuthedRequest, @Query('customerId') customerId?: string) {
    return this.sites.findAll(req.companyId!, customerId);
  }
}
