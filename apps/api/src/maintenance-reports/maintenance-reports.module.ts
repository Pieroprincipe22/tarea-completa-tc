import { Module } from '@nestjs/common';
import { MaintenanceReportsController } from './maintenance-reports.controller';
import { MaintenanceReportsService } from './maintenance-reports.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [MaintenanceReportsController],
  providers: [MaintenanceReportsService, PrismaService],
})
export class MaintenanceReportsModule {}
