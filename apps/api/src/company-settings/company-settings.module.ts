import { Module } from '@nestjs/common';
import { NumberingModule } from '../numbering/numbering.module';
import { StorageModule } from '../storage/storage.module';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';

@Module({
  imports: [StorageModule, NumberingModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
})
export class CompanySettingsModule {}