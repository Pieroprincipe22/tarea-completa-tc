'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_API_BASE,
  clearTcSession,
  readTcSession,
  resolveHomePath,
  writeTcSession,
} from '@/lib/tc/session';

type LoginCompany = {
  companyId: string;
  name: string;
  role: string;
};

type LoginResponse = {
  userId: string;
  name?: string;
  email?: string;
  companies: LoginCompany[];
};

type FormState = {
  apiBase: string;
  email: string;
  password: string;
  selectedCompanyId: string;
};

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseLoginResponse(value: unknown): LoginResponse | null {
  const obj = asRecord(value);
  const userId = asString(obj.userId);
  const name = asString(obj.name);
  const email = asString(obj.email);
  const companiesRaw = Array.isArray(obj.companies) ? obj.companies : [];

  const companies = companiesRaw
    .map((item) => {
      const row = asRecord(item);
      const companyId = asString(row.companyId);
      const companyName = asString(row.name);
      const role = asString(row.role);

      if (!companyId || !companyName || !role) return null;

      return { companyId, name: companyName, role };
    })
    .filter((item): item is LoginCompany => item !== null);

  if (!userId) return null;

  return {
    userId,
    name: name || undefined,
    email: email || undefined,
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

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const s = readTcSession();
    if (s) router.replace(resolveHomePath(s));
  }, [router]);

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
  const [loginData, setLoginData] = useState<LoginResponse | null>(null);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function finishLogin(
    apiBase: string,
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
      email: userEmail,
      name: userName,
      role: company.role,
    });

    router.replace(resolveHomePath({ role: company.role }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const apiBase = form.apiBase.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!isValidHttpUrl(apiBase)) {
      setError('apiBase inválido. Ej: http://localhost:3002');
      return;
    }

    if (!email) {
      setError('email requerido.');
      return;
    }

    if (!password) {
      setError('password requerido.');
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
        body: JSON.stringify({ email, password }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        const obj = asRecord(json);
        const message = asString(obj.message);
        throw new Error(message || `Error HTTP ${res.status} en /auth/login`);
      }

      const parsed = parseLoginResponse(json);

      if (!parsed) {
        throw new Error('La respuesta de /auth/login no tiene el formato esperado.');
      }

      if (parsed.companies.length === 0) {
        throw new Error('El usuario no tiene companies activas asignadas.');
      }

      const sessionEmail = parsed.email ?? email;
      const sessionName = parsed.name ?? sessionEmail;

      if (parsed.companies.length === 1) {
        finishLogin(
          apiBase,
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function onContinueWithCompany() {
    if (!loginData) return;

    const apiBase = form.apiBase.trim();
    const email = loginData.email ?? form.email.trim().toLowerCase();
    const name = loginData.name ?? email;
    const company = loginData.companies.find((c) => c.companyId === form.selectedCompanyId);

    if (!company) {
      setError('Selecciona una company válida.');
      return;
    }

    finishLogin(apiBase, loginData.userId, email, name, company);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-slate-300">
          Inicia sesión contra <code>/auth/login</code> y guarda la sesión tenant real.
        </p>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">API Base</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              value={form.apiBase}
              onChange={(e) => onChange('apiBase', e.target.value)}
              placeholder={DEFAULT_API_BASE}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Email</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="admin@tc.local"
              autoComplete="email"
              type="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Password</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              type="password"
            />
          </div>

          {loginData && loginData.companies.length > 1 ? (
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Company</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                value={form.selectedCompanyId}
                onChange={(e) => onChange('selectedCompanyId', e.target.value)}
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
            <div className="rounded-xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            {!loginData ? (
              <button
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-slate-900 font-medium disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            ) : (
              <button
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-slate-900 font-medium"
                type="button"
                onClick={onContinueWithCompany}
              >
                Continuar
              </button>
            )}

            <button
              type="button"
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
              onClick={() => {
                clearTcSession();
                setForm(initial);
                setError(null);
                setLoginData(null);
              }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}