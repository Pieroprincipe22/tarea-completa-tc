import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [PlanLimitsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}