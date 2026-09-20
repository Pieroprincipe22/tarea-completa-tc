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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] px-6 py-10 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(2,132,199,0.10),transparent_38%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.055)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_78%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute text-[38px] font-black tracking-tighter text-blue-500">
              T
            </span>
            <span className="absolute left-5 text-[38px] font-black tracking-tighter text-sky-400">
              C
            </span>
          </div>
          <div className="leading-none">
            <p className="text-lg font-black tracking-wide text-white">
              TECHNICAL
            </p>
            <p className="text-lg font-black tracking-wide text-sky-300">
              COMMAND
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
          {checkingStoredSession ? (
            <div className="space-y-3 py-6 text-center">
              <h1 className="text-xl font-semibold">Validando sesión…</h1>
              <p className="text-sm text-slate-400">
                Un momento, estamos comprobando si ya tienes una sesión
                activa.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-white">
                  Iniciar sesión
                </h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  Accede al panel de gestión de mantenimiento
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-slate-300"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    placeholder="nombre@empresa.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-slate-300"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => onChange('password', e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-16 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-400 transition hover:text-sky-300"
                      tabIndex={-1}
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
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
                      onChange={(e) =>
                        onChange('selectedCompanyId', e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      disabled={loading}
                    >
                      {loginData.companies.map((company) => (
                        <option
                          key={company.companyId}
                          value={company.companyId}
                        >
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

                <button
                  type={loginData ? 'button' : 'submit'}
                  onClick={loginData ? onContinueWithCompany : undefined}
                  disabled={loading}
                  className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? 'Entrando…'
                    : loginData
                      ? 'Continuar'
                      : 'Entrar'}
                </button>
              </form>

              <div className="mt-5 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs font-medium text-slate-500 transition hover:text-slate-300"
                >
                  {showAdvanced ? 'Ocultar' : 'Opciones avanzadas'}
                </button>

                {showAdvanced ? (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label
                        htmlFor="apiBase"
                        className="mb-1 block text-xs font-medium text-slate-400"
                      >
                        API Base
                      </label>
                      <input
                        id="apiBase"
                        value={form.apiBase}
                        onChange={(e) => onChange('apiBase', e.target.value)}
                        placeholder={DEFAULT_API_BASE}
                        autoComplete="off"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none transition focus:border-sky-500"
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onReset}
                      disabled={loading}
                      className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Limpiar sesión guardada
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}