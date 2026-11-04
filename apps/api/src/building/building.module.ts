import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits.module';
import { BuildingController } from './building.controller';
import { BuildingService } from './building.service';

@Module({
  imports: [PlanLimitsModule],
  providers: [BuildingService],
  controllers: [BuildingController],
})
export class BuildingModule {}