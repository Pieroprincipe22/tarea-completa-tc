import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

type TransformArg = { value: unknown };

const trim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim() : value);

// Un campo opcional vacío se guarda como "no puesto".
const trimOrUndefined = ({ value }: TransformArg) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const CUSTOMER_NAME_MAX = 120;
export const SITE_NAME_MAX = 160;

// El primer hotel o edificio del cliente, que se da de alta a la vez.
export class NewCustomerSiteDto {
  @Transform(trim)
  @IsString({ message: 'Pon el nombre del hotel o edificio.' })
  @MinLength(1, { message: 'Pon el nombre del hotel o edificio.' })
  @MaxLength(SITE_NAME_MAX, {
    message: `El nombre del hotel no puede superar ${SITE_NAME_MAX} caracteres.`,
  })
  name!: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(250, { message: 'La dirección no puede superar 250 caracteres.' })
  address?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(120, { message: 'La población no puede superar 120 caracteres.' })
  city?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(2000, { message: 'Las notas no pueden superar 2000 caracteres.' })
  notes?: string;
}

export class CreateCustomerDto {
  @Transform(trim)
  @IsString({ message: 'Pon el nombre del cliente.' })
  @MinLength(2, { message: 'El nombre del cliente tiene que tener al menos 2 letras.' })
  @MaxLength(CUSTOMER_NAME_MAX, {
    message: `El nombre del cliente no puede superar ${CUSTOMER_NAME_MAX} caracteres.`,
  })
  name!: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(160, { message: 'El email no puede superar 160 caracteres.' })
  email?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(30, { message: 'El teléfono no puede superar 30 caracteres.' })
  phone?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(250, { message: 'La dirección no puede superar 250 caracteres.' })
  address?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden superar 500 caracteres.' })
  notes?: string;

  // Si viene, se crea también su primer hotel o edificio.
  @IsOptional()
  @ValidateNested()
  @Type(() => NewCustomerSiteDto)
  site?: NewCustomerSiteDto;
}