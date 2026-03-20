import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { MaintenanceReportStatus } from '@prisma/client';

export class ListMaintenanceReportsQueryDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsEnum(MaintenanceReportStatus)
  status?: MaintenanceReportStatus;

  // Alias legacy para compatibilidad
  @IsOptional()
  @IsEnum(MaintenanceReportStatus)
  state?: MaintenanceReportStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}

export { ListMaintenanceReportsQueryDto as ListMaintenanceReportsQuery };