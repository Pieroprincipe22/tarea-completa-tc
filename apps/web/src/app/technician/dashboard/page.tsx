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
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'ASSIGNED':
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'PENDING':
      return 'border-special/30 bg-special-soft text-special';
    case 'IN_PROGRESS':
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'DONE':
      return 'border-success/30 bg-success-soft text-success';
    case 'CANCELLED':
    case 'CANCELED':
      return 'border-danger/30 bg-danger-soft text-danger';
    default:
      return 'border-line bg-surface-3 text-ink';
  }
}

function priorityBadgeClass(priority: WorkOrderPriority | null): string {
  switch (priority) {
    case 'URGENT':
      return 'border-danger/30 bg-danger-soft text-danger';
    case 'HIGH':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'MEDIUM':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'LOW':
      return 'border-line bg-surface-3 text-ink-2';
    default:
      return 'border-line bg-surface-3 text-ink-2';
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
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        Cargando sesión…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        <section className="mx-auto max-w-5xl rounded-xl border border-danger/30 bg-danger-soft p-6 text-danger">
          <h1 className="text-2xl font-semibold">Sin sesión</h1>
          <p className="mt-2 text-sm">Ve a login para entrar otra vez.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover"
          >
            Ir a login
          </Link>
        </section>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        Redirigiendo…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-2 p-4 text-ink md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">
                Panel técnico
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Dashboard técnico
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Resumen de tus órdenes asignadas y accesos rápidos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3"
              >
                Actualizar
              </button>

              <Link
                href="/technician/dashboard/work-orders"
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3"
              >
                Ver mis work orders
              </Link>
            </div>
          </div>
        </header>

        {state.status === 'error' ? (
          <section className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-sm font-semibold text-danger">
            {state.error}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Total asignadas
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.total}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Abiertas / asignadas
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.open}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              En progreso
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.inProgress}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              En revisión
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.review}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Completadas
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.done}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Urgentes
            </p>
            <p className="mt-3 text-3xl font-semibold">{stats.urgent}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-line bg-surface p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Actividad reciente</h2>
                <p className="mt-1 text-sm text-muted">
                  Últimas órdenes actualizadas.
                </p>
              </div>

              <Link
                href="/technician/dashboard/work-orders"
                className="text-sm font-bold text-accent hover:text-accent"
              >
                Ir a work orders
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {state.status === 'loading' ? (
                <div className="rounded-lg border border-line bg-surface-2 p-5 text-sm text-muted">
                  Cargando órdenes…
                </div>
              ) : recentItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-5 text-sm text-subtle">
                  No tienes órdenes asignadas todavía.
                </div>
              ) : (
                recentItems.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-lg border border-line bg-surface-2 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{row.title}</h3>

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
                        className="inline-flex items-center justify-center rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-surface-3"
                      >
                        Ver detalle
                      </Link>
                    </div>

                    <p className="mt-3 text-sm text-muted">
                      Cliente: {displayName(row.customer)} · Site:{' '}
                      {displayName(row.site)} · Asset: {displayName(row.asset)}
                    </p>

                    {row.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-subtle">
                        {row.description}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs font-semibold text-subtle">
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

          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="text-xl font-semibold">Urgentes pendientes</h2>
            <p className="mt-1 text-sm text-muted">
              Órdenes urgentes que todavía requieren atención.
            </p>

            <div className="mt-5 space-y-3">
              {state.status === 'loading' ? (
                <div className="rounded-lg border border-line bg-surface-2 p-5 text-sm text-muted">
                  Cargando…
                </div>
              ) : urgentItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-5 text-sm text-subtle">
                  No tienes work orders urgentes pendientes.
                </div>
              ) : (
                urgentItems.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-lg border border-danger/30 bg-danger-soft p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-ink">{row.title}</h3>
                        <p className="mt-1 text-sm text-danger">
                          {displayName(row.site)} · {displayName(row.asset)}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-danger">
                          {formatStatus(row.status)} ·{' '}
                          {formatDate(row.updatedAt ?? row.scheduledFor)}
                        </p>
                      </div>

                      <Link
                        href={`/technician/dashboard/work-orders/${row.id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-danger px-3 py-2 text-xs font-bold text-white hover:bg-danger/90"
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

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold">Accesos rápidos</h2>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/technician/dashboard/work-orders"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Ver todas mis work orders
            </Link>

            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="inline-flex items-center justify-center rounded-lg border border-line px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-3"
            >
              Actualizar dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}