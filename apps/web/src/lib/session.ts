export type Session = {
  apiBase: string;
  companyId: string;
  userId: string;
};

const DEFAULT_API = "http://localhost:3002";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;

  const apiBase = (window.localStorage.getItem("tc.apiBase") || DEFAULT_API).trim();
  const companyId = (window.localStorage.getItem("tc.companyId") || "").trim();
  const userId = (window.localStorage.getItem("tc.userId") || "").trim();

  if (!companyId || !userId) return null;
  return { apiBase, companyId, userId };
}

export function setSession(s: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("tc.apiBase", s.apiBase.trim() || DEFAULT_API);
  window.localStorage.setItem("tc.companyId", s.companyId.trim());
  window.localStorage.setItem("tc.userId", s.userId.trim());
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("tc.apiBase");
  window.localStorage.removeItem("tc.companyId");
  window.localStorage.removeItem("tc.userId");
}
