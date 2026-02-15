'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_API_BASE,
  clearTcSession,
  readTcSession,
  writeTcSession,
} from '@/lib/tc/session';

type FormState = { apiBase: string; companyId: string; userId: string };

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const s = readTcSession();
    if (s) router.replace('/dashboard');
  }, [router]);

  const initial = useMemo<FormState>(
    () => ({ apiBase: DEFAULT_API_BASE, companyId: '', userId: '' }),
    [],
  );

  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const apiBase = form.apiBase.trim();
    const companyId = form.companyId.trim();
    const userId = form.userId.trim();

    if (!isValidHttpUrl(apiBase)) {
      setError('apiBase inválido. Ej: http://localhost:3002');
      return;
    }
    if (!companyId) return setError('companyId requerido.');
    if (!userId) return setError('userId requerido.');

    writeTcSession({ apiBase, companyId, userId, name: 'Demo' });
    router.replace('/dashboard');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Login (mock)</h1>
        <p className="text-sm text-slate-300">
          Guarda sesión en <code>localStorage</code> y redirige al dashboard.
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
            <label className="text-sm text-slate-300">companyId</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              value={form.companyId}
              onChange={(e) => onChange('companyId', e.target.value)}
              placeholder="uuid"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">userId</label>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              value={form.userId}
              onChange={(e) => onChange('userId', e.target.value)}
              placeholder="uuid"
              autoComplete="off"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-slate-900 font-medium">
              Entrar
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
              onClick={() => {
                clearTcSession();
                setForm(initial);
                setError(null);
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
