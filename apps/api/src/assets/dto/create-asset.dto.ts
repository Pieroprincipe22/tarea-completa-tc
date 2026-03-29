import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  siteId!: string;

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

  // compatibilidad legacy; se acepta pero no se persiste
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;
}