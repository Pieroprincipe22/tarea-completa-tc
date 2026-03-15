import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  create(
    @Headers('x-company-id') companyId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(companyId, dto);
  }

  @Get()
  list(@Headers('x-company-id') companyId: string) {
    return this.customers.list(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyId: string,
    @Param('id') id: string,
  ) {
    return this.customers.get(companyId, id);
  }
}