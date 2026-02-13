import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { MaintenanceReportState } from '@prisma/client';

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
  @IsEnum(MaintenanceReportState)
  state?: MaintenanceReportState;

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

// Alias para que el service pueda importar ListMaintenanceReportsQuery
export { ListMaintenanceReportsQueryDto as ListMaintenanceReportsQuery };
