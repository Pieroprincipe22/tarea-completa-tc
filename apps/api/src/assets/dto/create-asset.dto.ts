import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MinLength(1)
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
}