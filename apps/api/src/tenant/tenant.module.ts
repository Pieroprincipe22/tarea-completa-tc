import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantGuard } from '../common/tenant.guard';
import { TenantController } from './tenant.controller';

@Module({
  imports: [AuthModule],
  controllers: [TenantController],
  providers: [TenantGuard],
  exports: [TenantGuard],
})
export class TenantModule {}