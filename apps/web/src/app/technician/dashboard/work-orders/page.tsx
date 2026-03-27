'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type TcSession,
  isTechnicianSession,
  readTcSession,
  resolveHomePath,
} from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPatch,
} from '@/lib/tc/api';

const STATUS_OPTIONS = ['', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
type StatusFilterValue = (typeof STATUS_OPTIONS)[number];
type ActionStatusValue = 'OPEN' | 'IN_PROGRESS' | 'DONE';

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

type ActionMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | null;

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function parseNamedEntity(
  v: unknown,
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
  return d.toLocaleString('es-ES');
}

function getApiError(json: unknown, code: number): string {
  if (isRecord(json)) {
    const message = json.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const joined = message.filter((x): x is string => typeof x === 'string').join(', ');
      if (joined) return joined;
    }

    const error = json.error;
    if (typeof error === 'string' && error.trim()) {
      return `${error} (HTTP ${code})`;
    }
  }

  return `HTTP ${code}`;
}

export default function TechnicianWorkOrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const dashboardHref = useMemo(() => resolveHomePath(session), [session]);

  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('');
  const [reloadKey, setReloadKey] = useState(0);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage>(null);
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
      router.replace(resolveHomePath(session));
    }
  }, [mounted, router, session, dashboardHref]);

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

        if (statusFilter) {
          query.set('status', statusFilter);
        }

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
  }, [mounted, session, statusFilter, reloadKey, paths.workOrders]);

  async function changeStatus(id: string, status: ActionStatusValue) {
    if (!session) return;

    try {
      setActingId(id);
      setActionMessage(null);

      const r = await tcPatch(session, `${paths.workOrders}/${id}/status`, { status });

      if (r.code < 200 || r.code >= 300) {
        setActionMessage({
          type: 'error',
          text: getApiError(r.json, r.code),
        });
        return;
      }

      setActionMessage({
        type: 'success',
        text: `Estado actualizado a ${status}.`,
      });

      setReloadKey((x) => x + 1);
    } catch (e) {
      setActionMessage({
        type: 'error',
        text: errMsg(e),
      });
    } finally {
      setActingId(null);
    }
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p>Cargando sesión…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="mb-4">Sin sesión. Ve a /login.</p>
        <Link className="underline" href="/login">
          Ir a login
        </Link>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p>Redirigiendo…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">My Work Orders</h1>
          <p className="mt-1 text-sm text-slate-400">
            Solo se muestran las órdenes asignadas a tu usuario.
          </p>
        </div>

        <div className="flex gap-3">
          <Link className="underline" href={dashboardHref}>
            Dashboard técnico
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">Filtro status:</label>

          <select
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
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
              setStatusFilter('');
              setActionMessage(null);
            }}
          >
            Limpiar
          </button>

          <button
            className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            type="button"
            onClick={() => setReloadKey((x) => x + 1)}
          >
            Actualizar
          </button>
        </div>
      </div>

      {actionMessage ? (
        <div
          className={`mb-6 rounded-2xl border p-4 ${
            actionMessage.type === 'success'
              ? 'border-emerald-800 bg-emerald-900/20 text-emerald-200'
              : 'border-red-800 bg-red-900/20 text-red-200'
          }`}
        >
          {actionMessage.text}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          Cargando…
        </div>
      ) : state.status === 'error' ? (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-4 text-red-200">
          {state.error}
        </div>
      ) : state.data.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          No tienes work orders asignadas.
        </div>
      ) : (
        <div className="space-y-4">
          {state.data.map((w) => {
            const disabled = actingId === w.id;

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{w.title}</h2>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                        {formatStatus(w.status)}
                      </span>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                        {formatPriority(w.priority)}
                      </span>
                    </div>

                    {w.description ? (
                      <p className="max-w-3xl text-slate-300">{w.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/work-orders/${w.id}`}
                      className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
                    >
                      Abrir
                    </Link>

                    {(w.status === 'OPEN' || w.status === 'ASSIGNED') && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => changeStatus(w.id, 'IN_PROGRESS')}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                      >
                        {disabled ? 'Actualizando…' : 'Iniciar'}
                      </button>
                    )}

                    {w.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => changeStatus(w.id, 'DONE')}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
                      >
                        {disabled ? 'Actualizando…' : 'Marcar done'}
                      </button>
                    )}

                    {w.status === 'DONE' && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => changeStatus(w.id, 'OPEN')}
                        className="rounded-xl border border-slate-700 px-4 py-2 disabled:opacity-60"
                      >
                        {disabled ? 'Actualizando…' : 'Reabrir'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Cliente</div>
                    <div className="mt-1">{w.customer?.name ?? '—'}</div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Site</div>
                    <div className="mt-1">{w.site?.name ?? '—'}</div>
                    {w.site?.address ? (
                      <div className="mt-1 text-sm text-slate-400">{w.site.address}</div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Asset</div>
                    <div className="mt-1">{w.asset?.name ?? '—'}</div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Fechas</div>
                    <div className="mt-1 text-sm text-slate-300">
                      <div>Programada: {formatDate(w.scheduledAt)}</div>
                      <div>Inicio: {formatDate(w.startedAt)}</div>
                      <div>Fin: {formatDate(w.completedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}