export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3002';

export type TcSession = {
  apiBase: string;
  companyId: string;
  companyName?: string;
  userId: string;
  accessToken: string;
  email?: string;
  name?: string;
  role?: string;
};

export const TC_STORAGE_KEYS = {
  session: 'tc.session',
  apiBase: 'tc.apiBase',
  companyId: 'tc.companyId',
  userId: 'tc.userId',
  accessToken: 'tc.accessToken',
} as const;

export const TC_LS_KEYS = TC_STORAGE_KEYS;

function normalizeRole(role?: string | null): string {
  return String(role ?? '').trim().toUpperCase();
}

function isValidSession(value: unknown): value is TcSession {
  if (!value || typeof value !== 'object') return false;

  const row = value as Record<string, unknown>;

  return (
    typeof row.apiBase === 'string' &&
    row.apiBase.trim().length > 0 &&
    typeof row.companyId === 'string' &&
    row.companyId.trim().length > 0 &&
    typeof row.userId === 'string' &&
    row.userId.trim().length > 0 &&
    typeof row.accessToken === 'string' &&
    row.accessToken.trim().length > 0
  );
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function writeTcSession(session: TcSession) {
  const ss = getSessionStorage();
  const ls = getLocalStorage();

  const safe: TcSession = {
    apiBase: session.apiBase.trim(),
    companyId: session.companyId.trim(),
    companyName: session.companyName?.trim() || undefined,
    userId: session.userId.trim(),
    accessToken: session.accessToken.trim(),
    email: session.email?.trim() || undefined,
    name: session.name?.trim() || undefined,
    role: normalizeRole(session.role) || undefined,
  };

  if (ss) {
    ss.setItem(TC_STORAGE_KEYS.session, JSON.stringify(safe));
    ss.setItem(TC_STORAGE_KEYS.apiBase, safe.apiBase);
    ss.setItem(TC_STORAGE_KEYS.companyId, safe.companyId);
    ss.setItem(TC_STORAGE_KEYS.userId, safe.userId);
    ss.setItem(TC_STORAGE_KEYS.accessToken, safe.accessToken);
  }

  if (ls) {
    ls.removeItem(TC_STORAGE_KEYS.session);
    ls.removeItem(TC_STORAGE_KEYS.apiBase);
    ls.removeItem(TC_STORAGE_KEYS.companyId);
    ls.removeItem(TC_STORAGE_KEYS.userId);
    ls.removeItem(TC_STORAGE_KEYS.accessToken);
  }
}

export function readTcSession(): TcSession | null {
  const ss = getSessionStorage();
  if (!ss) return null;

  const raw = ss.getItem(TC_STORAGE_KEYS.session);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isValidSession(parsed)) {
      clearTcSession();
      return null;
    }

    const typed = parsed as TcSession;

    return {
      ...typed,
      apiBase: typed.apiBase.trim(),
      companyId: typed.companyId.trim(),
      userId: typed.userId.trim(),
      accessToken: typed.accessToken.trim(),
      role: normalizeRole(typed.role),
    };
  } catch {
    clearTcSession();
    return null;
  }
}

export function clearTcSession() {
  const ss = getSessionStorage();
  const ls = getLocalStorage();

  if (ss) {
    ss.removeItem(TC_STORAGE_KEYS.session);
    ss.removeItem(TC_STORAGE_KEYS.apiBase);
    ss.removeItem(TC_STORAGE_KEYS.companyId);
    ss.removeItem(TC_STORAGE_KEYS.userId);
    ss.removeItem(TC_STORAGE_KEYS.accessToken);
  }

  if (ls) {
    ls.removeItem(TC_STORAGE_KEYS.session);
    ls.removeItem(TC_STORAGE_KEYS.apiBase);
    ls.removeItem(TC_STORAGE_KEYS.companyId);
    ls.removeItem(TC_STORAGE_KEYS.userId);
    ls.removeItem(TC_STORAGE_KEYS.accessToken);
  }
}

export function isTechnicianRole(role?: string | null) {
  return normalizeRole(role) === 'TECHNICIAN';
}

export function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
}

export function isTechnicianSession(
  session?: Pick<TcSession, 'role'> | null,
) {
  return isTechnicianRole(session?.role);
}

export function isAdminSession(
  session?: Pick<TcSession, 'role'> | null,
) {
  return isAdminRole(session?.role);
}

export function resolveHomePath(
  session?: Pick<TcSession, 'role'> | null,
): string {
  return isTechnicianSession(session)
    ? '/technician/dashboard'
    : '/dashboard';
}

export function resolveWorkOrdersPath(
  session?: Pick<TcSession, 'role'> | null,
): string {
  return isTechnicianSession(session)
    ? '/technician/dashboard/work-orders'
    : '/work-orders';
}