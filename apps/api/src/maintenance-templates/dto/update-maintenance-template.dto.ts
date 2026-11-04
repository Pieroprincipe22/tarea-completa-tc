import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TemplateItemDto, trim, trimOrNull } from './create-maintenance-template.dto';

// Todo es opcional: solo se cambia lo que llega.
// Si llegan "items", sustituyen a todos los puntos de la plantilla.
export class UpdateMaintenanceTemplateDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'La plantilla necesita un nombre.' })
  @IsNotEmpty({ message: 'La plantilla necesita un nombre.' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres.' })
  name?: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60, { message: 'El tipo de equipo no puede superar 60 caracteres.' })
  category?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres.' })
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: 'La plantilla necesita al menos un punto.' })
  @ArrayMinSize(1, { message: 'La plantilla necesita al menos un punto.' })
  @ArrayMaxSize(300, { message: 'Una plantilla no puede tener más de 300 puntos.' })
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items?: TemplateItemDto[];
}