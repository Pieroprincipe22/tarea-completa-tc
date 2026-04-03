import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkOrderStatus } from '@prisma/client';

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  siteId?: string;

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
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;
}