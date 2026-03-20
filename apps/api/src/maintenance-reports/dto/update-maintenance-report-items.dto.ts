import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaintenanceItemStatus } from '@prisma/client';

export class UpdateMaintenanceReportItemDto {
  @IsOptional()
  @IsEnum(MaintenanceItemStatus)
  status?: MaintenanceItemStatus;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // aliases legacy para no romper llamadas viejas
  @IsOptional()
  @IsString()
  resultValue?: string;

  @IsOptional()
  @IsString()
  resultNotes?: string;
}