import type { Request } from 'express';

export type Tenant = {
  companyId: string;
  userId: string;
  role?: string;
};

export type TenantRequest = Request & {
  tenant?: Tenant;
};

export function getTenant(req: TenantRequest): Tenant {
  // Preferimos lo que setea el guard
  if (req.tenant) return req.tenant;

  // Fallback a headers si aún no está seteado
  const companyId = String(req.headers['x-company-id'] ?? '');
  const userId = String(req.headers['x-user-id'] ?? '');
  return { companyId, userId };
}
