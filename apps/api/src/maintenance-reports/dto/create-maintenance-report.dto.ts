import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMaintenanceReportDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  siteId!: string;

  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}