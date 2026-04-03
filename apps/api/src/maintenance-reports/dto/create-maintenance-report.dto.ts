import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMaintenanceReportDto {
  @IsString()
  templateId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}