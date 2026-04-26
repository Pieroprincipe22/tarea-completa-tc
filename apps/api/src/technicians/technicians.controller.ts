import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
} from '@nestjs/common';
import { TechniciansService } from './technicians.service';

function requiredHeader(value: string | string[] | undefined, name: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized?.trim()) {
    throw new BadRequestException(`Falta header ${name}`);
  }

  return normalized.trim();
}

@Controller('technicians')
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Get()
  list(@Headers('x-company-id') companyIdHeader: string | undefined) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.technicians.list(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id') id: string,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.technicians.get(companyId, id);
  }
}