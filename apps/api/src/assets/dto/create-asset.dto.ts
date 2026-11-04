import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAssetDto {
  // ID de Prisma (CUID), no UUID.
  @IsString()
  @MinLength(1)
  siteId!: string;

  // Habitación o zona del sitio donde está el equipo (opcional).
  @IsOptional()
  @IsString()
  @MinLength(1)
  spaceId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  serial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  internalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  status?: string;

  @IsOptional()
  @IsDateString()
  installationAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // compatibilidad legacy: si el equipo no está en una habitación o zona,
  // se guarda como texto libre.
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;
}

export const ASSET_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'] as const;

// Todo opcional: solo se cambia lo que llega.
// "spaceId": null saca el equipo de su habitación o zona.
export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El equipo necesita un nombre.' })
  @MaxLength(160, { message: 'El nombre no puede superar 160 caracteres.' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  spaceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  serialNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  internalCode?: string | null;

  @IsOptional()
  @IsIn(ASSET_STATUSES, { message: 'El estado del equipo no es válido.' })
  status?: (typeof ASSET_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}