import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const maintenanceReportStatusValues = [
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'COMPLETED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type MaintenanceReportStatusValue =
  (typeof maintenanceReportStatusValues)[number];

export class ListMaintenanceReportsQueryDto {
  // IDs de Prisma (CUID), no UUID.
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum(maintenanceReportStatusValues)
  status?: MaintenanceReportStatusValue;

  // Alias legacy para compatibilidad
  @IsOptional()
  @IsEnum(maintenanceReportStatusValues)
  state?: MaintenanceReportStatusValue;

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