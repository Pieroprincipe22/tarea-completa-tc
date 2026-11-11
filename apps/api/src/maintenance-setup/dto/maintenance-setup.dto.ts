import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import {
  GENERATE_FLOORS_MAX,
  LEVEL_MAX,
  LEVEL_MIN,
  NAME_MAX,
  ROOMS_PER_FLOOR_MAX,
} from '../../building/building-plan';
import { CreateMaintenanceTemplateDto } from '../../maintenance-templates/dto/create-maintenance-template.dto';
import { LEAD_DAYS_MAX, PLAN_UNITS, TEAM_MAX, type PlanUnit } from '../../rounds/round-plan';
import {
  MACHINE_TYPES_MAX,
  MACHINES_PER_ROOM_MAX,
  MACHINES_PER_ZONE_MAX,
  ZONES_MAX,
} from '../setup-plan';

type TransformArg = { value: unknown };

const trim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim() : value);

const trimOrNull = ({ value }: TransformArg) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// Lista de ids: quita huecos y repetidos.
const cleanIds = ({ value }: TransformArg) =>
  Array.isArray(value)
    ? [...new Set(value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== ''))]
    : value;

const LEVEL_MESSAGE = `La planta tiene que ser un número entre ${LEVEL_MIN} y ${LEVEL_MAX}.`;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------
// Edificio
// ---------------------------------------------------------------

export class SetupFloorDto {
  @IsInt({ message: 'Las habitaciones van de la planta 1 en adelante.' })
  @Min(1, { message: 'Las habitaciones van de la planta 1 en adelante.' })
  @Max(LEVEL_MAX, { message: `La planta más alta posible es la ${LEVEL_MAX}.` })
  level!: number;

  @IsInt({ message: 'Pon cuántas habitaciones hay en cada planta.' })
  @Min(1, { message: 'Cada planta necesita al menos 1 habitación.' })
  @Max(ROOMS_PER_FLOOR_MAX, {
    message: `Como mucho ${ROOMS_PER_FLOOR_MAX} habitaciones por planta.`,
  })
  rooms!: number;
}

export class SetupBuildingDto {
  // Número de la primera habitación de cada planta: 1 → 101, 201…
  @IsOptional()
  @IsInt({ message: 'La numeración empieza en un número entero.' })
  @Min(1, { message: 'La numeración empieza en 1 o más.' })
  @Max(ROOMS_PER_FLOOR_MAX, {
    message: `La numeración llega como mucho al ${ROOMS_PER_FLOOR_MAX}.`,
  })
  firstNumber?: number;

  @IsArray({ message: 'Pon las plantas con habitaciones.' })
  @ArrayMaxSize(GENERATE_FLOORS_MAX, {
    message: `Como mucho ${GENERATE_FLOORS_MAX} plantas de una vez.`,
  })
  @ValidateNested({ each: true })
  @Type(() => SetupFloorDto)
  floors!: SetupFloorDto[];
}

export class SetupZoneDto {
  @Transform(trim)
  @IsString({ message: 'Cada zona común necesita un nombre.' })
  @IsNotEmpty({ message: 'Cada zona común necesita un nombre.' })
  @MaxLength(NAME_MAX, {
    message: `El nombre de una zona no puede superar ${NAME_MAX} caracteres.`,
  })
  name!: string;

  @IsInt({ message: LEVEL_MESSAGE })
  @Min(LEVEL_MIN, { message: LEVEL_MESSAGE })
  @Max(LEVEL_MAX, { message: LEVEL_MESSAGE })
  level!: number;

  // Nombre de la planta si hay que crearla ("Cubierta").
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(NAME_MAX, {
    message: `El nombre de una planta no puede superar ${NAME_MAX} caracteres.`,
  })
  floorName?: string | null;
}

// ---------------------------------------------------------------
// Máquinas
// ---------------------------------------------------------------

export class SetupMachineZoneDto {
  @Transform(trim)
  @IsString({ message: 'Elige la zona de la máquina.' })
  @IsNotEmpty({ message: 'Elige la zona de la máquina.' })
  @MaxLength(NAME_MAX)
  name!: string;

  @IsInt({ message: LEVEL_MESSAGE })
  @Min(LEVEL_MIN, { message: LEVEL_MESSAGE })
  @Max(LEVEL_MAX, { message: LEVEL_MESSAGE })
  level!: number;

  @IsInt({ message: 'Pon cuántas máquinas hay en la zona.' })
  @Min(1, { message: 'Pon cuántas máquinas hay en la zona.' })
  @Max(MACHINES_PER_ZONE_MAX, {
    message: `Como mucho ${MACHINES_PER_ZONE_MAX} máquinas iguales en una zona.`,
  })
  quantity!: number;
}

export class SetupMachineDto {
  // Tipo de máquina: "Fancoil", "Unidad interior VRF"…
  @Transform(trim)
  @IsString({ message: 'Cada máquina necesita un tipo.' })
  @IsNotEmpty({ message: 'Cada máquina necesita un tipo.' })
  @MaxLength(NAME_MAX, { message: `El tipo de máquina no puede superar ${NAME_MAX} caracteres.` })
  category!: string;

  // Cuántas hay en cada habitación (0 = ninguna).
  @IsOptional()
  @IsInt({ message: 'Pon cuántas máquinas hay en cada habitación.' })
  @Min(0, { message: 'Pon cuántas máquinas hay en cada habitación.' })
  @Max(MACHINES_PER_ROOM_MAX, {
    message: `Como mucho ${MACHINES_PER_ROOM_MAX} máquinas iguales por habitación.`,
  })
  perRoom?: number;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80, { message: 'La marca no puede superar 80 caracteres.' })
  brand?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(80, { message: 'El modelo no puede superar 80 caracteres.' })
  model?: string | null;

  @IsOptional()
  @IsArray({ message: 'Las zonas de la máquina tienen que ser una lista.' })
  @ArrayMaxSize(ZONES_MAX, { message: `Como mucho ${ZONES_MAX} zonas por máquina.` })
  @ValidateNested({ each: true })
  @Type(() => SetupMachineZoneDto)
  zones?: SetupMachineZoneDto[];
}

// ---------------------------------------------------------------
// Planes
// ---------------------------------------------------------------

export class SetupPlanDto {
  // Tipo de máquina que revisa el plan.
  @Transform(trim)
  @IsString({ message: 'Cada plan necesita el tipo de máquina.' })
  @IsNotEmpty({ message: 'Cada plan necesita el tipo de máquina.' })
  @MaxLength(NAME_MAX)
  category!: string;

  // Una hoja que la empresa ya tiene…
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  templateId?: string | null;

  // …o una hoja nueva que se crea con el plan.
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMaintenanceTemplateDto)
  template?: CreateMaintenanceTemplateDto | null;

  @IsInt({ message: 'Pon cada cuántas semanas o meses se repite (un número entero).' })
  @Min(1, { message: 'Pon cada cuántas semanas o meses se repite (un número entero).' })
  every!: number;

  @IsIn(PLAN_UNITS, { message: 'Elige semanas o meses.' })
  unit!: PlanUnit;

  // Fecha de la primera ronda: "2026-11-15".
  @Matches(DAY_PATTERN, { message: 'La fecha de la primera ronda no es válida.' })
  startsOn!: string;

  @IsOptional()
  @IsInt({ message: `La antelación tiene que ser de 0 a ${LEAD_DAYS_MAX} días.` })
  @Min(0, { message: `La antelación tiene que ser de 0 a ${LEAD_DAYS_MAX} días.` })
  @Max(LEAD_DAYS_MAX, { message: `La antelación tiene que ser de 0 a ${LEAD_DAYS_MAX} días.` })
  leadDays?: number;

  @IsOptional()
  @Transform(cleanIds)
  @IsArray({ message: 'Elige los técnicos.' })
  @ArrayMaxSize(TEAM_MAX, { message: `Como mucho ${TEAM_MAX} técnicos.` })
  @IsString({ each: true })
  technicianIds?: string[];
}

// ---------------------------------------------------------------
// Todo junto
// ---------------------------------------------------------------

export class MaintenanceSetupDto {
  // true = solo calcula lo que se haría, sin guardar nada.
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SetupBuildingDto)
  building?: SetupBuildingDto | null;

  @IsOptional()
  @IsArray({ message: 'Las zonas comunes tienen que ser una lista.' })
  @ArrayMaxSize(ZONES_MAX, { message: `Como mucho ${ZONES_MAX} zonas comunes de una vez.` })
  @ValidateNested({ each: true })
  @Type(() => SetupZoneDto)
  zones?: SetupZoneDto[];

  @IsOptional()
  @IsArray({ message: 'Las máquinas tienen que ser una lista.' })
  @ArrayMaxSize(MACHINE_TYPES_MAX, {
    message: `Como mucho ${MACHINE_TYPES_MAX} tipos de máquina de una vez.`,
  })
  @ValidateNested({ each: true })
  @Type(() => SetupMachineDto)
  machines?: SetupMachineDto[];

  @IsOptional()
  @IsArray({ message: 'Los planes tienen que ser una lista.' })
  @ArrayMaxSize(MACHINE_TYPES_MAX, {
    message: `Como mucho ${MACHINE_TYPES_MAX} planes de una vez.`,
  })
  @ValidateNested({ each: true })
  @Type(() => SetupPlanDto)
  plans?: SetupPlanDto[];
}