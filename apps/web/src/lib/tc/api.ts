import {
  DEFAULT_API_BASE,
  clearTcSession,
  readTcSession,
  type TcSession,
  isTechnicianRole,
} from '@/lib/tc/session';

export type TcApiPaths = {
  base: string;
  health: string;
  tenantPing: string;
  customers: string;
  sites: string;
  assets: string;
  technicians: string;
  templates: string;
  reports: string;
  workOrders: string;
};

export type TcApiResponse<T = unknown> = {
  code: number;
  json: T;
};

export function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeBaseUrl(base?: string | null): string {
  const raw = String(base ?? DEFAULT_API_BASE).trim();

  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function normalizeHeaderValue(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();

  return normalized ? normalized : undefined;
}

export function resolveCorePaths(
  session?: Pick<TcSession, 'apiBase'> | null,
): TcApiPaths {
  const base = normalizeBaseUrl(session?.apiBase);

  return {
    base,
    health: '/health',
    tenantPing: '/tenant/ping',
    customers: '/customers',
    sites: '/sites',
    assets: '/assets',
    technicians: '/technicians',
    templates: '/maintenance-templates',
    reports: '/maintenance-reports',
    workOrders: '/work-orders',
  };
}

function toUrl(base: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedBase = normalizeBaseUrl(base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  const rawText = await response.text();

  if (!rawText.trim()) return null;

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText) as unknown;
    } catch {
      return rawText;
    }
  }

  return rawText;
}

function extractApiMessage(json: unknown): string {
  if (typeof json === 'string') {
    return json.trim();
  }

  if (!isRecord(json)) {
    return '';
  }

  const message = json.message;

  if (typeof message === 'string') {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const parts = message.filter(
      (item): item is string => typeof item === 'string' && !!item.trim(),
    );

    if (parts.length > 0) {
      return parts.join(' · ');
    }
  }

  const error = json.error;

  if (typeof error === 'string') {
    return error.trim();
  }

  return '';
}

function isExpiredOrInvalidAuth(code: number, json: unknown): boolean {
  if (code !== 401) return false;

  const message = extractApiMessage(json).toLowerCase();

  if (!message) return true;

  return (
    message.includes('invalid or expired token') ||
    message.includes('missing bearer token') ||
    message.includes('invalid token payload') ||
    message.includes('no active membership for company') ||
    message.includes('unauthorized')
  );
}

function redirectToLoginPreservingNext() {
  if (typeof window === 'undefined') return;

  const currentPath =
    window.location.pathname + window.location.search + window.location.hash;

  if (window.location.pathname === '/login') {
    return;
  }

  const next = encodeURIComponent(currentPath);

  window.location.replace(`/login?next=${next}`);
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

  const base = normalizeBaseUrl(session?.apiBase ?? DEFAULT_API_BASE);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const companyId = normalizeHeaderValue(session?.companyId);
  const userId = normalizeHeaderValue(session?.userId);
  const accessToken = normalizeHeaderValue(session?.accessToken);

  if (companyId) headers['x-company-id'] = companyId;
  if (userId) headers['x-user-id'] = userId;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(toUrl(base, path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  const json = (await readBody(response)) as T;

  if (isExpiredOrInvalidAuth(response.status, json)) {
    clearTcSession();
    redirectToLoginPreservingNext();
  }

  return {
    code: response.status,
    json,
  };
}

export async function tcGet<T = unknown>(
  session: TcSession | null,
  path: string,
): Promise<TcApiResponse<T>> {
  return tcFetch<T>(session, {
    method: 'GET',
    path,
  });
}

export async function tcPost<T = unknown>(
  session: TcSession | null,
  path: string,
  body?: unknown,
): Promise<TcApiResponse<T>> {
  return tcFetch<T>(session, {
    method: 'POST',
    path,
    body,
  });
}

export async function tcPatch<T = unknown>(
  session: TcSession | null,
  path: string,
  body?: unknown,
): Promise<TcApiResponse<T>> {
  return tcFetch<T>(session, {
    method: 'PATCH',
    path,
    body,
  });
}

export async function tcDelete<T = unknown>(
  session: TcSession | null,
  path: string,
  body?: unknown,
): Promise<TcApiResponse<T>> {
  return tcFetch<T>(session, {
    method: 'DELETE',
    path,
    body,
  });
}

export function normalizeList<T = unknown>(value: unknown): {
  items: T[];
  count: number;
} {
  if (Array.isArray(value)) {
    return {
      items: value as T[],
      count: value.length,
    };
  }

  if (isRecord(value)) {
    const maybeItems = value.items;
    const maybeCount = value.count;
    const maybeTotal = value.total;

    if (Array.isArray(maybeItems)) {
      if (typeof maybeCount === 'number') {
        return {
          items: maybeItems as T[],
          count: maybeCount,
        };
      }

      if (typeof maybeTotal === 'number') {
        return {
          items: maybeItems as T[],
          count: maybeTotal,
        };
      }

      return {
        items: maybeItems as T[],
        count: maybeItems.length,
      };
    }
  }

  return {
    items: [],
    count: 0,
  };
}

export function getCountFromUnknown(value: unknown): number {
  if (Array.isArray(value)) return value.length;

  if (isRecord(value)) {
    const count = value.count;

    if (typeof count === 'number') return count;

    const total = value.total;

    if (typeof total === 'number') return total;

    const maybeItems = value.items;

    if (Array.isArray(maybeItems)) return maybeItems.length;
  }

  return 0;
}

export async function getCount(
  session: TcSession | null,
  path: string,
): Promise<number> {
  const response = await tcGet(session, path);

  if (response.code < 200 || response.code >= 300) {
    throw new Error(`HTTP ${response.code} en ${path}`);
  }

  return getCountFromUnknown(response.json);
}

export type CoreNavItem = {
  key: string;
  title: string;
  path: string;
};

export function resolveCoreNavItems(
  session?: Pick<TcSession, 'role'> | null,
): CoreNavItem[] {
  const resolvedRole =
    session?.role ??
    (typeof window !== 'undefined' ? readTcSession()?.role : undefined);

  if (isTechnicianRole(resolvedRole)) {
    return [
      {
        key: 'dashboard',
        title: 'Dashboard',
        path: '/technician/dashboard',
      },
      {
        key: 'workOrders',
        title: 'Mis órdenes',
        path: '/technician/dashboard/work-orders',
      },
    ];
  }

  return [
    {
      key: 'dashboard',
      title: 'Dashboard',
      path: '/dashboard',
    },
    {
      key: 'pendingReports',
      title: 'Partes pendientes',
      path: '/admin/dashboard/maintenance-reports',
    },
    {
      key: 'workOrders',
      title: 'Work Orders',
      path: '/work-orders',
    },
    {
      key: 'reports',
      title: 'Partes técnicos',
      path: '/maintenance-reports',
    },
    {
      key: 'customers',
      title: 'Clientes',
      path: '/customers',
    },
    {
      key: 'sites',
      title: 'Sites',
      path: '/sites',
    },
    {
      key: 'assets',
      title: 'Activos',
      path: '/assets',
    },
  ];
}