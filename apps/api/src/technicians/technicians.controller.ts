import { Controller, Get, Param } from '@nestjs/common';
import { TechniciansService } from './technicians.service';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('technicians')
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.technicians.list(t.companyId);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.technicians.get(t.companyId, id);
  }
}