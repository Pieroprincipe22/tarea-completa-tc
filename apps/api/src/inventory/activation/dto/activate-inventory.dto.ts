import { CompanyPlan } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ActivateInventoryDto {
  @IsOptional()
  @IsEnum(CompanyPlan)
  plan?: CompanyPlan;
}
