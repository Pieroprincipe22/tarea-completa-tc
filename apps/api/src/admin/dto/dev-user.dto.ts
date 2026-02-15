import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class DevUserDto {
  // compatibilidad: puedes mandar companyName o company
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  company?: string;

  // compatibilidad: puedes mandar email o userEmail
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;

  // compatibilidad: puedes mandar name o userName
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  // role (OWNER/ADMIN/TECH, etc.)
  @IsOptional()
  @IsString()
  role?: string;

  // ✅ si tu modelo User exige password obligatorio, lo enviamos aquí
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;
}
