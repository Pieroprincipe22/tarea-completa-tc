import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyUserDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(80)
  password!: string;

  /**
   * Por ahora permitimos crear:
   * - TECHNICIAN: técnico de campo
   * - ADMIN: encargado/admin de la empresa
   *
   * SUPER_ADMIN no debe crearse desde el panel normal de empresa.
   */
  @IsOptional()
  @IsString()
  @IsIn(['TECHNICIAN', 'ADMIN'])
  role?: 'TECHNICIAN' | 'ADMIN';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}