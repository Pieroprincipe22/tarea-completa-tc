import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';
import { isValidIban, isValidSpanishTaxId, normalizeIban, normalizeTaxId } from '../tax-id';

type TransformArg = { value: unknown };

// "" o solo espacios → null (borra el dato); el resto se guarda sin espacios en los extremos.
const trimOrNull = ({ value }: TransformArg) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const normalizeWith =
  (fn: (v: string) => string) =>
  ({ value }: TransformArg) => {
    const trimmed = trimOrNull({ value });
    return typeof trimmed === 'string' ? fn(trimmed) : trimmed;
  };

function IsSpanishTaxId(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isSpanishTaxId',
      validator: {
        validate: (value) => typeof value === 'string' && isValidSpanishTaxId(value),
        defaultMessage: () => 'El NIF/CIF no es válido. Revisa los números y la letra de control.',
      },
    },
    options,
  );
}

function IsIban(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isIban',
      validator: {
        validate: (value) => typeof value === 'string' && isValidIban(value),
        defaultMessage: () => 'El IBAN no es válido. Revisa que esté completo y bien copiado.',
      },
    },
    options,
  );
}

// Todos los campos son opcionales: solo se cambia lo que llega.
// Un campo enviado vacío se borra (queda a null).
export class UpdateCompanySettingsDto {
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(160, { message: 'La razón social no puede superar 160 caracteres.' })
  legalName?: string | null;

  @IsOptional()
  @Transform(normalizeWith(normalizeTaxId))
  @IsString()
  @IsSpanishTaxId()
  taxId?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(200, { message: 'La dirección no puede superar 200 caracteres.' })
  addressLine?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @Matches(/^[0-9A-Za-z -]{3,10}$/, {
    message: 'El código postal no es válido.',
  })
  postalCode?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80, { message: 'La ciudad no puede superar 80 caracteres.' })
  city?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80, { message: 'La provincia no puede superar 80 caracteres.' })
  province?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60, { message: 'El país no puede superar 60 caracteres.' })
  country?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @Matches(/^\+?[0-9 ()-]{6,30}$/, {
    message: 'El teléfono solo puede llevar números, espacios, guiones y el prefijo +.',
  })
  phone?: string | null;

  @IsOptional()
  @Transform(normalizeWith((v) => v.toLowerCase()))
  @IsEmail({}, { message: 'El email no es válido.' })
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsUrl({ require_protocol: false }, { message: 'La web no es una dirección válida.' })
  @MaxLength(200)
  website?: string | null;

  @IsOptional()
  @Transform(normalizeWith(normalizeIban))
  @IsString()
  @IsIban()
  iban?: string | null;

  // Este no se puede borrar: si llega vacío se ignora.
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El IVA debe ser un número con 2 decimales como máximo.' },
  )
  @Min(0, { message: 'El IVA no puede ser negativo.' })
  @Max(100, { message: 'El IVA no puede superar el 100 %.' })
  defaultTaxRate?: number | null;
}