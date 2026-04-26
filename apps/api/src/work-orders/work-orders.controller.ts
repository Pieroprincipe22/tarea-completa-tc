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
  Req,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { QueryWorkOrdersDto } from './dto/query-work-orders.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

type RequestWithUser = {
  user?: {
    id?: string;
    userId?: string;
    companyId?: string;
    company?: {
      id?: string;
    };
    activeCompanyId?: string;
  };
  headers?: {
    [key: string]: string | string[] | undefined;
  };
};

type AssignWorkOrderBody = {
  assignedToId?: string;
};

type UpdateStatusBody = {
  status?: string;
};

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  private getCompanyId(req: RequestWithUser): string {
    const headerCompanyId = req.headers?.['x-company-id'];
    const normalizedHeaderCompanyId = Array.isArray(headerCompanyId)
      ? headerCompanyId[0]
      : headerCompanyId;

    const companyId =
      req.user?.companyId ??
      req.user?.activeCompanyId ??
      req.user?.company?.id ??
      normalizedHeaderCompanyId;

    if (!companyId) {
      throw new BadRequestException(
        'No se pudo resolver la empresa activa para esta operación',
      );
    }

    return companyId;
  }

  @Get()
  list(@Req() req: RequestWithUser, @Query() query: QueryWorkOrdersDto) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.list(companyId, query);
  }

  @Get(':id')
  get(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.get(companyId, id);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateWorkOrderDto) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.create(companyId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateStatusBody,
  ) {
    const companyId = this.getCompanyId(req);

    if (!body.status) {
      throw new BadRequestException('Falta el estado de la orden');
    }

    return this.workOrders.updateStatus(companyId, id, body.status);
  }

  @Patch(':id/assign')
  assign(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: AssignWorkOrderBody,
  ) {
    const companyId = this.getCompanyId(req);

    if (!body.assignedToId) {
      throw new BadRequestException('Falta el ID del técnico asignado');
    }

    return this.workOrders.assign(companyId, id, body.assignedToId);
  }

  @Patch(':id/start')
  start(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.start(companyId, id);
  }

  @Patch(':id/done')
  markDone(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.markDone(companyId, id);
  }

  @Patch(':id/mark-done')
  markDoneAlias(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.markDone(companyId, id);
  }

  @Patch(':id/reopen')
  reopen(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.reopen(companyId, id);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.cancel(companyId, id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    const companyId = this.getCompanyId(req);
    return this.workOrders.remove(companyId, id);
  }
}