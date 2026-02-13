export type TcSession = {
  companyId: string;
  userId: string;
  email?: string;
  name?: string;
};

export const TC_LS_KEYS = {
  session: "tc.session"
} as const;

export const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3002";

export function readTcSession(): TcSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TC_LS_KEYS.session);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TcSession;
  } catch {
    return null;
  }
}

export function writeTcSession(session: TcSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TC_LS_KEYS.session, JSON.stringify(session));
}

export function clearTcSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TC_LS_KEYS.session);
}
