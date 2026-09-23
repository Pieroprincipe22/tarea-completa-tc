import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits.module';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';

@Module({
  imports: [PlanLimitsModule],
  providers: [SitesService],
  controllers: [SitesController],
})
export class SitesModule {}
