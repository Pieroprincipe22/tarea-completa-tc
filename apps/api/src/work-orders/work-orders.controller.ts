import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

type AssignWorkOrderBody = {
  assignedToId?: string;
};

type UpdateStatusBody = {
  status?: string;
};

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  list(@Tenant() t: TenantContext, @Query() query: QueryWorkOrdersDto) {
    return this.workOrders.list(t.companyId, query);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.get(t.companyId, id);
  }

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateWorkOrderDto) {
    return this.workOrders.create(t.companyId, dto, t.userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() body: UpdateStatusBody,
  ) {
    if (!body.status) {
      throw new BadRequestException('Falta el estado de la orden');
    }

    return this.workOrders.updateStatus(t.companyId, id, body.status);
  }

  @Patch(':id/assign')
  assign(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() body: AssignWorkOrderBody,
  ) {
    if (!body.assignedToId) {
      throw new BadRequestException('Falta el ID del técnico asignado');
    }

    return this.workOrders.assign(t.companyId, id, body.assignedToId);
  }

  @Patch(':id/start')
  start(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.start(t.companyId, id);
  }

  @Patch(':id/done')
  markDone(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.markDone(t.companyId, id);
  }

  @Patch(':id/mark-done')
  markDoneAlias(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.markDone(t.companyId, id);
  }

  @Patch(':id/reopen')
  reopen(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.reopen(t.companyId, id);
  }

  @Patch(':id/cancel')
  cancel(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.cancel(t.companyId, id);
  }

  @Patch(':id')
  update(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrders.update(t.companyId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.workOrders.remove(t.companyId, id);
  }
}