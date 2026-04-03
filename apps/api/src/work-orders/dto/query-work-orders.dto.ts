import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkOrderStatus } from '@prisma/client';

export class QueryWorkOrdersDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

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
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}