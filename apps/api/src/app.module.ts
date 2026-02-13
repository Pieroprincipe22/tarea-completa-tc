import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { HealthController } from './health/health.controller';
import { CompaniesModule } from './companies/companies.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { CustomersModule } from './customers/customers.module';
import { SitesModule } from './sites/sites.module';
import { ContactsModule } from './contacts/contacts.module';
import { AssetsModule } from './assets/assets.module';
import { MaintenanceTemplatesModule } from './maintenance-templates/maintenance-templates.module';
import { MaintenanceReportsModule } from './maintenance-reports/maintenance-reports.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule,
    AuthModule,
    TenantModule,
    CustomersModule,
    SitesModule,
    ContactsModule,
    AssetsModule,
    MaintenanceTemplatesModule,
    MaintenanceReportsModule,
    WorkOrdersModule,
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
