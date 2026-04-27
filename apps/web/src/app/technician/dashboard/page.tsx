'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';
import {
  isTechnicianSession,
  readTcSession,
  type TcSession,
} from '@/lib/tc/session';

type WorkOrderStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED'
  | 'CANCELED'
  | string;

type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;

type NamedEntity = {
  id?: string;
  name?: string | null;
  address?: string | null;
  code?: string | null;
  serialNumber?: string | null;
  location?: string | null;
};

type WorkOrderRow = {
  id: string;
  code?: string | null;
  title: string;
  description?: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority | null;
  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
  scheduledAt?: string | null;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

const EMPTY_WORK_ORDERS: WorkOrderRow[] = [];

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseNamedEntity(value: unknown): NamedEntity | null {
  if (!isRecord(value)) return null;

  const id = asNullableStr(value.id);
  const name = asNullableStr(value.name);
  const address = asNullableStr(value.address);
  const code = asNullableStr(value.code);
  const serialNumber = asNullableStr(value.serialNumber);
  const location = asNullableStr(value.location);

  if (!id && !name && !address && !code && !serialNumber && !location) {
    return null;
  }

  return {
    id: id ?? undefined,
    name,
    address,
    code,
    serialNumber,
    location,
  };
}

function parseRow(value: unknown): WorkOrderRow | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);

  if (!id) return null;

  const priority = asNullableStr(value.priority);

  return {
    id,
    code: asNullableStr(value.code),
    title: asStr(value.title, 'Orden sin título'),
    description: asNullableStr(value.description),
    status: asStr(value.status, 'OPEN'),
    priority: priority ? priority.toUpperCase() : null,
    customer: parseNamedEntity(value.customer),
    site: parseNamedEntity(value.site),
    asset: parseNamedEntity(value.asset),
    scheduledAt: asNullableStr(value.scheduledAt),
    scheduledFor: asNullableStr(value.scheduledFor),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    updatedAt: asNullableStr(value.updatedAt),
  };
}

function formatStatus(status: WorkOrderStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Abierta';
    case 'ASSIGNED':
      return 'Asignada';
    case 'PENDING':
      return 'Pendiente de revisión';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'DONE':
      return 'Finalizada';
    case 'CANCELLED':
    case 'CANCELED':
      return 'Cancelada';
    default:
      return status || '—';
  }
}

function formatPriority(priority: WorkOrderPriority | null): string {
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sortDateValue(row: WorkOrderRow): number {
  const raw =
    row.updatedAt ??
    row.startedAt ??
    row.scheduledFor ??
    row.scheduledAt ??
    row.completedAt ??
    null;

  if (!raw) return 0;

  const time = new Date(raw).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function statusBadgeClass(status: WorkOrderStatus): string {
  switch (status) {
    case 'OPEN':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'ASSIGNED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'PENDING':
      return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    case 'DONE':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'CANCELLED':
    case 'CANCELED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

function priorityBadgeClass(priority: WorkOrderPriority | null): string {
  switch (priority) {
    case 'URGENT':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'HIGH':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-300';
    case 'MEDIUM':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
    case 'LOW':
      return 'border-slate-700 bg-slate-800 text-slate-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-300';
  }
}

function displayName(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  return (
    entity.name?.trim() ||
    entity.code?.trim() ||
    entity.serialNumber?.trim() ||
    entity.address?.trim() ||
    entity.location?.trim() ||
    '—'
  );
}

export default function TechnicianDashboardPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<Load<WorkOrderRow[]>>({
    status: 'loading',
  });

  const paths = useMemo(() => resolveCorePaths(session), [session]);

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

    const activeSession = session;
    const activePaths = resolveCorePaths(activeSession);

    let cancelled = false;

    async function loadWorkOrders() {
      try {
        setState({ status: 'loading' });

        const query = new URLSearchParams({
          assignedToId: activeSession.userId,
          pageSize: '100',
        });

        const response = await tcGet(
          activeSession,
          `${activePaths.workOrders}?${query.toString()}`,
        );

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `HTTP ${response.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items
          .map(parseRow)
          .filter((row): row is WorkOrderRow => !!row);

        setState({
          status: 'ok',
          data: rows,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadWorkOrders();

    return () => {
      cancelled = true;
    };
  }, [mounted, session, reloadKey]);

  const workOrders = state.status === 'ok' ? state.data : EMPTY_WORK_ORDERS;

  const stats = useMemo(() => {
    return workOrders.reduce(
      (acc, row) => {
        acc.total += 1;

        if (row.status === 'OPEN' || row.status === 'ASSIGNED') {
          acc.open += 1;
        }

        if (row.status === 'IN_PROGRESS') {
          acc.inProgress += 1;
        }

        if (row.status === 'PENDING') {
          acc.review += 1;
        }

        if (row.status === 'DONE') {
          acc.done += 1;
        }

        if (row.priority === 'URGENT') {
          acc.urgent += 1;
        }

        return acc;
      },
      {
        total: 0,
        open: 0,
        inProgress: 0,
        review: 0,
        done: 0,
        urgent: 0,
      },
    );
  }, [workOrders]);

  const recentItems = useMemo(() => {
    return [...workOrders]
      .sort((a, b) => sortDateValue(b) - sortDateValue(a))
      .slice(0, 5);
  }, [workOrders]);

  const urgentItems = useMemo(() => {
    return workOrders
      .filter(
        (row) =>
          row.priority === 'URGENT' &&
          row.status !== 'DONE' &&
          row.status !== 'CANCELLED' &&
          row.status !== 'CANCELED',
      )
      .sort((a, b) => sortDateValue(b) - sortDateValue(a))
      .slice(0, 5);
  }, [workOrders]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Cargando sesión…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black">Sin sesión</h1>
          <p className="mt-2 text-sm">Ve a login para entrar otra vez.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
          >
            Ir a login
          </Link>
        </section>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Redirigiendo…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Panel técnico
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Dashboard técnico
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Resumen de tus órdenes asignadas y accesos rápidos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Actualizar
              </button>

              <Link
                href="/technician/dashboard/work-orders"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Ver mis work orders
              </Link>
            </div>
          </div>
        </header>

        {state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm font-semibold text-rose-200">
            {state.error}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total asignadas
            </p>
            <p className="mt-3 text-3xl font-black">{stats.total}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Abiertas / asignadas
            </p>
            <p className="mt-3 text-3xl font-black">{stats.open}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              En progreso
            </p>
            <p className="mt-3 text-3xl font-black">{stats.inProgress}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              En revisión
            </p>
            <p className="mt-3 text-3xl font-black">{stats.review}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Completadas
            </p>
            <p className="mt-3 text-3xl font-black">{stats.done}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Urgentes
            </p>
            <p className="mt-3 text-3xl font-black">{stats.urgent}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Actividad reciente</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Últimas órdenes actualizadas.
                </p>
              </div>

              <Link
                href="/technician/dashboard/work-orders"
                className="text-sm font-bold text-sky-300 hover:text-sky-200"
              >
                Ir a work orders
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {state.status === 'loading' ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                  Cargando órdenes…
                </div>
              ) : recentItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                  No tienes órdenes asignadas todavía.
                </div>
              ) : (
                recentItems.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black text-white">{row.title}</h3>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(
                              row.status,
                            )}`}
                          >
                            {formatStatus(row.status)}
                          </span>

                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${priorityBadgeClass(
                              row.priority,
                            )}`}
                          >
                            {formatPriority(row.priority)}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/technician/dashboard/work-orders/${row.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
                      >
                        Ver detalle
                      </Link>
                    </div>

                    <p className="mt-3 text-sm text-slate-400">
                      Cliente: {displayName(row.customer)} · Site:{' '}
                      {displayName(row.site)} · Asset: {displayName(row.asset)}
                    </p>

                    {row.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {row.description}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Última actualización:{' '}
                      {formatDate(
                        row.updatedAt ?? row.startedAt ?? row.scheduledFor,
                      )}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <h2 className="text-xl font-black">Urgentes pendientes</h2>
            <p className="mt-1 text-sm text-slate-400">
              Órdenes urgentes que todavía requieren atención.
            </p>

            <div className="mt-5 space-y-3">
              {state.status === 'loading' ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                  Cargando…
                </div>
              ) : urgentItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                  No tienes work orders urgentes pendientes.
                </div>
              ) : (
                urgentItems.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-black text-white">{row.title}</h3>
                        <p className="mt-1 text-sm text-rose-100">
                          {displayName(row.site)} · {displayName(row.asset)}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-rose-200">
                          {formatStatus(row.status)} ·{' '}
                          {formatDate(row.updatedAt ?? row.scheduledFor)}
                        </p>
                      </div>

                      <Link
                        href={`/technician/dashboard/work-orders/${row.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-xl font-black">Accesos rápidos</h2>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/technician/dashboard/work-orders"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
            >
              Ver todas mis work orders
            </Link>

            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
            >
              Actualizar dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}