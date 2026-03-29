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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

function requiredHeader(value: string | string[] | undefined, name: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized?.trim()) {
    throw new BadRequestException(`Falta header ${name}`);
  }

  return normalized.trim();
}

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  create(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Body() dto: CreateCustomerDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.customers.create(companyId, dto);
  }

  @Get()
  list(@Headers('x-company-id') companyIdHeader: string | undefined) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.customers.list(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.customers.get(companyId, id);
  }
}