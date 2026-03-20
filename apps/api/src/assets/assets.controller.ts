import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(@Headers('x-company-id') companyId: string) {
    return this.assets.list(companyId);
  }

  @Post()
  create(@Headers('x-company-id') companyId: string, @Body() dto: CreateAssetDto) {
    return this.assets.create(companyId, dto);
  }
}