import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serial?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // 1-5 recomendado
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  criticality?: number;

  // fechas como string ISO (ej: "2026-01-14T00:00:00.000Z")
  @IsOptional()
  @IsISO8601()
  installedAt?: string;

  @IsOptional()
  @IsISO8601()
  lastServiceAt?: string;
}
