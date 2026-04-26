import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}