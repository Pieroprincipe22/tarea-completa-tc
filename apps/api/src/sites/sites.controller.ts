import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';

function requiredHeader(value: string | string[] | undefined, name: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized?.trim()) {
    throw new BadRequestException(`Falta header ${name}`);
  }

  return normalized.trim();
}

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Post()
  create(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Body() dto: CreateSiteDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.sites.create(companyId, dto);
  }

  @Get()
  list(@Headers('x-company-id') companyIdHeader: string | undefined) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.sites.list(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.sites.get(companyId, id);
  }
}