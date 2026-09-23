import type { CompanyPlan } from '@prisma/client';

export type PlanLimits = {
  maxTechnicians: number;
  maxAdmins: number;
  maxSites: number;
  maxAssets: number;
  maxStorageMb: number;
};

export const PLAN_LIMITS: Record<CompanyPlan, PlanLimits> = {
  BASIC: {
    maxTechnicians: 5,
    maxAdmins: 2,
    maxSites: 10,
    maxAssets: 100,
    maxStorageMb: 500,
  },
  PRO: {
    maxTechnicians: 10,
    maxAdmins: 5,
    maxSites: 30,
    maxAssets: 500,
    maxStorageMb: 2000,
  },
  ENTERPRISE: {
    maxTechnicians: 25,
    maxAdmins: 15,
    maxSites: 200,
    maxAssets: 5000,
    maxStorageMb: 10000,
  },
};
