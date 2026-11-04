import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LEVEL_MAX, LEVEL_MIN, NAME_MAX, ROOMS_PER_FLOOR_MAX } from '../building-plan';

type TransformArg = { value: unknown };

const trim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim() : value);

const trimOrNull = ({ value }: TransformArg) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const LEVEL_MESSAGE = `El nivel tiene que ser un número entero entre ${LEVEL_MIN} y ${LEVEL_MAX}.`;

// ---------------------------------------------------------------
// Plantas
// ---------------------------------------------------------------

export class CreateFloorDto {
  @Transform(trim)
  @IsString({ message: 'La planta necesita un nombre.' })
  @IsNotEmpty({ message: 'La planta necesita un nombre.' })
  @MaxLength(NAME_MAX, {
    message: `El nombre de la planta no puede superar ${NAME_MAX} caracteres.`,
  })
  name!: string;

  @IsInt({ message: LEVEL_MESSAGE })
  @Min(LEVEL_MIN, { message: LEVEL_MESSAGE })
  @Max(LEVEL_MAX, { message: LEVEL_MESSAGE })
  level!: number;
}

export class UpdateFloorDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'La planta necesita un nombre.' })
  @IsNotEmpty({ message: 'La planta necesita un nombre.' })
  @MaxLength(NAME_MAX, {
    message: `El nombre de la planta no puede superar ${NAME_MAX} caracteres.`,
  })
  name?: string;

  @IsOptional()
  @IsInt({ message: LEVEL_MESSAGE })
  @Min(LEVEL_MIN, { message: LEVEL_MESSAGE })
  @Max(LEVEL_MAX, { message: LEVEL_MESSAGE })
  level?: number;
}

// ---------------------------------------------------------------
// Habitaciones y zonas comunes
// ---------------------------------------------------------------

export const SPACE_KINDS = ['ROOM', 'COMMON'] as const;
export type SpaceKindDto = (typeof SPACE_KINDS)[number];

export class CreateSpaceDto {
  @IsString({ message: 'Elige la planta.' })
  @IsNotEmpty({ message: 'Elige la planta.' })
  floorId!: string;

  @IsIn(SPACE_KINDS, { message: 'Tiene que ser una habitación o una zona común.' })
  kind!: SpaceKindDto;

  @Transform(trim)
  @IsString({ message: 'Ponle un nombre o un número.' })
  @IsNotEmpty({ message: 'Ponle un nombre o un número.' })
  @MaxLength(NAME_MAX, { message: `El nombre no puede superar ${NAME_MAX} caracteres.` })
  name!: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(NAME_MAX, { message: `El tipo de zona no puede superar ${NAME_MAX} caracteres.` })
  category?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden superar 500 caracteres.' })
  notes?: string | null;
}

export class UpdateSpaceDto {
  @IsOptional()
  @IsString({ message: 'Elige la planta.' })
  @IsNotEmpty({ message: 'Elige la planta.' })
  floorId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Ponle un nombre o un número.' })
  @IsNotEmpty({ message: 'Ponle un nombre o un número.' })
  @MaxLength(NAME_MAX, { message: `El nombre no puede superar ${NAME_MAX} caracteres.` })
  name?: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(NAME_MAX, { message: `El tipo de zona no puede superar ${NAME_MAX} caracteres.` })
  category?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden superar 500 caracteres.' })
  notes?: string | null;
}

// ---------------------------------------------------------------
// Generador: plantas, habitaciones y un equipo en cada una
// ---------------------------------------------------------------

export class GenerateEquipmentDto {
  // Tipo de equipo: "Fancoil", "Split / Multisplit"…
  @Transform(trim)
  @IsString({ message: 'Pon el tipo de equipo.' })
  @IsNotEmpty({ message: 'Pon el tipo de equipo.' })
  @MaxLength(NAME_MAX, { message: `El tipo de equipo no puede superar ${NAME_MAX} caracteres.` })
  category!: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120, { message: 'La marca no puede superar 120 caracteres.' })
  brand?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120, { message: 'El modelo no puede superar 120 caracteres.' })
  model?: string | null;
}

export class GenerateRoomsDto {
  @IsInt({ message: 'La primera planta tiene que ser un número entero.' })
  @Min(1, { message: 'Las habitaciones se generan desde la planta 1.' })
  @Max(LEVEL_MAX, { message: `La planta más alta posible es la ${LEVEL_MAX}.` })
  fromLevel!: number;

  @IsInt({ message: 'La última planta tiene que ser un número entero.' })
  @Min(1, { message: 'Las habitaciones se generan desde la planta 1.' })
  @Max(LEVEL_MAX, { message: `La planta más alta posible es la ${LEVEL_MAX}.` })
  toLevel!: number;

  @IsInt({ message: 'Las habitaciones por planta tienen que ser un número entero.' })
  @Min(1, { message: `Pon entre 1 y ${ROOMS_PER_FLOOR_MAX} habitaciones por planta.` })
  @Max(ROOMS_PER_FLOOR_MAX, {
    message: `Pon entre 1 y ${ROOMS_PER_FLOOR_MAX} habitaciones por planta.`,
  })
  roomsPerFloor!: number;

  @IsOptional()
  @IsInt({ message: 'El primer número tiene que ser un número entero.' })
  @Min(1, { message: 'La numeración empieza como mínimo en 01.' })
  @Max(ROOMS_PER_FLOOR_MAX, {
    message: `La numeración de cada planta tiene que ir del 01 al ${ROOMS_PER_FLOOR_MAX}.`,
  })
  firstNumber?: number;

  // Si llega, se pone un equipo en cada habitación que todavía no tenga.
  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateEquipmentDto)
  equipment?: GenerateEquipmentDto | null;
}