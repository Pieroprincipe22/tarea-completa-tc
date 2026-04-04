import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewMaintenanceReportDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reviewNotes?: string;
}