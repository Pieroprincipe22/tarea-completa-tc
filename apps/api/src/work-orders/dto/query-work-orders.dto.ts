import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryWorkOrdersDto {
  /**
   * Filtro usado por el frontend técnico:
   * /work-orders?assignedToId=USER_ID
   *
   * No usamos @IsUUID() porque Prisma puede generar IDs tipo CUID.
   */
  @IsOptional()
  @IsString()
  assignedToId?: string;

  /**
   * Alias internos que también puede usar el backend/frontend.
   */
  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  /**
   * Búsqueda usada actualmente por /work-orders.
   */
  @IsOptional()
  @IsString()
  q?: string;

  /**
   * Alias por compatibilidad.
   */
  @IsOptional()
  @IsString()
  search?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
