import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWorkOrderDto {
  /**
   * Título principal de la orden.
   * Ejemplo: "Revisión fan coil habitación 304"
   */
  @IsString()
  @MaxLength(160)
  title!: string;

  /**
   * Descripción o detalle del trabajo.
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Estado inicial de la orden.
   * Lo dejamos como string para mantener compatibilidad con el enum actual del schema.prisma.
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
   * Importante:
   * El frontend puede enviar assignedToId,
   * pero en Prisma se conectará usando la relación assignedTo.
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
   * Debe venir como ISO string.
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