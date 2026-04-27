import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export class QueryWorkOrdersDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  /**
   * Nombre usado por el frontend técnico:
   * /work-orders?assignedToId=USER_ID
   */
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  /**
   * Campo real actual en Prisma para el usuario asignado.
   */
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  /**
   * Campo real actual en Prisma para el técnico asignado.
   */
  @IsOptional()
  @IsUUID()
  assignedTechnicianId?: string;

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
