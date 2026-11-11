import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits.module';
import { MaintenanceTemplatesModule } from '../maintenance-templates/maintenance-templates.module';
import { RoundsModule } from '../rounds/rounds.module';
import { MaintenanceSetupController } from './maintenance-setup.controller';
import { MaintenanceSetupService } from './maintenance-setup.service';

@Module({
  imports: [PlanLimitsModule, MaintenanceTemplatesModule, RoundsModule],
  providers: [MaintenanceSetupService],
  controllers: [MaintenanceSetupController],
})
export class MaintenanceSetupModule {}