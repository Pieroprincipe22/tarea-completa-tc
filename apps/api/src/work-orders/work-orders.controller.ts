import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';

type TenantRequest = Request & {
  companyId: string;
  userId: string;
  role?: string;
};

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  list(@Req() req: TenantRequest, @Query() query: QueryWorkOrdersDto) {
    return this.service.list(req.companyId, query);
  }

  @Get(':id')
  get(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.get(req.companyId, id);
  }

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateWorkOrderDto) {
    return this.service.create(req.companyId, req.userId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.service.update(req.companyId, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @Req() req: TenantRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.service.setStatus(req.companyId, id, dto.status);
  }
}