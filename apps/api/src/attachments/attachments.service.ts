import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentOwnerType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

function sanitizeFilename(name: string) {
  return name.replace(/\\/g, '/').split('/').pop()!.replace(/[^\w.\-()]+/g, '_');
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async assertWorkOrderTenant(companyId: string, workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, companyId },
      select: { id: true },
    });

    if (!workOrder) {
      throw new NotFoundException('WorkOrder not found');
    }
  }

  async listWorkOrderAttachments(companyId: string, workOrderId: string) {
    await this.assertWorkOrderTenant(companyId, workOrderId);

    const items = await this.prisma.attachment.findMany({
      where: {
        companyId,
        ownerType: AttachmentOwnerType.WORK_ORDER,
        ownerId: workOrderId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return items.map((item) => ({
      id: item.id,
      originalName: item.fileName,
      mime: item.mimeType,
      size: item.sizeBytes,
      createdAt: item.createdAt,
    }));
  }

  async uploadWorkOrderAttachment(
    companyId: string,
    _userId: string,
    workOrderId: string,
    file: Express.Multer.File,
  ) {
    await this.assertWorkOrderTenant(companyId, workOrderId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('File buffer missing');
    }

    const safeName = sanitizeFilename(file.originalname || 'file');

    const created = await this.prisma.attachment.create({
      data: {
        companyId,
        ownerType: AttachmentOwnerType.WORK_ORDER,
        ownerId: workOrderId,
        workOrderId,
        fileName: safeName,
        fileUrl: 'PENDING',
        mimeType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size ?? file.buffer.length,
      },
      select: { id: true },
    });

    const objectKey = `company/${companyId}/work-orders/${workOrderId}/${created.id}-${safeName}`;

    await this.storage.putObject(objectKey, file.buffer, file.mimetype);

    const saved = await this.prisma.attachment.update({
      where: { id: created.id },
      data: { fileUrl: objectKey },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return {
      id: saved.id,
      originalName: saved.fileName,
      mime: saved.mimeType,
      size: saved.sizeBytes,
      createdAt: saved.createdAt,
    };
  }

  async getAttachmentUrl(companyId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, companyId },
      select: { fileUrl: true },
    });

    if (!att) {
      throw new NotFoundException('Attachment not found');
    }

    const url = await this.storage.getSignedUrl(att.fileUrl);
    return { url };
  }
}