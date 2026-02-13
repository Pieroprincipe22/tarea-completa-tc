// apps/web/src/lib/api.ts
type ApiFetchOptions = RequestInit;

function getApiBase() {
  if (typeof window === "undefined") return "http://localhost:3002";
  return localStorage.getItem("tc.apiBase") || "http://localhost:3002";
}

function getTenantHeaders() {
  if (typeof window === "undefined") return {};
  return {
    "x-company-id": localStorage.getItem("tc.companyId") || "",
    "x-user-id": localStorage.getItem("tc.userId") || "",
  };
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const base = getApiBase();
  const headers = new Headers(opts.headers || {});
  const tenant = getTenantHeaders();

  Object.entries(tenant).forEach(([k, v]) => v && headers.set(k, v));
  headers.set("Accept", "application/json");

  const res = await fetch(`${base}${path}`, { ...opts, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${text}`);
  }

  return (await res.json()) as T;
}
