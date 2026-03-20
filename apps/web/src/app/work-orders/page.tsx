'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession } from '@/lib/tc/session';
import { errMsg, isRecord, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

type WorkOrderRow = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: number | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumOrNull(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

function parseRow(x: unknown): WorkOrderRow {
  if (!isRecord(x)) {
    return {
      id: '',
      number: 0,
      title: '—',
      status: '—',
      priority: null,
    };
  }

  return {
    id: asStr(x.id),
    number: typeof x.number === 'number' ? x.number : 0,
    title: asStr(x.title, '—'),
    status: asStr(x.status, '—'),
    priority: asNumOrNull(x.priority),
  };
}

function formatStatus(status: string): string {
  if (!status || status === '—') return '—';

  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'DONE':
      return 'Done';
    case 'DRAFT':
      return 'Draft';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

function formatPriority(priority: number | null): string {
  if (priority === null) return '—';

  switch (priority) {
    case 1:
      return '1 - Muy baja';
    case 2:
      return '2 - Baja';
    case 3:
      return '3 - Media';
    case 4:
      return '4 - Alta';
    case 5:
      return '5 - Urgente';
    default:
      return String(priority);
  }
}

export default function WorkOrdersPage() {
  const session = useMemo(() => readTcSession(), []);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [statusFilter, setStatusFilter] = useState('');
  const [state, setState] = useState<Load<WorkOrderRow[]>>({ status: 'loading' });

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      try {
        setState({ status: 'loading' });

        const url = statusFilter
          ? `${paths.workOrders}?status=${encodeURIComponent(statusFilter)}`
          : paths.workOrders;

        const r = await tcGet(session, url);

        if (cancelled) return;

        if (r.code < 200 || r.code >= 300) {
          setState({
            status: 'error',
            error: r.code === 403 ? '403 Not a member (UserCompany)' : `HTTP ${r.code}`,
          });
          return;
        }

        const { items } = normalizeList(r.json);
        const rows = items.map(parseRow).filter((w) => w.id);
        rows.sort((a, b) => b.number - a.number);

        setState({ status: 'ok', data: rows });
      } catch (e) {
        if (!cancelled) {
          setState({ status: 'error', error: errMsg(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, statusFilter, paths.workOrders]);

  if (!session) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-3xl font-semibold">Work Orders</h1>
        <p className="mb-4">Sin sesión tenant. Ve a /login.</p>
        <Link className="underline" href="/login">
          Ir a /login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Work Orders</h1>
        <Link className="underline" href="/dashboard">
          Dashboard
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Filtro status:</label>
          <input
            className="rounded-xl border px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="OPEN / IN_PROGRESS / DONE"
          />
          <button
            className="rounded-xl border px-4 py-2"
            onClick={() => setStatusFilter('')}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        {state.status === 'loading' ? (
          <p>Cargando…</p>
        ) : state.status === 'error' ? (
          <p>{state.error}</p>
        ) : state.data.length === 0 ? (
          <p>No hay work orders.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Título</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((w) => (
                <tr key={w.id} className="border-b">
                  <td className="px-3 py-3">{w.number}</td>
                  <td className="px-3 py-3">{w.title}</td>
                  <td className="px-3 py-3">{formatStatus(w.status)}</td>
                  <td className="px-3 py-3">{formatPriority(w.priority)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}