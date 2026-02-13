import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class DevUserDto {
  @IsString()
  companyName!: string;

  @IsString()
  userName!: string;

  @IsEmail()
  email!: string;

  // Tu schema exige password obligatorio: lo pedimos aquí
  @IsString()
  @MinLength(4)
  password!: string;

  // Evitamos enums que “no exportan”: role como string
  @IsOptional()
  @IsString()
  role?: string; // 'OWNER' | 'ADMIN' | 'TECH' ...
}
