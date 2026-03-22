'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  readTcSession,
  resolveWorkOrdersPath,
  isTechnicianSession,
  type TcSession,
} from '@/lib/tc/session';
import { errMsg, isRecord, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

const STATUS_OPTIONS = ['', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
type StatusFilterValue = (typeof STATUS_OPTIONS)[number];

type WorkOrderRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string | null;
  customer?: { id: string; name: string } | null;
  site?: { id: string; name: string; address?: string | null } | null;
  asset?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string; email?: string } | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
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

function asNullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function parseNamedEntity(
  v: unknown,
): { id: string; name: string; address?: string | null; email?: string } | null {
  if (!isRecord(v)) return null;

  const id = asStr(v.id);
  const name = asStr(v.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    address: asNullableStr(v.address),
    email: asNullableStr(v.email) ?? undefined,
  };
}

function asPriority(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().toUpperCase() : null;
}

function parseRow(x: unknown): WorkOrderRow {
  if (!isRecord(x)) {
    return {
      id: '',
      title: '—',
      status: '—',
      priority: null,
    };
  }

  return {
    id: asStr(x.id),
    title: asStr(x.title, '—'),
    description: asNullableStr(x.description),
    status: asStr(x.status, '—'),
    priority: asPriority(x.priority),
    customer: parseNamedEntity(x.customer),
    site: parseNamedEntity(x.site),
    asset: parseNamedEntity(x.asset),
    assignedTo: parseNamedEntity(x.assignedTo),
    scheduledAt: asNullableStr(x.scheduledAt),
    startedAt: asNullableStr(x.startedAt),
    completedAt: asNullableStr(x.completedAt),
    createdAt: asNullableStr(x.createdAt) ?? undefined,
    updatedAt: asNullableStr(x.updatedAt) ?? undefined,
  };
}

function formatStatus(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'ASSIGNED':
      return 'Assigned';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'DONE':
      return 'Done';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status || '—';
  }
}

function formatPriority(priority: string | null): string {
  switch (priority) {
    case 'LOW':
      return 'Baja';
    case 'MEDIUM':
      return 'Media';
    case 'HIGH':
      return 'Alta';
    case 'URGENT':
      return 'Urgente';
    default:
      return '—';
  }
}

function formatDate(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString('es-ES');
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'ASSIGNED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    case 'DONE':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'CANCELLED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

function priorityBadgeClass(priority: string | null): string {
  switch (priority) {
    case 'LOW':
      return 'border-slate-600 bg-slate-800 text-slate-200';
    case 'MEDIUM':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
    case 'HIGH':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-300';
    case 'URGENT':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('');
  const [state, setState] = useState<Load<WorkOrderRow[]>>({ status: 'loading' });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted || !session) return;
    if (isTechnicianSession(session)) {
      router.replace(resolveWorkOrdersPath(session));
    }
  }, [mounted, router, session]);

  useEffect(() => {
    if (!mounted) return;
    if (!session) return;
    if (isTechnicianSession(session)) return;

    let cancelled = false;

    (async () => {
      try {
        setState({ status: 'loading' });

        const qs = new URLSearchParams();
        qs.set('pageSize', '100');

        if (statusFilter) {
          qs.set('status', statusFilter);
        }

        if (searchTerm.trim()) {
          qs.set('q', searchTerm.trim());
        }

        const url = `${paths.workOrders}?${qs.toString()}`;
        const r = await tcGet(session, url);

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
  }, [mounted, session, statusFilter, searchTerm, paths.workOrders]);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p>Cargando sesión…</p>
      </main>
    );
  }

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

  if (isTechnicianSession(session)) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p>Redirigiendo al panel técnico…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Work Orders</h1>
          <p className="mt-1 text-sm text-slate-400">
            Vista administrativa de todas las órdenes de trabajo.
          </p>
        </div>

        <Link className="underline" href="/dashboard">
          Dashboard
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_220px_auto]">
          <input
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título o descripción"
          />

          <select
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilterValue)}
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <button
            className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
            }}
          >
            Limpiar
          </button>
        </div>

        {state.status === 'ok' ? (
          <p className="mt-3 text-sm text-slate-400">
            {state.data.length} work order{state.data.length === 1 ? '' : 's'} encontrada
            {state.data.length === 1 ? '' : 's'}.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        {state.status === 'loading' ? (
          <p>Cargando…</p>
        ) : state.status === 'error' ? (
          <p>{state.error}</p>
        ) : state.data.length === 0 ? (
          <p>No hay work orders.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-300">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Site</th>
                  <th className="px-3 py-3">Técnico</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Prioridad</th>
                  <th className="px-3 py-3">Programado</th>
                  <th className="px-3 py-3">Actualizado</th>
                  <th className="px-3 py-3">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((w, index) => (
                  <tr key={w.id} className="border-b border-slate-800 align-top">
                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{w.title}</div>
                      {w.description ? (
                        <div className="mt-1 max-w-md text-xs text-slate-400">{w.description}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{w.customer?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      <div>{w.site?.name ?? '—'}</div>
                      {w.site?.address ? (
                        <div className="mt-1 text-xs text-slate-400">{w.site.address}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{w.assignedTo?.name ?? 'Sin asignar'}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          w.status,
                        )}`}
                      >
                        {formatStatus(w.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${priorityBadgeClass(
                          w.priority,
                        )}`}
                      >
                        {formatPriority(w.priority)}
                      </span>
                    </td>
                    <td className="px-3 py-3">{formatDate(w.scheduledAt)}</td>
                    <td className="px-3 py-3">{formatDate(w.updatedAt)}</td>
                    <td className="px-3 py-3">
                      <Link className="underline" href={`/work-orders/${w.id}`}>
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}