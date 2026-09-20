// Sustituto para web: expo-secure-store (Keychain/Keystore) no tiene
// equivalente real en el navegador. La app real de campo es Android/iOS,
// donde session.ts (no este archivo) usa SecureStore de verdad. Esto solo
// existe para que la vista previa web funcione; usa localStorage, que para
// un preview de desarrollo es suficiente.

const SESSION_KEY = 'tc.session';

export const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_BASE?.trim() || 'http://localhost:3002';

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

function isValidSession(value: unknown): value is TcSession {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.apiBase === 'string' &&
    typeof row.companyId === 'string' &&
    row.companyId.length > 0 &&
    typeof row.userId === 'string' &&
    row.userId.length > 0 &&
    typeof row.accessToken === 'string' &&
    row.accessToken.length > 0
  );
}

export async function readTcSession(): Promise<TcSession | null> {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeTcSession(session: TcSession): Promise<void> {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearTcSession(): Promise<void> {
  window.localStorage.removeItem(SESSION_KEY);
}

export function isTechnicianRole(role?: string | null): boolean {
  return String(role ?? '').trim().toUpperCase() === 'TECHNICIAN';
}
