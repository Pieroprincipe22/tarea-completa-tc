import { DEFAULT_API_BASE, readTcSession } from '@/lib/tc/session';

type ApiFetchOptions = RequestInit;

function getSession() {
  if (typeof window === 'undefined') return null;
  return readTcSession();
}

function getApiBase() {
  return getSession()?.apiBase || DEFAULT_API_BASE;
}

function getTenantHeaders() {
  const session = getSession();

  return {
    'x-company-id': session?.companyId || '',
    'x-user-id': session?.userId || '',
  };
}

function joinUrl(base: string, path: string) {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readBody<T = unknown>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }

  return (await res.text()) as T;
}

function getErrorMessage(body: unknown, status: number, statusText: string) {
  if (typeof body === 'string' && body.trim()) {
    return `API ${status} ${statusText} - ${body}`;
  }

  if (body && typeof body === 'object') {
    const json = body as { message?: unknown; error?: unknown };

    if (typeof json.message === 'string' && json.message.trim()) {
      return `API ${status} ${statusText} - ${json.message}`;
    }

    if (Array.isArray(json.message)) {
      const joined = json.message
        .filter((x): x is string => typeof x === 'string' && !!x.trim())
        .join(', ');

      if (joined) {
        return `API ${status} ${statusText} - ${joined}`;
      }
    }

    if (typeof json.error === 'string' && json.error.trim()) {
      return `API ${status} ${statusText} - ${json.error}`;
    }
  }

  return `API ${status} ${statusText}`;
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const base = getApiBase();
  const headers = new Headers(opts.headers || {});
  const tenant = getTenantHeaders();

  Object.entries(tenant).forEach(([k, v]) => {
    if (v) headers.set(k, v);
  });

  headers.set('Accept', 'application/json');

  const res = await fetch(joinUrl(base, path), {
    ...opts,
    headers,
  });

  const body = await readBody<unknown>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(body, res.status, res.statusText));
  }

  return body as T;
}