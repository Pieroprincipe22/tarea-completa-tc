import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateCustomerDto) {
    return this.customers.create(t.companyId, dto);
  }

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.customers.list(t.companyId);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.customers.get(t.companyId, id);
  }
}