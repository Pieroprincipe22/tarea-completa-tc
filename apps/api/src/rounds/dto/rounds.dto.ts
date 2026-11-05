import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NAME_MAX } from '../../building/building-plan';
import {
  CLOSE_NOTE_MAX,
  LEAD_DAYS_MAX,
  PLAN_NAME_MAX,
  PLAN_UNITS,
  type PlanUnit,
} from '../round-plan';

type TransformArg = { value: unknown };

const trim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim() : value);

const trimOrNull = ({ value }: TransformArg) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EVERY_MESSAGE = 'Pon cada cuántas semanas o meses se repite (un número entero).';
const LEAD_MESSAGE = `La antelación tiene que ser de 0 a ${LEAD_DAYS_MAX} días.`;

// ---------------------------------------------------------------
// Plan preventivo de un sitio
// ---------------------------------------------------------------

export class CreatePlanDto {
  @Transform(trim)
  @IsString({ message: 'Elige la plantilla de la hoja de revisión.' })
  @IsNotEmpty({ message: 'Elige la plantilla de la hoja de revisión.' })
  templateId!: string;

  // Tipo de equipo que entra en la ronda: "Fancoil", "Split"…
  @Transform(trim)
  @IsString({ message: 'Pon el tipo de equipo.' })
  @IsNotEmpty({ message: 'Pon el tipo de equipo.' })
  @MaxLength(NAME_MAX, { message: `El tipo de equipo no puede superar ${NAME_MAX} caracteres.` })
  category!: string;

  // Si no se pone, se usa "Fancoil · cada 3 meses".
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(PLAN_NAME_MAX, { message: `El nombre no puede superar ${PLAN_NAME_MAX} caracteres.` })
  name?: string | null;

  @IsInt({ message: EVERY_MESSAGE })
  @Min(1, { message: EVERY_MESSAGE })
  every!: number;

  @IsIn(PLAN_UNITS, { message: 'Elige semanas o meses.' })
  unit!: PlanUnit;

  // Fecha de la primera ronda (o de la última que se hizo): "2026-11-01".
  @Matches(DAY_PATTERN, { message: 'La fecha de la primera ronda no es válida.' })
  startsOn!: string;

  @IsOptional()
  @IsInt({ message: LEAD_MESSAGE })
  @Min(0, { message: LEAD_MESSAGE })
  @Max(LEAD_DAYS_MAX, { message: LEAD_MESSAGE })
  leadDays?: number;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  assignedTechnicianId?: string | null;
}

export class UpdatePlanDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Elige la plantilla de la hoja de revisión.' })
  @IsNotEmpty({ message: 'Elige la plantilla de la hoja de revisión.' })
  templateId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Pon el tipo de equipo.' })
  @IsNotEmpty({ message: 'Pon el tipo de equipo.' })
  @MaxLength(NAME_MAX, { message: `El tipo de equipo no puede superar ${NAME_MAX} caracteres.` })
  category?: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(PLAN_NAME_MAX, { message: `El nombre no puede superar ${PLAN_NAME_MAX} caracteres.` })
  name?: string | null;

  @IsOptional()
  @IsInt({ message: EVERY_MESSAGE })
  @Min(1, { message: EVERY_MESSAGE })
  every?: number;

  @IsOptional()
  @IsIn(PLAN_UNITS, { message: 'Elige semanas o meses.' })
  unit?: PlanUnit;

  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'La fecha de la primera ronda no es válida.' })
  startsOn?: string;

  @IsOptional()
  @IsInt({ message: LEAD_MESSAGE })
  @Min(0, { message: LEAD_MESSAGE })
  @Max(LEAD_DAYS_MAX, { message: LEAD_MESSAGE })
  leadDays?: number;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  assignedTechnicianId?: string | null;

  // Pausar o reanudar el plan.
  @IsOptional()
  @IsBoolean({ message: 'Indica si el plan está activo.' })
  isActive?: boolean;
}

// ---------------------------------------------------------------
// Rondas
// ---------------------------------------------------------------

// Una ronda suelta, sin plan (p. ej. una revisión extra de todos los splits).
export class CreateRoundDto {
  @Transform(trim)
  @IsString({ message: 'Elige el sitio.' })
  @IsNotEmpty({ message: 'Elige el sitio.' })
  siteId!: string;

  @Transform(trim)
  @IsString({ message: 'Elige la plantilla de la hoja de revisión.' })
  @IsNotEmpty({ message: 'Elige la plantilla de la hoja de revisión.' })
  templateId!: string;

  @Transform(trim)
  @IsString({ message: 'Pon el tipo de equipo.' })
  @IsNotEmpty({ message: 'Pon el tipo de equipo.' })
  @MaxLength(NAME_MAX, { message: `El tipo de equipo no puede superar ${NAME_MAX} caracteres.` })
  category!: string;

  @Matches(DAY_PATTERN, { message: 'La fecha de la ronda no es válida.' })
  dueOn!: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  assignedTechnicianId?: string | null;
}

export class CloseRoundDto {
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(CLOSE_NOTE_MAX, { message: `La nota no puede superar ${CLOSE_NOTE_MAX} caracteres.` })
  note?: string | null;
}