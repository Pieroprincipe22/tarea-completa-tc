import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { Tenant, TenantContext } from '../common/tenant.decorator';
import { imageAndPdfUploadOptions } from '../common/file-upload';

@Controller('work-orders/:workOrderId/attachments')
export class WorkOrderAttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get()
  list(@Tenant() t: TenantContext, @Param('workOrderId') workOrderId: string) {
    return this.service.listWorkOrderAttachments(t.companyId, workOrderId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', imageAndPdfUploadOptions))
  upload(
    @Tenant() t: TenantContext,
    @Param('workOrderId') workOrderId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadWorkOrderAttachment(
      t.companyId,
      t.userId,
      workOrderId,
      file,
    );
  }
}