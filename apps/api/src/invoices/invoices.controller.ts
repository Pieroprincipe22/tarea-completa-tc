import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  create(@Tenant() t: TenantContext, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(t.companyId, dto);
  }

  @Get()
  list(@Tenant() t: TenantContext) {
    return this.invoices.list(t.companyId);
  }

  @Get(':id')
  get(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.invoices.get(t.companyId, id);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async getPdf(@Tenant() t: TenantContext, @Param('id') id: string) {
    const { buffer, filename } = await this.invoices.getPdfBuffer(t.companyId, id);
    return new StreamableFile(buffer, {
      disposition: `inline; filename="${filename}"`,
    });
  }

  @Patch(':id/status')
  updateStatus(
    @Tenant() t: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoices.updateStatus(t.companyId, id, dto.status);
  }
}