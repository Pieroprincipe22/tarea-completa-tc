'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, isRecord, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  intervalDays: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function asNumOrNull(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

function parseRow(x: unknown): TemplateRow {
  if (!isRecord(x)) {
    return {
      id: '',
      name: '—',
      description: null,
      isActive: false,
      intervalDays: null,
    };
  }

  return {
    id: asStr(x.id),
    name: asStr(x.name, '—'),
    description: typeof x.description === 'string' ? x.description : null,
    isActive: asBool(x.isActive, true),
    intervalDays: asNumOrNull(x.intervalDays),
    createdAt: typeof x.createdAt === 'string' ? x.createdAt : undefined,
    updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : undefined,
  };
}

export default function MaintenanceTemplatesPage() {
  const session = useMemo<TcSession | null>(() => readTcSession(), []);
  const [state, setState] = useState<Load<TemplateRow[]>>({ status: 'loading' });

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      try {
        setState({ status: 'loading' });

        const paths = resolveCorePaths(session);
        const r = await tcGet<unknown>(session, paths.templates);

        if (cancelled) return;

        if (r.code < 200 || r.code >= 300) {
          setState({
            status: 'error',
            error: r.code === 403 ? '403 Not a member (UserCompany)' : `HTTP ${r.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(r.json);
        const rows = items.map(parseRow).filter((t) => t.id);

        setState({ status: 'ok', data: rows });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Maintenance Templates</h1>
        <p className="text-sm text-slate-300">Sin sesión tenant. Ve a /login.</p>
        <Link className="underline" href="/login">
          Ir a /login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Maintenance Templates</h1>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/dashboard">
            Dashboard
          </Link>
          <Link className="underline" href="/maintenance-reports">
            Reports
          </Link>
        </div>
      </div>

      {state.status === 'loading' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          Cargando…
        </div>
      ) : state.status === 'error' ? (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 text-red-200">
          {state.error}
        </div>
      ) : state.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-200">
          No hay templates todavía.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-300">
              <tr>
                <th className="text-left py-2">Nombre</th>
                <th className="text-left py-2">Activo</th>
                <th className="text-left py-2">Intervalo</th>
                <th className="text-left py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((t) => (
                <tr key={t.id} className="border-t border-slate-800">
                  <td className="py-2">
                    <div className="font-medium">{t.name}</div>
                    {t.description ? (
                      <div className="text-xs text-slate-400">{t.description}</div>
                    ) : null}
                  </td>
                  <td className="py-2">{t.isActive ? 'Sí' : 'No'}</td>
                  <td className="py-2">{t.intervalDays ?? '—'}</td>
                  <td className="py-2">
                    <Link className="underline" href={`/maintenance-templates/${t.id}`}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
