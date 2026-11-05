import { InventoryLocationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export function normalizeLocationCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-');
}

const toCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeLocationCode(value) : value;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const CODE_MESSAGE =
  'El código solo puede tener letras, números, guiones y puntos, y como mucho 32 caracteres.';

export class CreateInventoryLocationDto {
  @IsEnum(InventoryLocationType)
  type!: InventoryLocationType;

  @Transform(toCode)
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;
}

/** null en parentId, assignedUserId o notes = quitar el valor. */
export class UpdateInventoryLocationDto {
  @IsOptional()
  @Transform(toCode)
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  assignedUserId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
