import type { Request } from 'express';

export type Tenant = {
  companyId: string;
  userId: string;
  role?: string;
};

export type TenantRequest = Request & {
  tenant?: Tenant;

  // opcional: compatibilidad con tu guard
  companyId?: string;
  userId?: string;
  role?: string;
};

export function getTenant(req: TenantRequest): Tenant {
  // Preferimos lo que setea el guard
  if (req.tenant) return req.tenant;

  // Compatibilidad si guard setea campos sueltos
  if (req.companyId && req.userId) {
    return { companyId: req.companyId, userId: req.userId, role: req.role };
  }

  // Fallback a headers si hicieras pruebas sin guard (no recomendado)
  const companyId = String(req.headers['x-company-id'] ?? '');
  const userId = String(req.headers['x-user-id'] ?? '');
  return { companyId, userId };
}
