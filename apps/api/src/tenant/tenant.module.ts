import { Module } from '@nestjs/common';
import { TenantGuard } from '../common/tenant.guard';
import { TenantController } from './tenant.controller';

@Module({
  controllers: [TenantController],
  providers: [TenantGuard],
  exports: [TenantGuard],
})
export class TenantModule {}