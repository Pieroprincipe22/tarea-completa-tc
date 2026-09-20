import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { PdfModule } from '../pdf/pdf.module';
import { MaintenanceReportsController } from './maintenance-reports.controller';
import { MaintenanceReportsService } from './maintenance-reports.service';

@Module({
  imports: [DatabaseModule, StorageModule, PdfModule],
  controllers: [MaintenanceReportsController],
  providers: [MaintenanceReportsService],
})
export class MaintenanceReportsModule {}