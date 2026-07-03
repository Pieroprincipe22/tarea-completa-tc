import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { COMPANY_PLANS, CompanyPlanValue } from './create-company.dto';

export class UpdateCompanyPlanDto {
  @IsIn(COMPANY_PLANS)
  plan!: CompanyPlanValue;
}

export class SetCompanyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateInvoicePrefixDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El prefijo solo puede contener letras y números (ej. HR, AP1).',
  })
  invoicePrefix!: string;
}