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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

function requiredHeader(value: string | string[] | undefined, name: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized?.trim()) {
    throw new BadRequestException(`Falta header ${name}`);
  }

  return normalized.trim();
}

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(@Headers('x-company-id') companyIdHeader: string | undefined) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.assets.list(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.assets.get(companyId, id);
  }

  @Post()
  create(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Body() dto: CreateAssetDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.assets.create(companyId, dto);
  }
}