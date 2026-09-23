import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [PlanLimitsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
