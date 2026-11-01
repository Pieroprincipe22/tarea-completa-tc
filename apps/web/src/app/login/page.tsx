'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DEFAULT_API_BASE,
  clearTcSession,
  readTcSession,
  resolveHomePath,
  writeTcSession,
} from '@/lib/tc/session';
import { resolveCorePaths, tcGet } from '@/lib/tc/api';
import {
  AuthLayout,
  EyeIcon,
  FieldIcon,
  FormError,
  LockIcon,
  MailIcon,
  Spinner,
  inputClass,
  primaryButtonClass,
} from '@/components/auth/AuthLayout';

const IS_DEV = process.env.NODE_ENV !== 'production';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? '';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h >= 6 && h < 14) return 'Buenos días';
  if (h >= 14 && h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

// Traduce los mensajes del API a algo que entienda el usuario final.
function friendlyApiError(status: number, message: string): string {
  if (status === 429) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  }
  if (/invalid credentials/i.test(message)) {
    return 'Email o contraseña incorrectos.';
  }
  if (/no active company/i.test(message)) {
    return 'Tu usuario no tiene ninguna empresa activa. Habla con el administrador de tu empresa.';
  }
  return message || `No se pudo iniciar sesión (error ${status}).`;
}

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
      return IS_DEV
        ? `No se pudo conectar con ${apiBase}. Revisa que el API esté levantado, que la URL sea correcta y que CORS permita tu frontend.`
        : 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
    }

    return msg || 'Error desconocido al iniciar sesión.';
  }

  return 'Error desconocido al iniciar sesión.';
}

function LoginView() {
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
  const [hello] = useState(() => greeting());

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

        throw new Error(friendlyApiError(res.status, message));
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

  function onBackToCredentials() {
    setLoginData(null);
    setError(null);
    setForm((prev) => ({ ...prev, selectedCompanyId: '' }));
  }

  if (checkingStoredSession) {
    return (
      <AuthLayout title="Comprobando sesión…">
        <div className="flex items-center gap-3 text-sm text-muted">
          <Spinner />
          Un momento, estamos viendo si ya tienes una sesión abierta.
        </div>
      </AuthLayout>
    );
  }

  const footer = CONTACT_EMAIL ? (
    <>
      ¿Tu empresa aún no usa AnPi Tech?{' '}
      <a
        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Solicitud de acceso a AnPi Tech')}`}
        className="font-medium text-accent hover:underline"
      >
        Solicita acceso
      </a>
    </>
  ) : (
    <>¿No tienes cuenta? Pídesela al administrador de tu empresa.</>
  );

  // Paso 2: el usuario pertenece a varias empresas y tiene que elegir una.
  if (loginData && loginData.companies.length > 1) {
    return (
      <AuthLayout
        title="Elige empresa"
        subtitle={`Tu usuario tiene acceso a ${loginData.companies.length} empresas.`}
        footer={footer}
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">Empresa</legend>
          {loginData.companies.map((company) => {
            const checked = form.selectedCompanyId === company.companyId;
            return (
              <label
                key={company.companyId}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                  checked
                    ? 'border-accent bg-accent-soft'
                    : 'border-line hover:bg-surface-2'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="company"
                    value={company.companyId}
                    checked={checked}
                    onChange={() =>
                      onChange('selectedCompanyId', company.companyId)
                    }
                    className="accent-accent"
                  />
                  <span className="font-medium text-ink">{company.name}</span>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-subtle">
                  {company.role}
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-4 space-y-3">
          <FormError message={error} />
          <button
            type="button"
            onClick={onContinueWithCompany}
            className={primaryButtonClass}
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onBackToCredentials}
            className="w-full text-center text-sm text-muted hover:text-ink"
          >
            Volver
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={hello}
      subtitle="Inicia sesión para continuar con tu trabajo."
      footer={footer}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-ink-2"
          >
            Email
          </label>
          <div className="relative">
            <FieldIcon>
              <MailIcon />
            </FieldIcon>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="nombre@empresa.com"
              autoComplete="email"
              autoFocus
              aria-invalid={Boolean(error) && !form.email.trim()}
              className={inputClass}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink-2"
            >
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-accent hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <FieldIcon>
              <LockIcon />
            </FieldIcon>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              aria-invalid={Boolean(error) && !form.password}
              className={`${inputClass} pr-11`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle transition hover:text-ink"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>

        <FormError message={error} />

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Spinner />
              Entrando…
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      {IS_DEV ? (
        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-wide text-subtle transition hover:text-ink"
          >
            {showAdvanced ? 'Ocultar opciones de desarrollo' : 'Opciones de desarrollo'}
          </button>

          {showAdvanced ? (
            <div className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor="apiBase"
                  className="mb-1 block text-xs font-medium text-muted"
                >
                  API Base
                </label>
                <input
                  id="apiBase"
                  value={form.apiBase}
                  onChange={(e) => onChange('apiBase', e.target.value)}
                  placeholder={DEFAULT_API_BASE}
                  autoComplete="off"
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2 outline-none focus:border-accent"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={onReset}
                disabled={loading}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpiar sesión guardada
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </AuthLayout>
  );
}

// useSearchParams necesita un límite de Suspense para que `next build` no falle.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}
