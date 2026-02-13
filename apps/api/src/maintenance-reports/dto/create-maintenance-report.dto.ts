import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMaintenanceReportDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsISO8601()
  performedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
