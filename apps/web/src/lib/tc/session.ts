export type TcSession = {
  apiBase?: string;
  companyId: string;
  userId: string;
  email?: string;
  name?: string;
};

export const TC_LS_KEYS = {
  session: 'tc.session',
  apiBase: 'tc.apiBase',
  companyId: 'tc.companyId',
  userId: 'tc.userId',
} as const;

export const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3002';

export function readTcSession(): TcSession | null {
  if (typeof window === 'undefined') return null;

  // Preferido: tc.session
  const raw = window.localStorage.getItem(TC_LS_KEYS.session);
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

  // Legacy: keys sueltas
  const companyId = window.localStorage.getItem(TC_LS_KEYS.companyId) ?? '';
  const userId = window.localStorage.getItem(TC_LS_KEYS.userId) ?? '';
  if (!companyId || !userId) return null;

  const apiBase =
    window.localStorage.getItem(TC_LS_KEYS.apiBase) ?? DEFAULT_API_BASE;

  return { apiBase, companyId, userId };
}

export function writeTcSession(session: TcSession) {
  if (typeof window === 'undefined') return;

  const normalized: TcSession = {
    apiBase: session.apiBase ?? DEFAULT_API_BASE,
    companyId: session.companyId,
    userId: session.userId,
    email: session.email,
    name: session.name,
  };

  window.localStorage.setItem(TC_LS_KEYS.session, JSON.stringify(normalized));
  window.localStorage.setItem(TC_LS_KEYS.apiBase, normalized.apiBase ?? '');
  window.localStorage.setItem(TC_LS_KEYS.companyId, normalized.companyId);
  window.localStorage.setItem(TC_LS_KEYS.userId, normalized.userId);
}

export function clearTcSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TC_LS_KEYS.session);
  window.localStorage.removeItem(TC_LS_KEYS.apiBase);
  window.localStorage.removeItem(TC_LS_KEYS.companyId);
  window.localStorage.removeItem(TC_LS_KEYS.userId);
}
