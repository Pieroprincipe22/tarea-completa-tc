import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Fuente única de los planes válidos (se reutiliza en otros DTOs).
export const COMPANY_PLANS = ['BASIC', 'PRO', 'ENTERPRISE'] as const;
export type CompanyPlanValue = (typeof COMPANY_PLANS)[number];

export class CreateCompanyDto {
  @IsString()
  companyName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  // Se recorta antes de validar: así "      " (solo espacios) no cuela.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  // Plan opcional al crear; si no se manda, la empresa queda en BASIC.
  @IsOptional()
  @IsIn(COMPANY_PLANS)
  plan?: CompanyPlanValue;
}