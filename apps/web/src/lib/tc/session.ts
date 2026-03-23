export type TcSession = {
  apiBase?: string;
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

export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3002';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function normalizeTcRole(role?: string | null): string {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

export function isTechnicianRole(role?: string | null): boolean {
  return normalizeTcRole(role) === 'TECHNICIAN';
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeTcRole(role) === 'ADMIN';
}

export function isTechnicianSession(session?: Pick<TcSession, 'role'> | null): boolean {
  return isTechnicianRole(session?.role);
}

export function resolveHomePath(session?: Pick<TcSession, 'role'> | null): string {
  return isTechnicianSession(session) ? '/technician/dashboard' : '/dashboard';
}

export function resolveWorkOrdersPath(session?: Pick<TcSession, 'role'> | null): string {
  return isTechnicianSession(session)
    ? '/technician/dashboard/work-orders'
    : '/work-orders';
}

export function readTcSession(): TcSession | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(TC_STORAGE_KEYS.session);
  if (raw) {
    try {
      const s = JSON.parse(raw) as TcSession;
      if (s?.companyId && s?.userId) {
        return { apiBase: s.apiBase ?? DEFAULT_API_BASE, ...s };
      }
    } catch {
      // fallback legacy
    }
  }

  const companyId = storage.getItem(TC_STORAGE_KEYS.companyId) ?? '';
  const userId = storage.getItem(TC_STORAGE_KEYS.userId) ?? '';
  if (!companyId || !userId) return null;

  const apiBase = storage.getItem(TC_STORAGE_KEYS.apiBase) ?? DEFAULT_API_BASE;

  return { apiBase, companyId, userId };
}

export function writeTcSession(session: TcSession) {
  const storage = getStorage();
  if (!storage) return;

  const normalized: TcSession = {
    apiBase: session.apiBase ?? DEFAULT_API_BASE,
    companyId: session.companyId,
    companyName: session.companyName,
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };

  storage.setItem(TC_STORAGE_KEYS.session, JSON.stringify(normalized));
  storage.setItem(TC_STORAGE_KEYS.apiBase, normalized.apiBase ?? '');
  storage.setItem(TC_STORAGE_KEYS.companyId, normalized.companyId);
  storage.setItem(TC_STORAGE_KEYS.userId, normalized.userId);
}

export function clearTcSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(TC_STORAGE_KEYS.session);
  storage.removeItem(TC_STORAGE_KEYS.apiBase);
  storage.removeItem(TC_STORAGE_KEYS.companyId);
  storage.removeItem(TC_STORAGE_KEYS.userId);
}