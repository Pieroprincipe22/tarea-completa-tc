import type { CompanyPlan } from '@prisma/client';

export const PLAN_LIMITS: Record<CompanyPlan, { maxTechnicians: number }> = {
  BASIC: { maxTechnicians: 5 },
  PRO: { maxTechnicians: 10 },
  ENTERPRISE: { maxTechnicians: 25 },
};