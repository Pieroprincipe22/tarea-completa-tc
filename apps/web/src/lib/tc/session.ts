export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3002';

export type TcSession = {
  apiBase: string;
  companyId: string;
  companyName?: string;
  userId: string;
  accessToken?: string;
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

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRole(role?: string | null): string {
  return String(role ?? '').trim().toUpperCase();
}

function sanitizeApiBase(value?: string | null): string {
  const raw = String(value ?? '').trim();
  return raw || DEFAULT_API_BASE;
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
    row.userId.trim().length > 0
  );
}

function normalizeSession(session: TcSession): TcSession {
  return {
    apiBase: sanitizeApiBase(session.apiBase),
    companyId: session.companyId.trim(),
    companyName: session.companyName?.trim() || undefined,
    userId: session.userId.trim(),
    accessToken: session.accessToken?.trim() || undefined,
    email: session.email?.trim().toLowerCase() || undefined,
    name: session.name?.trim() || undefined,
    role: normalizeRole(session.role) || undefined,
  };
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

function readFromStructuredStorage(storage: Storage | null): TcSession | null {
  if (!storage) return null;

  const raw = storage.getItem(TC_STORAGE_KEYS.session);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isValidSession(parsed)) {
      return null;
    }

    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

function readFromLegacyKeys(storage: Storage | null): TcSession | null {
  if (!storage) return null;

  const apiBase = sanitizeApiBase(storage.getItem(TC_STORAGE_KEYS.apiBase));
  const companyId = asString(storage.getItem(TC_STORAGE_KEYS.companyId));
  const userId = asString(storage.getItem(TC_STORAGE_KEYS.userId));

  if (!companyId || !userId) {
    return null;
  }

  return {
    apiBase,
    companyId,
    userId,
  };
}

function persistToStorage(storage: Storage | null, session: TcSession) {
  if (!storage) return;

  // El accessToken NUNCA se guarda: vive solo en la cookie httpOnly.
  // El accessToken NUNCA se guarda: vive solo en la cookie httpOnly.
  const persistable = {
    apiBase: session.apiBase,
    companyId: session.companyId,
    companyName: session.companyName,
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };

  storage.setItem(TC_STORAGE_KEYS.session, JSON.stringify(persistable));
  storage.setItem(TC_STORAGE_KEYS.apiBase, session.apiBase);
  storage.setItem(TC_STORAGE_KEYS.companyId, session.companyId);
  storage.setItem(TC_STORAGE_KEYS.userId, session.userId);
}

function clearStorage(storage: Storage | null) {
  if (!storage) return;

  storage.removeItem(TC_STORAGE_KEYS.session);
  storage.removeItem(TC_STORAGE_KEYS.apiBase);
  storage.removeItem(TC_STORAGE_KEYS.companyId);
  storage.removeItem(TC_STORAGE_KEYS.userId);
  storage.removeItem(TC_STORAGE_KEYS.accessToken);
}

export function writeTcSession(session: TcSession) {
  const safe = normalizeSession(session);
  const ss = getSessionStorage();
  const ls = getLocalStorage();

  persistToStorage(ss, safe);

  // La sesión activa vive en sessionStorage.
  // Limpiamos localStorage por compatibilidad con estados viejos.
  clearStorage(ls);
}

export function readTcSession(): TcSession | null {
  const ss = getSessionStorage();
  const ls = getLocalStorage();

  const fromSession =
    readFromStructuredStorage(ss) || readFromLegacyKeys(ss);

  if (fromSession) {
    // Reescribe en formato normalizado por si venía de claves legacy.
    persistToStorage(ss, fromSession);
    clearStorage(ls);
    return fromSession;
  }

  // Fallback legacy desde localStorage, migrando a sessionStorage.
  const fromLocal =
    readFromStructuredStorage(ls) || readFromLegacyKeys(ls);

  if (fromLocal) {
    persistToStorage(ss, fromLocal);
    clearStorage(ls);
    return fromLocal;
  }

  return null;
}

export function clearTcSession() {
  clearStorage(getSessionStorage());
  clearStorage(getLocalStorage());
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