import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MaintenanceItemType } from '@prisma/client';

export class CreateMaintenanceTemplateItemDto {
  @IsString()
  @MaxLength(200)
  label!: string;

  @IsEnum(MaintenanceItemType)
  type!: MaintenanceItemType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  hint?: string;

  // Para CHOICE típicamente: ["Auto","Manual"] o { choices: ["A","B"] }
  @IsOptional()
  options?: unknown;
}

export class CreateMaintenanceTemplateDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceTemplateItemDto)
  items!: CreateMaintenanceTemplateItemDto[];
}
