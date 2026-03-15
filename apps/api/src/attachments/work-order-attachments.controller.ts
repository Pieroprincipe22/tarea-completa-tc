import { Controller, Get, Headers, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { Tenant, TenantContext } from '../common/tenant.decorator';

@Controller('work-orders/:workOrderId/attachments')
export class WorkOrderAttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get()
  list(@Tenant() t: TenantContext, @Param('workOrderId') workOrderId: string) {
    return this.service.listWorkOrderAttachments(t.companyId, workOrderId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Tenant() t: TenantContext,
    @Param('workOrderId') workOrderId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Nota: multipart no pasa por whitelist DTO, pero sí debes enviar campo "file"
    return this.service.uploadWorkOrderAttachment(t.companyId, t.userId, workOrderId, file);
  }
}