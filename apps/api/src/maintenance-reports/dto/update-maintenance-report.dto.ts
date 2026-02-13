import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateMaintenanceReportDto {
  @IsOptional()
  @IsISO8601()
  performedAt?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
