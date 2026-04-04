'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type TcSession,
  isTechnicianSession,
  readTcSession,
} from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';

type WorkOrderRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string | null;
  customer?: { id: string; name: string } | null;
  site?: { id: string; name: string; address?: string | null } | null;
  asset?: { id: string; name: string } | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
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
  v: unknown
): { id: string; name: string; address?: string | null } | null {
  if (!isRecord(v)) return null;

  const id = asStr(v.id);
  const name = asStr(v.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    address: asNullableStr(v.address),
  };
}

function parseRow(x: unknown): WorkOrderRow | null {
  if (!isRecord(x)) return null;

  const id = asStr(x.id);
  if (!id) return null;

  const priority = asNullableStr(x.priority);

  return {
    id,
    title: asStr(x.title, '—'),
    description: asNullableStr(x.description),
    status: asStr(x.status, '—'),
    priority: priority ? priority.toUpperCase() : null,
    customer: parseNamedEntity(x.customer),
    site: parseNamedEntity(x.site),
    asset: parseNamedEntity(x.asset),
    scheduledAt: asNullableStr(x.scheduledAt),
    startedAt: asNullableStr(x.startedAt),
    completedAt: asNullableStr(x.completedAt),
    updatedAt: asNullableStr(x.updatedAt),
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

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function sortDateValue(row: WorkOrderRow): number {
  const raw =
    row.updatedAt ??
    row.startedAt ??
    row.scheduledAt ??
    row.completedAt ??
    null;

  if (!raw) return 0;

  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function TechnicianDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<Load<WorkOrderRow[]>>({
    status: 'loading',
  });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted || !session) return;
    if (!isTechnicianSession(session)) {
      router.replace('/dashboard');
    }
  }, [mounted, router, session]);

  useEffect(() => {
    if (!mounted || !session || !isTechnicianSession(session)) return;

    let cancelled = false;

    (async () => {
      try {
        setState({ status: 'loading' });

        const query = new URLSearchParams({
          assignedToUserId: session.userId,
          pageSize: '100',
        });

        const r = await tcGet(session, `${paths.workOrders}?${query.toString()}`);

        if (cancelled) return;

        if (r.code < 200 || r.code >= 300) {
          setState({ status: 'error', error: `HTTP ${r.code}` });
          return;
        }

        const { items } = normalizeList<unknown>(r.json);
        const rows = items.map(parseRow).filter((x): x is WorkOrderRow => !!x);

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
  }, [mounted, session, reloadKey, paths.workOrders]);

  const stats = useMemo(() => {
    if (state.status !== 'ok') {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        done: 0,
        urgent: 0,
      };
    }

    return state.data.reduce(
      (acc, row) => {
        acc.total += 1;

        if (row.status === 'OPEN' || row.status === 'ASSIGNED') acc.open += 1;
        if (row.status === 'IN_PROGRESS') acc.inProgress += 1;
        if (row.status === 'DONE') acc.done += 1;
        if (row.priority === 'URGENT') acc.urgent += 1;

        return acc;
      },
      { total: 0, open: 0, inProgress: 0, done: 0, urgent: 0 }
    );
  }, [state]);

  const recentItems = useMemo(() => {
    if (state.status !== 'ok') return [];
    return [...state.data].sort((a, b) => sortDateValue(b) - sortDateValue(a)).slice(0, 5);
  }, [state]);

  const urgentItems = useMemo(() => {
    if (state.status !== 'ok') return [];
    return state.data
      .filter((row) => row.priority === 'URGENT' && row.status !== 'DONE')
      .sort((a, b) => sortDateValue(b) - sortDateValue(a))
      .slice(0, 5);
  }, [state]);

  if (!mounted) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p>Cargando sesión…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p className="mb-4">Sin sesión. Ve a /login.</p>
        <Link className="underline" href="/login">
          Ir a login
        </Link>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p>Redirigiendo…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard técnico</h1>
          <p className="mt-2 text-sm text-slate-400">
            Resumen de tus órdenes asignadas y accesos rápidos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            type="button"
            onClick={() => setReloadKey((x) => x + 1)}
          >
            Actualizar
          </button>

          <Link
            className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            href="/technician/dashboard/work-orders"
          >
            Ver mis work orders
          </Link>
        </div>
      </div>

      {state.status === 'error' && (
        <div className="mb-6 rounded-2xl border border-red-800 bg-red-900/20 p-4 text-red-200">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-400">Total asignadas</div>
          <div className="mt-2 text-3xl font-semibold">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-400">Abiertas / asignadas</div>
          <div className="mt-2 text-3xl font-semibold">{stats.open}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-400">En progreso</div>
          <div className="mt-2 text-3xl font-semibold">{stats.inProgress}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-400">Completadas</div>
          <div className="mt-2 text-3xl font-semibold">{stats.done}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-400">Urgentes</div>
          <div className="mt-2 text-3xl font-semibold">{stats.urgent}</div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Actividad reciente</h2>
            <Link className="text-sm underline" href="/technician/dashboard/work-orders">
              Ir a work orders
            </Link>
          </div>

          {state.status === 'loading' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              Cargando órdenes…
            </div>
          ) : recentItems.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              No tienes órdenes asignadas todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {recentItems.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium">{row.title}</h3>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                          {formatStatus(row.status)}
                        </span>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                          {formatPriority(row.priority)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        Cliente: {row.customer?.name ?? '—'} · Site: {row.site?.name ?? '—'} ·
                        Asset: {row.asset?.name ?? '—'}
                      </div>

                      {row.description ? (
                        <p className="mt-2 text-sm text-slate-300">{row.description}</p>
                      ) : null}
                    </div>

                    <div className="text-sm text-slate-400">
                      {formatDate(row.updatedAt ?? row.startedAt ?? row.scheduledAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-xl font-semibold">Urgentes pendientes</h2>

            {state.status === 'loading' ? (
              <div className="mt-4 text-sm text-slate-400">Cargando…</div>
            ) : urgentItems.length === 0 ? (
              <div className="mt-4 text-sm text-slate-400">
                No tienes work orders urgentes pendientes.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {urgentItems.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="font-medium">{row.title}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {row.site?.name ?? '—'} · {row.asset?.name ?? '—'}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {formatStatus(row.status)} · {formatDate(row.updatedAt ?? row.scheduledAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-xl font-semibold">Accesos rápidos</h2>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                className="rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"
                href="/technician/dashboard/work-orders"
              >
                Ver todas mis work orders
              </Link>

              <Link
                className="rounded-xl border border-slate-700 px-4 py-3 hover:bg-slate-800"
                href="/technician/dashboard/work-orders"
              >
                Ir a mis work orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}