import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { NAME_MAX } from '../../building/building-plan';
import {
  CLOSE_NOTE_MAX,
  ITEM_VALUE_MAX,
  LEAD_DAYS_MAX,
  NO_ACCESS_REASON_MAX,
  PARTS_MAX,
  PART_NAME_MAX,
  PLAN_NAME_MAX,
  PLAN_UNITS,
  RETURN_NOTE_MAX,
  TEAM_MAX,
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
const TEAM_MESSAGE = `Como mucho ${TEAM_MAX} técnicos.`;

// Lista de técnicos: quita huecos y repetidos.
const cleanIds = ({ value }: TransformArg) =>
  Array.isArray(value)
    ? [...new Set(value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== ''))]
    : value;
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

  // Los técnicos que harán las rondas (si se pone, manda sobre assignedTechnicianId).
  @IsOptional()
  @Transform(cleanIds)
  @IsArray({ message: 'Elige los técnicos.' })
  @ArrayMaxSize(TEAM_MAX, { message: TEAM_MESSAGE })
  @IsString({ each: true })
  technicianIds?: string[];
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

  @IsOptional()
  @Transform(cleanIds)
  @IsArray({ message: 'Elige los técnicos.' })
  @ArrayMaxSize(TEAM_MAX, { message: TEAM_MESSAGE })
  @IsString({ each: true })
  technicianIds?: string[];

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

  @IsOptional()
  @Transform(cleanIds)
  @IsArray({ message: 'Elige los técnicos.' })
  @ArrayMaxSize(TEAM_MAX, { message: TEAM_MESSAGE })
  @IsString({ each: true })
  technicianIds?: string[];
}

export class CloseRoundDto {
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(CLOSE_NOTE_MAX, { message: `La nota no puede superar ${CLOSE_NOTE_MAX} caracteres.` })
  note?: string | null;
}

// Los técnicos que van a la ronda (2 o 3 si quieren ir más rápido).
export class SetTechniciansDto {
  @Transform(cleanIds)
  @IsArray({ message: 'Elige los técnicos.' })
  @ArrayMaxSize(TEAM_MAX, { message: TEAM_MESSAGE })
  @IsString({ each: true })
  technicianIds!: string[];
}

// El encargado devuelve la ronda a los técnicos: tiene que decir por qué.
export class ReturnRoundDto {
  @Transform(trim)
  @IsString({ message: 'Escribe qué hay que repasar.' })
  @IsNotEmpty({ message: 'Escribe qué hay que repasar.' })
  @MaxLength(RETURN_NOTE_MAX, {
    message: `La nota no puede superar ${RETURN_NOTE_MAX} caracteres.`,
  })
  note!: string;
}

// ---------------------------------------------------------------
// Rellenar una habitación desde el móvil
// ---------------------------------------------------------------

export const STOP_STATUSES = ['PENDING', 'DONE', 'NO_ACCESS'] as const;
export const ITEM_STATUSES = ['PENDING', 'OK', 'FAIL', 'NA'] as const;

export class StopItemInput {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsIn(ITEM_STATUSES, { message: 'Estado de un punto no válido.' })
  status!: (typeof ITEM_STATUSES)[number];

  // Lo que se anotó: la opción elegida, la temperatura, el texto…
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(ITEM_VALUE_MAX, { message: `Un punto no puede superar ${ITEM_VALUE_MAX} caracteres.` })
  value?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(ITEM_VALUE_MAX, { message: `Una nota no puede superar ${ITEM_VALUE_MAX} caracteres.` })
  notes?: string | null;
}

export class StopPartInput {
  @Transform(trim)
  @IsString({ message: 'Pon el nombre del recambio.' })
  @IsNotEmpty({ message: 'Pon el nombre del recambio.' })
  @MaxLength(PART_NAME_MAX, {
    message: `El recambio no puede superar ${PART_NAME_MAX} caracteres.`,
  })
  name!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad tiene que ser un número.' })
  @Min(0.01, { message: 'La cantidad tiene que ser mayor que 0.' })
  @Max(10000, { message: 'La cantidad es demasiado grande.' })
  quantity?: number;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(20)
  unit?: string | null;
}

export class SaveStopDto {
  @IsIn(STOP_STATUSES, { message: 'Elige si está hecha, sin acceso o pendiente.' })
  status!: (typeof STOP_STATUSES)[number];

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(NO_ACCESS_REASON_MAX, {
    message: `El motivo no puede superar ${NO_ACCESS_REASON_MAX} caracteres.`,
  })
  noAccessReason?: string | null;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => StopItemInput)
  items?: StopItemInput[];

  // Si viene, sustituye a los recambios que hubiera.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PARTS_MAX, { message: `Como mucho ${PARTS_MAX} recambios por equipo.` })
  @ValidateNested({ each: true })
  @Type(() => StopPartInput)
  parts?: StopPartInput[];

  // Hora del móvil al guardar. Si llega tarde un cambio más viejo, no pisa al nuevo.
  @IsISO8601({}, { message: 'Falta la hora a la que se guardó.' })
  savedAt!: string;
}