import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TenantGuard } from '../common/tenant.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

type AuthedRequest = Request & { companyId?: string };

@Controller('customers')
@UseGuards(TenantGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateCustomerDto) {
    return this.customers.create(req.companyId!, dto);
  }

  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.customers.findAll(req.companyId!);
  }
}
