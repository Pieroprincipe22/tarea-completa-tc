import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetsModule } from './assets/assets.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CompanyUsersModule } from './company-users/company-users.module';
import { ContactsModule } from './contacts/contacts.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { MaintenanceReportsModule } from './maintenance-reports/maintenance-reports.module';
import { MaintenanceTemplatesModule } from './maintenance-templates/maintenance-templates.module';
import { SitesModule } from './sites/sites.module';
import { TechniciansModule } from './technicians/technicians.module';
import { TenantModule } from './tenant/tenant.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    // Límite global generoso: protege sin molestar el uso normal del dashboard.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 segundos
        limit: 120, // 120 peticiones por minuto por IP
      },
    ]),
    DatabaseModule,
    AuthModule,
    TenantModule,
    CompaniesModule,
    CustomersModule,
    SitesModule,
    ContactsModule,
    AssetsModule,
    TechniciansModule,
    CompanyUsersModule,
    MaintenanceTemplatesModule,
    MaintenanceReportsModule,
    WorkOrdersModule,
    AttachmentsModule,
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Activa el rate limiting de forma global.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}