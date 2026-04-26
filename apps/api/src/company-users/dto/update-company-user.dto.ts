import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCompanyUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  /**
   * La contraseña es opcional al editar.
   * Si no se envía, se mantiene la contraseña actual.
   */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(80)
  password?: string;

  /**
   * Desde el panel de empresa solo permitimos:
   * - TECHNICIAN
   * - ADMIN
   *
   * SUPER_ADMIN queda reservado para el panel separado del súper admin.
   */
  @IsOptional()
  @IsString()
  @IsIn(['TECHNICIAN', 'ADMIN'])
  role?: 'TECHNICIAN' | 'ADMIN';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}