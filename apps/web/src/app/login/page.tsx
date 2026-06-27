'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DEFAULT_API_BASE,
  clearTcSession,
  readTcSession,
  resolveHomePath,
  writeTcSession,
} from '@/lib/tc/session';
import { resolveCorePaths, tcGet } from '@/lib/tc/api';

type LoginCompany = {
  companyId: string;
  name: string;
  role: string;
};

type LoginResponse = {
  accessToken: string;
  userId: string;
  name?: string;
  email?: string;
  companyId?: string;
  companyName?: string;
  role?: string;
  companies: LoginCompany[];
};

type FormState = {
  apiBase: string;
  email: string;
  password: string;
  selectedCompanyId: string;
};

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeRole(role: string): string {
  return role.trim().toUpperCase();
}

function parseLoginResponse(value: unknown): LoginResponse | null {
  const obj = asRecord(value);

  const accessToken = asString(obj.accessToken).trim();
  const userId = asString(obj.userId).trim();
  const name = asString(obj.name).trim();
  const email = asString(obj.email).trim();
  const topLevelCompanyId = asString(obj.companyId).trim();
  const topLevelCompanyName = asString(obj.companyName).trim();
  const topLevelRole = normalizeRole(asString(obj.role));

  const companiesRaw = Array.isArray(obj.companies) ? obj.companies : [];

  const companies = companiesRaw
    .map((item) => {
      const row = asRecord(item);
      const companyId = asString(row.companyId).trim();
      const companyName = asString(row.name).trim();
      const role = normalizeRole(asString(row.role));

      if (!companyId || !companyName || !role) return null;

      return {
        companyId,
        name: companyName,
        role,
      };
    })
    .filter((item): item is LoginCompany => item !== null);

  if (!accessToken || !userId) {
    return null;
  }

  if (
    companies.length === 0 &&
    topLevelCompanyId &&
    topLevelCompanyName &&
    topLevelRole
  ) {
    companies.push({
      companyId: topLevelCompanyId,
      name: topLevelCompanyName,
      role: topLevelRole,
    });
  }

  return {
    accessToken,
    userId,
    name: name || undefined,
    email: email || undefined,
    companyId: topLevelCompanyId || undefined,
    companyName: topLevelCompanyName || undefined,
    role: topLevelRole || undefined,
    companies,
  };
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildErrorMessage(error: unknown, apiBase: string): string {
  if (error instanceof Error) {
    const msg = error.message?.trim();

    if (
      msg === 'Failed to fetch' ||
      msg === 'Load failed' ||
      msg.includes('fetch')
    ) {
      return `No se pudo conectar con ${apiBase}. Revisa que el API esté levantado, que la URL sea correcta y que CORS permita tu frontend.`;
    }

    return msg || 'Error desconocido al iniciar sesión.';
  }

  return 'Error desconocido al iniciar sesión.';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo<FormState>(
    () => ({
      apiBase: DEFAULT_API_BASE,
      email: '',
      password: '',
      selectedCompanyId: '',
    }),
    [],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingStoredSession, setCheckingStoredSession] = useState(true);
  const [loginData, setLoginData] = useState<LoginResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = readTcSession();

      if (!session) {
        if (!cancelled) setCheckingStoredSession(false);
        return;
      }

      try {
        const paths = resolveCorePaths(session);
        const ping = await tcGet<{ ok?: boolean }>(session, paths.tenantPing);

        if (cancelled) return;

        if (ping.code >= 200 && ping.code < 300) {
          const next = searchParams.get('next')?.trim();
          router.replace(next || resolveHomePath(session));
          return;
        }

        clearTcSession();
      } catch {
        clearTcSession();
      }

      if (!cancelled) {
        setCheckingStoredSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (key !== 'selectedCompanyId') {
      setLoginData(null);
      setError(null);
    }
  }

  function finishLogin(
    apiBase: string,
    accessToken: string,
    userId: string,
    userEmail: string,
    userName: string,
    company: LoginCompany,
  ) {
    writeTcSession({
      apiBase,
      companyId: company.companyId,
      companyName: company.name,
      userId,
      accessToken,
      email: userEmail,
      name: userName,
      role: company.role,
    });

    const next = searchParams.get('next')?.trim();
    router.replace(next || resolveHomePath({ role: company.role }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const apiBase = form.apiBase.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!isValidHttpUrl(apiBase)) {
      setError('API Base inválido. Ejemplo: http://localhost:3002');
      return;
    }

    if (!email) {
      setError('El email es obligatorio.');
      return;
    }

    if (!password) {
      setError('La contraseña es obligatoria.');
      return;
    }

    try {
      setLoading(true);
      setLoginData(null);

      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
        credentials: 'include', // ← imprescindible para guardar la cookie httpOnly
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        const obj = asRecord(json);
        const messageValue = obj.message;
        const message = Array.isArray(messageValue)
          ? messageValue.filter((v) => typeof v === 'string').join(', ')
          : asString(messageValue);

        throw new Error(message || `Error HTTP ${res.status} en /auth/login`);
      }

      const parsed = parseLoginResponse(json);

      if (!parsed) {
        throw new Error(
          'La respuesta de /auth/login no tiene el formato esperado.',
        );
      }

      if (parsed.companies.length === 0) {
        throw new Error(
          'El usuario no tiene empresas activas asignadas para iniciar sesión.',
        );
      }

      const sessionEmail = parsed.email ?? email;
      const sessionName = parsed.name ?? sessionEmail;

      if (parsed.companies.length === 1) {
        finishLogin(
          apiBase,
          parsed.accessToken,
          parsed.userId,
          sessionEmail,
          sessionName,
          parsed.companies[0],
        );
        return;
      }

      setLoginData(parsed);
      setForm((prev) => ({
        ...prev,
        selectedCompanyId: parsed.companies[0]?.companyId ?? '',
      }));
    } catch (err) {
      setError(buildErrorMessage(err, apiBase));
    } finally {
      setLoading(false);
    }
  }

  function onContinueWithCompany() {
    if (!loginData) return;

    const apiBase = form.apiBase.trim();
    const email = loginData.email ?? form.email.trim().toLowerCase();
    const name = loginData.name ?? email;

    const company = loginData.companies.find(
      (item) => item.companyId === form.selectedCompanyId,
    );

    if (!company) {
      setError('Selecciona una empresa válida.');
      return;
    }

    finishLogin(
      apiBase,
      loginData.accessToken,
      loginData.userId,
      email,
      name,
      company,
    );
  }

  function onReset() {
    clearTcSession();
    setForm(initial);
    setError(null);
    setLoginData(null);
  }

  if (checkingStoredSession) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h1 className="text-2xl font-semibold">Login</h1>
            <p className="mt-2 text-sm text-slate-400">
              Validando sesión guardada…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Login</h1>
            <p className="mt-2 text-sm text-slate-400">
              Inicia sesión contra <code>/auth/login</code> y guarda la sesión
              tenant real.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="apiBase"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                API Base
              </label>
              <input
                id="apiBase"
                value={form.apiBase}
                onChange={(e) => onChange('apiBase', e.target.value)}
                placeholder={DEFAULT_API_BASE}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => onChange('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                disabled={loading}
              />
            </div>

            {loginData && loginData.companies.length > 1 ? (
              <div>
                <label
                  htmlFor="company"
                  className="mb-1 block text-sm font-medium text-slate-300"
                >
                  Empresa
                </label>
                <select
                  id="company"
                  value={form.selectedCompanyId}
                  onChange={(e) => onChange('selectedCompanyId', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                  disabled={loading}
                >
                  {loginData.companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.name} · {company.role}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-900 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              {!loginData ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onContinueWithCompany}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continuar
                </button>
              )}

              <button
                type="button"
                onClick={onReset}
                disabled={loading}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}