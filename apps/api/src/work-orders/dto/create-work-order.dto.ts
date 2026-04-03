import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  customerId!: string;

  @IsString()
  siteId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @IsOptional()
  @IsString()
  maintenanceTemplateId?: string;

  @IsOptional()
  priority?: string | number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  code?: string;
}