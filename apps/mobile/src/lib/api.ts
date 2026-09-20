import { type TcSession } from '@/lib/session';

export type TcApiResponse<T = unknown> = {
  code: number;
  json: T;
};

function normalizeBase(base: string): string {
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function extractMessage(json: unknown, fallback: string): string {
  if (typeof json === 'string' && json.trim()) return json;
  if (!isRecord(json)) return fallback;
  const message = json.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === 'string');
    if (parts.length) return parts.join(', ');
  }
  return fallback;
}

async function tcFetch<T = unknown>(
  session: TcSession,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<TcApiResponse<T>> {
  const base = normalizeBase(session.apiBase);
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.accessToken}`,
    'x-company-id': session.companyId,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = (await readBody(response)) as T;
  return { code: response.status, json };
}

export function tcGet<T = unknown>(session: TcSession, path: string) {
  return tcFetch<T>(session, 'GET', path);
}

export function tcPost<T = unknown>(session: TcSession, path: string, body?: unknown) {
  return tcFetch<T>(session, 'POST', path, body);
}

export function tcPatch<T = unknown>(session: TcSession, path: string, body?: unknown) {
  return tcFetch<T>(session, 'PATCH', path, body);
}

export function normalizeList<T = unknown>(value: unknown): { items: T[]; count: number } {
  if (Array.isArray(value)) return { items: value as T[], count: value.length };
  if (isRecord(value)) {
    const items = value.items;
    if (Array.isArray(items)) {
      const total = value.total;
      return {
        items: items as T[],
        count: typeof total === 'number' ? total : items.length,
      };
    }
  }
  return { items: [], count: 0 };
}
