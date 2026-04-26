import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryWorkOrdersDto {
  /**
   * ID del técnico asignado.
   *
   * Importante:
   * No usar @IsUUID(), porque Prisma está generando IDs tipo CUID:
   * ejemplo: cmo0c8ae100042i9g08o7vqil
   */
  @IsOptional()
  @IsString()
  assignedToId?: string;

  /**
   * Estado de la orden de trabajo.
   * Lo dejamos como string para no romper si los enums del schema
   * tienen nombres diferentes entre fases.
   */
  @IsOptional()
  @IsString()
  status?: string;

  /**
   * Prioridad de la orden de trabajo.
   */
  @IsOptional()
  @IsString()
  priority?: string;

  /**
   * Búsqueda libre.
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filtro por cliente, si el frontend/admin lo usa.
   */
  @IsOptional()
  @IsString()
  customerId?: string;

  /**
   * Filtro por sede/ubicación, si existe en tu módulo.
   */
  @IsOptional()
  @IsString()
  siteId?: string;

  /**
   * Filtro por activo/máquina, si existe en tu módulo.
   */
  @IsOptional()
  @IsString()
  assetId?: string;

  /**
   * Página actual.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Cantidad de resultados por página.
   *
   * El frontend está enviando pageSize=100,
   * por eso permitimos máximo 100.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}