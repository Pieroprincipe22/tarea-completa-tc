export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3002';

const STORAGE_KEY = 'inventorio.session';

export type InventorySession = {
  apiBase: string;
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  role: string;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isSession(value: unknown): value is InventorySession {
  if (!value || typeof value !== 'object') return false;

  const row = value as Record<string, unknown>;

  return (
    typeof row.accessToken === 'string' &&
    row.accessToken.length > 0 &&
    typeof row.companyId === 'string' &&
    row.companyId.length > 0 &&
    typeof row.userId === 'string' &&
    row.userId.length > 0
  );
}

export function readSession(): InventorySession | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? { ...parsed, apiBase: parsed.apiBase || DEFAULT_API_BASE } : null;
  } catch {
    return null;
  }
}

export function writeSession(session: InventorySession): void {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura lo que dure la pestaña.
  }
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;

  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Nada que limpiar.
  }
}

export function canEditInventory(role?: string | null): boolean {
  const normalized = String(role ?? '').toUpperCase();
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
}

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Encargado',
  TECHNICIAN: 'Técnico',
};
