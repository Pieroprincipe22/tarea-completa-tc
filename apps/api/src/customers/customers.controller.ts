import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('customers')
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  // Dar de alta clientes es cosa de la oficina.
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
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