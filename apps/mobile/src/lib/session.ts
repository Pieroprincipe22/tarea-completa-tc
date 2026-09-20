import * as SecureStore from 'expo-secure-store';

// A diferencia de la web (que usa una cookie httpOnly), la app nativa no
// tiene cookie jar del navegador — guardamos el accessToken en SecureStore,
// que en iOS usa el Keychain y en Android el Keystore (cifrado por el SO).
// El backend ya soporta esto: TenantGuard cae a "Authorization: Bearer …"
// cuando no hay cookie.

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
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeTcSession(session: TcSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearTcSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function isTechnicianRole(role?: string | null): boolean {
  return String(role ?? '').trim().toUpperCase() === 'TECHNICIAN';
}
