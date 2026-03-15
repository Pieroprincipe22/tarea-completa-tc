import { Controller, Get, Param } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get(':id/url')
  getUrl(@Tenant() t: TenantContext, @Param('id') id: string) {
    return this.service.getAttachmentUrl(t.companyId, id);
  }
}