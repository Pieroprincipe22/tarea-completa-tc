'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  tcGet,
} from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type CompanyPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';

type CompanyRow = {
  id: string;
  name: string;
  plan: CompanyPlan;
  isActive: boolean;
  createdAt?: string | null;
  userCount: number;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asPlan(value: unknown): CompanyPlan {
  return value === 'PRO' || value === 'ENTERPRISE' ? value : 'BASIC';
}

function parseCompany(value: unknown): CompanyRow {
  if (!isRecord(value)) {
    return { id: '', name: 'Empresa', plan: 'BASIC', isActive: true, userCount: 0 };
  }

  const count = isRecord(value._count) ? value._count.userCompanies : undefined;

  return {
    id: asStr(value.id),
    name: asStr(value.name, 'Empresa sin nombre'),
    plan: asPlan(value.plan),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    userCount: typeof count === 'number' ? count : 0,
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function planBadgeClass(plan: CompanyPlan): string {
  if (plan === 'ENTERPRISE') {
    return 'border-violet-400/40 bg-violet-400/10 text-violet-200';
  }
  if (plan === 'PRO') {
    return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
  }
  return 'border-slate-400/30 bg-slate-400/10 text-slate-300';
}

export default function SuperAdminPage() {
  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load<CompanyRow[]>>({ status: 'loading' });

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const isSuperAdmin = useMemo(
    () => (session?.role ?? '').toUpperCase() === 'SUPER_ADMIN',
    [session],
  );

  const loadCompanies = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await tcGet(session, '/companies');
      if (res.code < 200 || res.code >= 300) {
        setState({
          status: 'error',
          error: `Error ${res.code} al cargar empresas`,
        });
        return;
      }
      const { items } = normalizeList(res.json);
      setState({ status: 'ok', data: items.map(parseCompany) });
    } catch (e) {
      setState({ status: 'error', error: errMsg(e) });
    }
  }, [session]);

  useEffect(() => {
    if (ready && isSuperAdmin) {
      void loadCompanies();
    }
  }, [ready, isSuperAdmin, loadCompanies]);

  // --- Control de acceso ---
  if (!ready) {
    return (
      <div className="p-8 text-slate-400">Cargando…</div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-3xl border border-rose-400/30 bg-rose-400/5 p-8 text-center">
          <h1 className="text-xl font-black text-white">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Esta sección es exclusiva para administradores de plataforma
            (SUPER_ADMIN). Si crees que deberías tener acceso, contacta con el
            responsable del sistema.
          </p>
        </div>
      </div>
    );
  }

  // --- Panel ---
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
          Plataforma
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          Panel de administración
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Gestiona las empresas dadas de alta en TC Mantenimiento, sus planes y
          su estado.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-white">
            Empresas
          </h2>
          <button
            type="button"
            onClick={() => void loadCompanies()}
            className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-300 transition hover:bg-slate-800"
          >
            Recargar
          </button>
        </div>

        {state.status === 'loading' ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Cargando empresas…
          </p>
        ) : null}

        {state.status === 'error' ? (
          <p className="py-8 text-center text-sm text-rose-300">
            {state.error}
          </p>
        ) : null}

        {state.status === 'ok' ? (
          state.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No hay empresas registradas todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Empresa</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Usuarios</th>
                    <th className="px-3 py-3">Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-800/60 last:border-0"
                    >
                      <td className="px-3 py-3 font-bold text-white">
                        {c.name}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${planBadgeClass(
                            c.plan,
                          )}`}
                        >
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            c.isActive
                              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                              : 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                          }`}
                        >
                          {c.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{c.userCount}</td>
                      <td className="px-3 py-3 text-slate-400">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}