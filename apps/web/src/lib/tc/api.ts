import { DEFAULT_API_BASE, type TcSession } from '@/lib/tc/session';

export type TcApiPaths = {
  base: string;
  health: string;
  tenantPing: string;
  customers: string;
  sites: string;
  assets: string;
  templates: string;
  reports: string;
  workOrders: string;
};

export type TcApiResponse<T = unknown> = { code: number; json: T };

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function resolveCorePaths(
  session?: Pick<TcSession, 'apiBase'> | null,
): TcApiPaths {
  const base = session?.apiBase ?? DEFAULT_API_BASE;
  return {
    base,
    health: '/health',
    tenantPing: '/tenant/ping',
    customers: '/customers',
    sites: '/sites',
    assets: '/assets',
    templates: '/maintenance-templates',
    reports: '/maintenance-reports',
    workOrders: '/work-orders',
  };
}

function toUrl(base: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as unknown;
  return (await res.text()) as unknown;
}

export type TcFetchOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
};

export async function tcFetch<T = unknown>(
  session: TcSession | null,
  opts: TcFetchOpts,
): Promise<TcApiResponse<T>> {
  const { method = 'GET', path, body } = opts;
  const base = session?.apiBase ?? DEFAULT_API_BASE;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session?.companyId) headers['x-company-id'] = session.companyId;
  if (session?.userId) headers['x-user-id'] = session.userId;

  const res = await fetch(toUrl(base, path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = (await readBody(res)) as unknown;
  return { code: res.status, json: json as T };
}

export async function tcGet<T = unknown>(
  session: TcSession | null,
  path: string,
): Promise<TcApiResponse<T>> {
  return tcFetch<T>(session, { method: 'GET', path });
}

export function normalizeList<T>(x: unknown): { items: T[]; count: number } {
  if (Array.isArray(x)) return { items: x as T[], count: x.length };

  if (isRecord(x)) {
    const maybeItems = (x as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) return { items: maybeItems as T[], count: maybeItems.length };
  }

  return { items: [], count: 0 };
}

export function getCountFromUnknown(x: unknown): number {
  if (Array.isArray(x)) return x.length;

  if (isRecord(x)) {
    const c = (x as { count?: unknown }).count;
    if (typeof c === 'number') return c;

    const maybeItems = (x as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) return maybeItems.length;
  }

  return 0;
}

export async function getCount(
  session: TcSession | null,
  path: string,
): Promise<number> {
  const r = await tcGet<unknown>(session, path);
  if (r.code < 200 || r.code >= 300) throw new Error(`HTTP ${r.code} en ${path}`);
  return getCountFromUnknown(r.json);
}

export type CoreNavItem = { key: string; title: string; path: string };

export function resolveCoreNavItems(): CoreNavItem[] {
  return [
    { key: 'dashboard', title: 'Dashboard', path: '/dashboard' },
    { key: 'customers', title: 'Customers', path: '/customers' },
    { key: 'reports', title: 'Maintenance Reports', path: '/maintenance-reports' },
    { key: 'workOrders', title: 'Work Orders', path: '/work-orders' },
  ];
}
