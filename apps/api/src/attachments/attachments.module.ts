import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { PlanLimitsModule } from '../common/plan-limits.module';

import { AttachmentsService } from './attachments.service';
import { WorkOrderAttachmentsController } from './work-order-attachments.controller';
import { AttachmentsController } from './attachments.controller';

@Module({
  imports: [PrismaModule, StorageModule, PlanLimitsModule],
  controllers: [WorkOrderAttachmentsController, AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}