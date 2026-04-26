import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateWorkOrderDto {
  /**
   * Título principal de la orden.
   */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  /**
   * Descripción o detalle del trabajo.
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Estado de la orden.
   * Ejemplo: PENDING, IN_PROGRESS, DONE, CANCELED.
   */
  @IsOptional()
  @IsString()
  status?: string;

  /**
   * Prioridad de la orden.
   * Ejemplo: LOW, MEDIUM, HIGH, URGENT.
   */
  @IsOptional()
  @IsString()
  priority?: string;

  /**
   * ID del técnico asignado.
   *
   * El frontend puede mandar assignedToId,
   * pero el service lo convierte a:
   * assignedTo: { connect: { id: assignedToId } }
   */
  @IsOptional()
  @IsString()
  assignedToId?: string;

  /**
   * Cliente relacionado.
   */
  @IsOptional()
  @IsString()
  customerId?: string;

  /**
   * Sede, edificio, hotel o ubicación.
   */
  @IsOptional()
  @IsString()
  siteId?: string;

  /**
   * Activo, máquina o equipo relacionado.
   */
  @IsOptional()
  @IsString()
  assetId?: string;

  /**
   * Fecha programada del trabajo.
   */
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  /**
   * Fecha límite.
   */
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  /**
   * Dirección o ubicación escrita manualmente.
   */
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Código o referencia interna.
   */
  @IsOptional()
  @IsString()
  reference?: string;

  /**
   * Observaciones internas.
   */
  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Indica si la orden está activa.
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}