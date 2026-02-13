import {
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

function requireHeader(name: string, v: string | string[] | undefined): string {
  const value = Array.isArray(v) ? v[0] : v;
  if (!value) throw new Error(`Missing required header: ${name}`);
  return value;
}

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  list(
    @Headers('x-company-id') companyIdRaw: string | string[] | undefined,
    @Headers('x-user-id') userIdRaw: string | string[] | undefined,
    @Query() query: QueryWorkOrdersDto,
  ) {
    const companyId = requireHeader('x-company-id', companyIdRaw);
    requireHeader('x-user-id', userIdRaw);
    return this.service.list(companyId, query);
  }

  @Get(':id')
  get(
    @Headers('x-company-id') companyIdRaw: string | string[] | undefined,
    @Headers('x-user-id') userIdRaw: string | string[] | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const companyId = requireHeader('x-company-id', companyIdRaw);
    requireHeader('x-user-id', userIdRaw);
    return this.service.get(companyId, id);
  }

  @Post()
  create(
    @Headers('x-company-id') companyIdRaw: string | string[] | undefined,
    @Headers('x-user-id') userIdRaw: string | string[] | undefined,
    @Body() dto: CreateWorkOrderDto,
  ) {
    const companyId = requireHeader('x-company-id', companyIdRaw);
    const userId = requireHeader('x-user-id', userIdRaw);
    return this.service.create(companyId, userId, dto);
  }

  @Patch(':id')
  update(
    @Headers('x-company-id') companyIdRaw: string | string[] | undefined,
    @Headers('x-user-id') userIdRaw: string | string[] | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    const companyId = requireHeader('x-company-id', companyIdRaw);
    requireHeader('x-user-id', userIdRaw);
    return this.service.update(companyId, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @Headers('x-company-id') companyIdRaw: string | string[] | undefined,
    @Headers('x-user-id') userIdRaw: string | string[] | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    const companyId = requireHeader('x-company-id', companyIdRaw);
    requireHeader('x-user-id', userIdRaw);
    return this.service.setStatus(companyId, id, dto.status);
  }
}
