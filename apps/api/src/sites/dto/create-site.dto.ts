import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSiteDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
