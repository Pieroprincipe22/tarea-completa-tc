import { Module } from '@nestjs/common';
import { NumberingModule } from '../numbering/numbering.module';
import { MaintenancePlansController } from './maintenance-plans.controller';
import { MaintenancePlansService } from './maintenance-plans.service';
import { PlanSchedulerService } from './plan-scheduler.service';
import { RoundWorkService } from './round-work.service';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';

@Module({
  imports: [NumberingModule],
  providers: [RoundsService, RoundWorkService, MaintenancePlansService, PlanSchedulerService],
  controllers: [MaintenancePlansController, RoundsController],
  exports: [MaintenancePlansService, RoundsService],
})
export class RoundsModule {}