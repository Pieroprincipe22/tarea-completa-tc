import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MaintenanceReportsController } from './maintenance-reports.controller';
import { MaintenanceReportsService } from './maintenance-reports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MaintenanceReportsController],
  providers: [MaintenanceReportsService],
})
export class MaintenanceReportsModule {}