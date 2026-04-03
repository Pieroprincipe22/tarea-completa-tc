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
        filename: true,
        originalName: true,
        mimeType: true,
        contentType: true,
        sizeBytes: true,
        size: true,
        createdAt: true,
      },
    });

    return items.map((item) => ({
      id: item.id,
      originalName: item.originalName ?? item.fileName ?? item.filename,
      mime: item.mimeType ?? item.contentType,
      size: item.sizeBytes ?? item.size,
      createdAt: item.createdAt,
    }));
  }

  async uploadWorkOrderAttachment(
    companyId: string,
    userId: string,
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
        fileName: safeName,
        filename: safeName,
        originalName: file.originalname || safeName,
        mimeType: file.mimetype || 'application/octet-stream',
        contentType: file.mimetype || 'application/octet-stream',
        sizeBytes: file.size ?? file.buffer.length,
        size: file.size ?? file.buffer.length,
        uploadedByUserId: userId,
        storageKey: 'PENDING',
      },
      select: { id: true },
    });

    const objectKey = `company/${companyId}/work-orders/${workOrderId}/${created.id}-${safeName}`;

    await this.storage.putObject(objectKey, file.buffer, file.mimetype);

    const saved = await this.prisma.attachment.update({
      where: { id: created.id },
      data: {
        storageKey: objectKey,
        url: objectKey,
      },
      select: {
        id: true,
        fileName: true,
        filename: true,
        originalName: true,
        mimeType: true,
        contentType: true,
        sizeBytes: true,
        size: true,
        createdAt: true,
      },
    });

    return {
      id: saved.id,
      originalName: saved.originalName ?? saved.fileName ?? saved.filename,
      mime: saved.mimeType ?? saved.contentType,
      size: saved.sizeBytes ?? saved.size,
      createdAt: saved.createdAt,
    };
  }

  async getAttachmentUrl(companyId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, companyId },
      select: { storageKey: true, url: true },
    });

    if (!att) {
      throw new NotFoundException('Attachment not found');
    }

    const objectKey = att.storageKey ?? att.url;

    if (!objectKey) {
      throw new NotFoundException('Attachment sin storageKey/url');
    }

    const url = await this.storage.getSignedUrl(objectKey);
    return { url };
  }
}