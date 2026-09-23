import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits.module';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [PlanLimitsModule],
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
