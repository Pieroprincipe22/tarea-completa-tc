import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { WorkOrdersService } from './work-orders.service';

import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';

function requiredHeader(value: string | string[] | undefined, name: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized?.trim()) {
    throw new BadRequestException(`Falta header ${name}`);
  }

  return normalized.trim();
}

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  list(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Query() query: QueryWorkOrdersDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.service.list(companyId, query);
  }

  @Get('meta/technicians')
  listTechnicians(@Headers('x-company-id') companyIdHeader: string | undefined) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.service.listTechnicians(companyId);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.service.get(companyId, id);
  }

  @Post()
  create(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() dto: CreateWorkOrderDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    const userId = requiredHeader(userIdHeader, 'x-user-id');
    return this.service.create(companyId, userId, dto);
  }

  @Patch(':id')
  update(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.service.update(companyId, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @Headers('x-company-id') companyIdHeader: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    const companyId = requiredHeader(companyIdHeader, 'x-company-id');
    return this.service.setStatus(companyId, id, dto.status);
  }
}