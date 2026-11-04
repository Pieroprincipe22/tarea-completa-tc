import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TEMPLATE_ITEM_TYPES, type TemplateItemType } from '../template-item-types';

type TransformArg = { value: unknown };

// Quita espacios de los extremos.
export const trim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim() : value);

// "" o solo espacios → null.
export const trimOrNull = ({ value }: TransformArg) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// Un número vacío ("" o null) se guarda como "sin límite".
const numberOrNull = ({ value }: TransformArg) => (value === '' ? null : value);

export class TemplateItemDto {
  @Transform(trim)
  @IsString({ message: 'Cada punto necesita un nombre.' })
  @IsNotEmpty({ message: 'Cada punto necesita un nombre.' })
  @MaxLength(200, { message: 'El nombre de un punto no puede superar 200 caracteres.' })
  label!: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80, { message: 'El nombre de una sección no puede superar 80 caracteres.' })
  section?: string | null;

  @IsIn(TEMPLATE_ITEM_TYPES, { message: 'El tipo de punto no es válido.' })
  type!: TemplateItemType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(20, { message: 'La unidad no puede superar 20 caracteres.' })
  unit?: string | null;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({}, { message: 'El mínimo tiene que ser un número.' })
  minValue?: number | null;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({}, { message: 'El máximo tiene que ser un número.' })
  maxValue?: number | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(300, { message: 'Las instrucciones no pueden superar 300 caracteres.' })
  helpText?: string | null;
}

export class CreateMaintenanceTemplateDto {
  @Transform(trim)
  @IsString({ message: 'La plantilla necesita un nombre.' })
  @IsNotEmpty({ message: 'La plantilla necesita un nombre.' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  name!: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60, { message: 'El tipo de equipo no puede superar 60 caracteres.' })
  category?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres.' })
  description?: string | null;

  @IsArray({ message: 'La plantilla necesita al menos un punto.' })
  @ArrayMinSize(1, { message: 'La plantilla necesita al menos un punto.' })
  @ArrayMaxSize(300, { message: 'Una plantilla no puede tener más de 300 puntos.' })
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items!: TemplateItemDto[];
}