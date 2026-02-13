import { Module } from '@nestjs/common';
import { MaintenanceTemplatesController } from './maintenance-templates.controller';
import { MaintenanceTemplatesService } from './maintenance-templates.service';

@Module({
  controllers: [MaintenanceTemplatesController],
  providers: [MaintenanceTemplatesService],
})
export class MaintenanceTemplatesModule {}
