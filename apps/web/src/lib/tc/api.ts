import { DEFAULT_API_BASE, readTcSession } from "@/lib/tc/session";

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function normalizeList<T>(x: unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

export function getCount(x: unknown): number | null {
  if (typeof x === "number") return x;
  if (isRecord(x) && typeof x.count === "number") return x.count;
  return null;
}

// ------- Core URLs (API) -------
export function resolveCoreUrls(base = DEFAULT_API_BASE) {
  return {
    base,
    health: `${base}/health`,
  };
}

// ------- Core Nav (Web) -------
export type CoreNavItem = { key: string; title: string; path: string };

export function resolveCoreNavItems(): CoreNavItem[] {
  return [
    { key: "dashboard", title: "Dashboard", path: "/" },
    { key: "customers", title: "Customers", path: "/customers" },
    { key: "sites", title: "Sites", path: "/sites" },
    { key: "assets", title: "Assets", path: "/assets" },
    { key: "templates", title: "Templates", path: "/maintenance-templates" },
    { key: "reports", title: "Maintenance Reports", path: "/maintenance-reports" },
    { key: "workOrders", title: "Work Orders", path: "/work-orders" },
  ];
}

type TcFetchOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // acepta "/health" o URL completa
  body?: unknown;
};

export async function tcGet<T = unknown>(path: string): Promise<T> {
  return tcFetch<T>({ method: "GET", path });
}

export async function tcFetch<T = unknown>(opts: TcFetchOpts): Promise<T> {
  const { method = "GET", path, body } = opts;

  const session = readTcSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // multi-tenant headers (mock login)
  if (session?.companyId) headers["x-company-id"] = session.companyId;
  if (session?.userId) headers["x-user-id"] = session.userId;

  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${DEFAULT_API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export function resolveCorePaths() {
  return {
    base: DEFAULT_API_BASE,
    health: "/health",
    templates: "/maintenance-templates",
    reports: "/maintenance-reports",
    workOrders: "/work-orders",
    customers: "/customers",
    sites: "/sites",
    assets: "/assets",
  };
}
