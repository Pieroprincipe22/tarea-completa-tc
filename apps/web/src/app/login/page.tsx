'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_API_BASE, readTcSession, TC_LS_KEYS, clearTcSession } from '@/lib/tc/session';

type FormState = {
  apiBase: string;
  companyId: string;
  userId: string;
};

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

  // Si ya hay sesión, fuera de /login
  useEffect(() => {
    const s = readTcSession();
    if (s) router.replace('/');
  }, [router]);

  const initial = useMemo<FormState>(() => {
    // Estamos en client, así que podemos leer localStorage
    const apiBase = window.localStorage.getItem(TC_LS_KEYS.apiBase) ?? DEFAULT_API_BASE;
    const companyId = window.localStorage.getItem(TC_LS_KEYS.companyId) ?? '';
    const userId = window.localStorage.getItem(TC_LS_KEYS.userId) ?? '';
    return { apiBase, companyId, userId };
  }, []);

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
    if (!companyId) {
      setError('companyId requerido.');
      return;
    }
    if (!userId) {
      setError('userId requerido.');
      return;
    }

    window.localStorage.setItem(TC_LS_KEYS.apiBase, apiBase);
    window.localStorage.setItem(TC_LS_KEYS.companyId, companyId);
    window.localStorage.setItem(TC_LS_KEYS.userId, userId);

    router.replace('/');
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-white">Login (mock)</h1>
      <p className="mt-1 text-sm text-slate-400">Guarda la sesión en localStorage y redirige al inicio.</p>

      <form onSubmit={onSubmit} className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
        <label className="block text-sm text-slate-300">
          API Base
          <input
            className="mt-1 w-full rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none"
            value={form.apiBase}
            onChange={(e) => onChange('apiBase', e.target.value)}
            placeholder={DEFAULT_API_BASE}
            autoComplete="off"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            companyId
            <input
              className="mt-1 w-full rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none"
              value={form.companyId}
              onChange={(e) => onChange('companyId', e.target.value)}
              placeholder="uuid"
              autoComplete="off"
            />
          </label>

          <label className="block text-sm text-slate-300">
            userId
            <input
              className="mt-1 w-full rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none"
              value={form.userId}
              onChange={(e) => onChange('userId', e.target.value)}
              placeholder="uuid"
              autoComplete="off"
            />
          </label>
        </div>

        {error ? <div className="mt-4 text-sm text-red-200">{error}</div> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-slate-800/60 ring-1 ring-white/10 px-4 py-2 text-sm text-white hover:opacity-95"
          >
            Entrar
          </button>

          <button
            type="button"
            className="rounded-xl bg-slate-800/60 ring-1 ring-white/10 px-4 py-2 text-sm text-white hover:opacity-95"
            onClick={() => {
              clearTcSession();
              setForm({ apiBase: DEFAULT_API_BASE, companyId: '', userId: '' });
              setError(null);
            }}
          >
            Limpiar
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Keys usadas: {TC_LS_KEYS.apiBase}, {TC_LS_KEYS.companyId}, {TC_LS_KEYS.userId}
        </div>
      </form>
    </div>
  );
}
