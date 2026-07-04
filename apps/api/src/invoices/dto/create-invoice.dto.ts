import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// Una línea manual de la factura (ej. "Instalación de termostato").
export class InvoiceLineDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateInvoiceDto {
  // Origen de la factura: una orden de trabajo o un parte (opcional; puede ser manual).
  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  maintenanceReportId?: string;

  // Mano de obra opción 1: precio/hora x horas.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborHourlyRate?: number;

  // Mano de obra opción 2: importe directo (si se manda, gana sobre la opción 1).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborAmount?: number;

  // IVA configurable por factura (%: 21, 10, 0...).
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate!: number;

  // Si viene de un parte: ¿arrastrar sus materiales facturables como líneas?
  @IsOptional()
  @IsBoolean()
  includeReportMaterials?: boolean;

  // Líneas manuales adicionales (instalación, desplazamiento, etc.).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  notes?: string;
}