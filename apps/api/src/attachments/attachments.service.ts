import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, companyId },
      select: { id: true },
    });
    if (!wo) throw new NotFoundException('WorkOrder not found');
  }

  async listWorkOrderAttachments(companyId: string, workOrderId: string) {
    await this.assertWorkOrderTenant(companyId, workOrderId);

    return this.prisma.attachment.findMany({
      where: {
        companyId,
        entityType: 'WORK_ORDER',
        entityId: workOrderId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        mime: true,
        size: true,
        createdAt: true,
        createdByUserId: true,
      },
    });
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

    // 1) Creamos el Attachment primero para obtener attachmentId
    const created = await this.prisma.attachment.create({
      data: {
        companyId,
        entityType: 'WORK_ORDER',
        entityId: workOrderId,
        objectKey: 'PENDING',
        mime: file.mimetype || 'application/octet-stream',
        size: file.size ?? file.buffer.length,
        originalName: safeName,
        createdByUserId: userId,
      },
      select: { id: true },
    });

    // 2) Subimos a storage con key estable
    const objectKey = `company/${companyId}/work-orders/${workOrderId}/${created.id}-${safeName}`;

    await this.storage.putObject(objectKey, file.buffer, file.mimetype);

    // 3) Actualizamos objectKey
    return this.prisma.attachment.update({
      where: { id: created.id },
      data: { objectKey },
      select: {
        id: true,
        originalName: true,
        mime: true,
        size: true,
        createdAt: true,
        createdByUserId: true,
      },
    });
  }

  async getAttachmentUrl(companyId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, companyId },
      select: { objectKey: true },
    });

    if (!att) throw new NotFoundException('Attachment not found');

    const url = await this.storage.getSignedUrl(att.objectKey);
    return { url };
  }
}