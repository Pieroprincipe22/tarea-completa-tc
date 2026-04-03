import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
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
  valueText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valueNumber?: number;

  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;

  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @IsOptional()
  valueJson?: unknown;

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