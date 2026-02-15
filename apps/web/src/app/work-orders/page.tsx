'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, isRecord, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

type WorkOrderRow = {
  id: string;
  number: number;
  title: string;
  state: string;
  priority: string;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function asNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}

function parseRow(x: unknown): WorkOrderRow {
  if (!isRecord(x)) return { id: '', number: 0, title: '—', state: '—', priority: '—' };
  return {
    id: asStr(x.id),
    number: asNum(x.number, 0),
    title: asStr(x.title, '—'),
    state: asStr(x.state, '—'),
    priority: asStr(x.priority, '—'),
  };
}

export default function WorkOrdersPage() {
  const session = useMemo<TcSession | null>(() => readTcSession(), []);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [status, setStatus] = useState<string>(''); // filtro
  const [state, setState] = useState<Load<WorkOrderRow[]>>({ status: 'loading' });

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      try {
        setState({ status: 'loading' });

        const url = status
          ? `${paths.workOrders}?status=${encodeURIComponent(status)}`
          : paths.workOrders;

        const r = await tcGet<unknown>(session, url); // ✅ 2 argumentos

        if (cancelled) return;

        if (r.code < 200 || r.code >= 300) {
          setState({
            status: 'error',
            error: r.code === 403 ? '403 Not a member (UserCompany)' : `HTTP ${r.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(r.json);
        const rows = items.map(parseRow).filter((w) => w.id);
        rows.sort((a, b) => b.number - a.number);

        setState({ status: 'ok', data: rows });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, status, paths.workOrders]);

  if (!session) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Work Orders</h1>
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
        <h1 className="text-xl font-semibold">Work Orders</h1>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-3">
        <label className="text-sm text-slate-300">Filtro status:</label>
        <input
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="DRAFT / OPEN / IN_PROGRESS / DONE"
        />
        <button
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          type="button"
          onClick={() => setStatus('')}
        >
          Limpiar
        </button>
      </div>

      {state.status === 'loading' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">Cargando…</div>
      ) : state.status === 'error' ? (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 text-red-200">
          {state.error}
        </div>
      ) : state.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-200">
          No hay work orders.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-300">
              <tr>
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Título</th>
                <th className="text-left py-2">Estado</th>
                <th className="text-left py-2">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((w) => (
                <tr key={w.id} className="border-t border-slate-800">
                  <td className="py-2">{w.number}</td>
                  <td className="py-2">{w.title}</td>
                  <td className="py-2">{w.state}</td>
                  <td className="py-2">{w.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
