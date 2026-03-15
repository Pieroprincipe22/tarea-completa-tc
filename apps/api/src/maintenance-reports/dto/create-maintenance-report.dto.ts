import { IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsString()
  title?: string;
}