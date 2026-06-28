import { IsBoolean, IsIn } from 'class-validator';
import { COMPANY_PLANS, CompanyPlanValue } from './create-company.dto';

export class UpdateCompanyPlanDto {
  @IsIn(COMPANY_PLANS)
  plan!: CompanyPlanValue;
}

export class SetCompanyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}