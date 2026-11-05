import { clearSession, DEFAULT_API_BASE, type InventorySession } from './session';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function joinUrl(base: string, path: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const message = (body as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) return message;

    if (Array.isArray(message)) {
      const parts = message.filter((item): item is string => typeof item === 'string');
      if (parts.length > 0) return parts.join(' · ');
    }
  }

  if (status === 0) return 'No hay conexión con el servidor.';
  if (status === 403) return 'No tienes permisos para esta acción.';
  if (status === 404) return 'No encontrado.';

  return `Error ${status}`;
}

/**
 * Todas las llamadas a la API pasan por aquí: añade la empresa, el token y
 * las cookies. Si la sesión ha caducado, la borra y vuelve al login.
 */
export async function apiFetch<T>(
  session: InventorySession | null,
  method: Method,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session?.companyId) headers['x-company-id'] = session.companyId;
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  let response: Response;

  try {
    response = await fetch(joinUrl(session?.apiBase || DEFAULT_API_BASE, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, message: messageFrom(null, 0) };
  }

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (response.status === 401 && session && typeof window !== 'undefined') {
    clearSession();
    window.location.replace('/login');
  }

  if (!response.ok) {
    return { ok: false, status: response.status, message: messageFrom(parsed, response.status) };
  }

  return { ok: true, status: response.status, data: parsed as T };
}
