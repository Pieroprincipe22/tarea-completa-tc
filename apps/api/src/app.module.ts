import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetsModule } from './assets/assets.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { MaintenanceReportsModule } from './maintenance-reports/maintenance-reports.module';
import { MaintenanceTemplatesModule } from './maintenance-templates/maintenance-templates.module';
import { SitesModule } from './sites/sites.module';
import { TenantModule } from './tenant/tenant.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    // ✅ Config primero: carga .env antes de inicializar módulos que lo necesitan (Prisma/DB)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),

    // Infra / Core
    DatabaseModule,

    // Auth / Tenant
    AuthModule,
    TenantModule,

    // Domain
    CompaniesModule,
    CustomersModule,
    SitesModule,
    ContactsModule,
    AssetsModule,
    MaintenanceTemplatesModule,
    MaintenanceReportsModule,
    WorkOrdersModule,
    AttachmentsModule,

    // Admin al final (UI/operación)
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}