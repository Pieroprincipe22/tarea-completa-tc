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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

type AuthedRequest = Request & { companyId?: string };

@Controller('assets')
@UseGuards(TenantGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateAssetDto) {
    return this.assets.create(req.companyId!, dto);
  }

  @Get()
  findAll(@Req() req: AuthedRequest, @Query('siteId') siteId?: string) {
    return this.assets.findAll(req.companyId!, siteId);
  }
}
