import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  create(@Headers('x-company-id') companyId: string, @Body() dto: CreateAssetDto) {
    return this.assets.create(companyId, dto);
  }
}