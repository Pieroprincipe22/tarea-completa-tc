export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3002';

export type TcSession = {
  apiBase: string;
  companyId: string;
  companyName?: string;
  userId: string;
  email?: string;
  name?: string;
  role?: string;
};

export const TC_STORAGE_KEYS = {
  session: 'tc.session',
  apiBase: 'tc.apiBase',
  companyId: 'tc.companyId',
  userId: 'tc.userId',
} as const;

export const TC_LS_KEYS = TC_STORAGE_KEYS;

export function writeTcSession(session: TcSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TC_STORAGE_KEYS.session, JSON.stringify(session));
  localStorage.setItem(TC_STORAGE_KEYS.apiBase, session.apiBase);
  localStorage.setItem(TC_STORAGE_KEYS.companyId, session.companyId);
  localStorage.setItem(TC_STORAGE_KEYS.userId, session.userId);
}

export function readTcSession(): TcSession | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(TC_STORAGE_KEYS.session);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TcSession;
  } catch {
    return null;
  }
}

export function clearTcSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TC_STORAGE_KEYS.session);
  localStorage.removeItem(TC_STORAGE_KEYS.apiBase);
  localStorage.removeItem(TC_STORAGE_KEYS.companyId);
  localStorage.removeItem(TC_STORAGE_KEYS.userId);
}

export function isTechnicianRole(role?: string | null) {
  return String(role || '').toUpperCase() === 'TECHNICIAN';
}

export function isTechnicianSession(
  session?: Pick<TcSession, 'role'> | null,
) {
  return isTechnicianRole(session?.role);
}

export function resolveHomePath(
  session?: Pick<TcSession, 'role'> | null,
): string {
  return isTechnicianSession(session)
    ? '/technician/dashboard'
    : '/admin/dashboard';
}

export function resolveWorkOrdersPath(
  session?: Pick<TcSession, 'role'> | null,
): string {
  return isTechnicianSession(session)
    ? '/technician/dashboard/work-orders'
    : '/admin/dashboard/work-orders';
}