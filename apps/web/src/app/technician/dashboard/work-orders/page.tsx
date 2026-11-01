'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPatch,
} from '@/lib/tc/api';
import {
  isTechnicianSession,
  readTcSession,
  resolveHomePath,
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
  email?: string | null;
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
  priority?: WorkOrderPriority | null;
  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
  assignedTo?: NamedEntity | null;
  assignedTechnician?: NamedEntity | null;
  assignedToId?: string | null;
  assignedTechnicianId?: string | null;
  scheduledAt?: string | null;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type WorkOrderAction = 'start' | 'reopen';

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
  const email = asNullableStr(value.email);
  const code = asNullableStr(value.code);
  const serialNumber = asNullableStr(value.serialNumber);
  const location = asNullableStr(value.location);

  if (!id && !name && !address && !email && !code && !serialNumber && !location) {
    return null;
  }

  return {
    id: id ?? undefined,
    name,
    address,
    email,
    code,
    serialNumber,
    location,
  };
}

function parseWorkOrder(value: unknown): WorkOrderRow {
  if (!isRecord(value)) {
    return {
      id: '',
      title: 'Orden sin título',
      status: 'OPEN',
      priority: 'MEDIUM',
    };
  }

  return {
    id: asStr(value.id),
    code: asNullableStr(value.code),
    title: asStr(value.title, 'Orden sin título'),
    description: asNullableStr(value.description),
    status: asStr(value.status, 'OPEN'),
    priority: asNullableStr(value.priority),
    customer: parseNamedEntity(value.customer),
    site: parseNamedEntity(value.site),
    asset: parseNamedEntity(value.asset),
    assignedTo: parseNamedEntity(value.assignedTo),
    assignedTechnician: parseNamedEntity(value.assignedTechnician),
    assignedToId: asNullableStr(value.assignedToId),
    assignedTechnicianId: asNullableStr(value.assignedTechnicianId),
    scheduledAt: asNullableStr(value.scheduledAt),
    scheduledFor: asNullableStr(value.scheduledFor),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
  };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStatus(status?: WorkOrderStatus | null): string {
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

function formatPriority(priority?: WorkOrderPriority | null): string {
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
      return priority || '—';
  }
}

function statusBadgeClass(status?: WorkOrderStatus | null): string {
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
      return 'border-line bg-surface-2 text-muted';
  }
}

function priorityBadgeClass(priority?: WorkOrderPriority | null): string {
  switch (priority) {
    case 'LOW':
      return 'border-line bg-surface-2 text-muted';
    case 'MEDIUM':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'HIGH':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'URGENT':
      return 'border-danger/30 bg-danger-soft text-danger';
    default:
      return 'border-line bg-surface-2 text-muted';
  }
}

function canStart(order: WorkOrderRow): boolean {
  return order.status === 'OPEN' || order.status === 'ASSIGNED';
}

function canFillReport(order: WorkOrderRow): boolean {
  return order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS';
}

function canReopen(order: WorkOrderRow): boolean {
  return (
    order.status === 'DONE' ||
    order.status === 'CANCELLED' ||
    order.status === 'CANCELED'
  );
}

function displayName(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  return (
    entity.name?.trim() ||
    entity.code?.trim() ||
    entity.serialNumber?.trim() ||
    entity.email?.trim() ||
    entity.address?.trim() ||
    entity.location?.trim() ||
    '—'
  );
}

function displaySite(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  const name = entity.name?.trim();
  const address = entity.address?.trim();

  if (name && address) return `${name} · ${address}`;
  if (name) return name;
  if (address) return address;

  return '—';
}

function displayAsset(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  const name = entity.name?.trim();
  const code = entity.code?.trim();
  const serialNumber = entity.serialNumber?.trim();
  const location = entity.location?.trim();

  const main = name || code || serialNumber;

  if (main && location) return `${main} · ${location}`;
  if (main) return main;
  if (location) return location;

  return '—';
}

export default function TechnicianWorkOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

  const [state, setState] = useState<Load<WorkOrderRow[]>>({
    status: 'loading',
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({
        status: 'error',
        error: 'Sesión no encontrada. Inicia sesión como técnico.',
      });
      return;
    }

    const activeSession = session;

    let cancelled = false;

    async function loadWorkOrders() {
      try {
        setState({ status: 'loading' });
        setActionError(null);

        const query = new URLSearchParams();

        query.set('assignedToId', activeSession.userId);
        query.set('pageSize', '100');

        const response = await tcGet(
          activeSession,
          `${paths.workOrders}?${query.toString()}`,
        );

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudieron cargar tus órdenes. HTTP ${response.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items.map(parseWorkOrder).filter((order) => order.id);

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
  }, [mounted, paths.workOrders, refreshKey, session]);

  async function handleAction(orderId: string, action: WorkOrderAction) {
    if (!session) {
      setActionError('Sesión no encontrada.');
      return;
    }

    try {
      setActionLoadingId(orderId);
      setActionError(null);

      const response = await tcPatch(
        session,
        `${paths.workOrders}/${orderId}/${action}`,
      );

      if (response.code < 200 || response.code >= 300) {
        setActionError(`No se pudo actualizar la orden. HTTP ${response.code}`);
        return;
      }

      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(`No se pudo actualizar la orden: ${errMsg(error)}`);
    } finally {
      setActionLoadingId(null);
    }
  }

  const workOrders = state.status === 'ok' ? state.data : EMPTY_WORK_ORDERS;

  const pendingCount = workOrders.filter(
    (order) => order.status === 'OPEN' || order.status === 'ASSIGNED',
  ).length;

  const inProgressCount = workOrders.filter(
    (order) => order.status === 'IN_PROGRESS',
  ).length;

  const reviewCount = workOrders.filter(
    (order) => order.status === 'PENDING',
  ).length;

  const doneCount = workOrders.filter((order) => order.status === 'DONE').length;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        Cargando sesión...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        <p className="text-sm font-semibold text-muted">Panel técnico</p>
        <h1 className="mt-2 text-3xl font-semibold">Sesión no encontrada</h1>
        <p className="mt-3 text-muted">
          Para ver tus órdenes de trabajo necesitas iniciar sesión como técnico.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover"
        >
          Ir a login
        </Link>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        <p className="text-sm font-semibold text-muted">Panel técnico</p>
        <h1 className="mt-2 text-3xl font-semibold">Esta vista es para técnicos</h1>
        <p className="mt-3 text-muted">
          Tu sesión actual no tiene rol técnico. Vuelve al panel principal.
        </p>
        <Link
          href={homePath}
          className="mt-6 inline-flex rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover"
        >
          Volver al dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-2 p-4 text-ink md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">
                Panel técnico
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Mis órdenes de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Aquí aparecen únicamente las órdenes asignadas a tu usuario
                técnico. Primero inicia el trabajo y después rellena el parte.
              </p>
            </div>

            <Link
              href="/technician/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-ink-2 hover:bg-surface-2"
            >
              Volver al panel técnico
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Total asignadas
            </p>
            <p className="mt-2 text-3xl font-semibold">{workOrders.length}</p>
          </div>

          <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Pendientes
            </p>
            <p className="mt-2 text-3xl font-semibold text-warning">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              En progreso
            </p>
            <p className="mt-2 text-3xl font-semibold text-accent">
              {inProgressCount}
            </p>
          </div>

          <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              En revisión
            </p>
            <p className="mt-2 text-3xl font-semibold text-special">
              {reviewCount}
            </p>
          </div>

          <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-wide text-subtle">
              Finalizadas
            </p>
            <p className="mt-2 text-3xl font-semibold text-success">
              {doneCount}
            </p>
          </div>
        </section>

        {actionError ? (
          <section className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-sm font-semibold text-danger">
            {actionError}
          </section>
        ) : null}

        <section className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Órdenes asignadas</h2>
              <p className="mt-1 text-sm text-muted">
                {workOrders.length} orden
                {workOrders.length === 1 ? '' : 'es'} en tu bandeja de trabajo.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {state.status === 'loading' ? (
              <div className="rounded-lg border border-line bg-surface-2 p-6 text-sm text-muted">
                Cargando tus órdenes...
              </div>
            ) : state.status === 'error' ? (
              <div className="rounded-lg border border-danger/30 bg-danger-soft p-6 text-sm text-danger">
                {state.error}
              </div>
            ) : workOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-8 text-center">
                <p className="text-lg font-bold text-ink">
                  No tienes órdenes asignadas.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Cuando el administrador te asigne una orden, aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {workOrders.map((order) => {
                  const scheduledDate = order.scheduledFor ?? order.scheduledAt;

                  return (
                    <article
                      key={order.id}
                      className="rounded-xl border border-line bg-surface p-5 transition hover:border-accent/30 hover:shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(
                                order.status,
                              )}`}
                            >
                              {formatStatus(order.status)}
                            </span>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${priorityBadgeClass(
                                order.priority,
                              )}`}
                            >
                              Prioridad: {formatPriority(order.priority)}
                            </span>

                            {order.code ? (
                              <span className="inline-flex rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold text-muted">
                                {order.code}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-xl font-semibold text-ink">
                            {order.title}
                          </h3>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                            {order.description?.trim()
                              ? order.description
                              : 'Sin descripción registrada.'}
                          </p>

                          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                            <div>
                              <p className="text-xs font-bold uppercase text-subtle">
                                Cliente
                              </p>
                              <p className="mt-1 font-semibold text-ink-2">
                                {displayName(order.customer)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-subtle">
                                Site
                              </p>
                              <p className="mt-1 font-semibold text-ink-2">
                                {displaySite(order.site)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-subtle">
                                Activo
                              </p>
                              <p className="mt-1 font-semibold text-ink-2">
                                {displayAsset(order.asset)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-subtle">
                                Programado
                              </p>
                              <p className="mt-1 font-semibold text-ink-2">
                                {formatDateTime(scheduledDate)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted">
                            {order.startedAt ? (
                              <span>
                                Inicio: {formatDateTime(order.startedAt)}
                              </span>
                            ) : null}

                            {order.completedAt ? (
                              <span>
                                Cierre: {formatDateTime(order.completedAt)}
                              </span>
                            ) : null}

                            {order.status === 'PENDING' ? (
                              <span className="text-special">
                                Parte enviado. Esperando revisión del admin.
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          <Link
                            href={`/technician/dashboard/work-orders/${order.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
                          >
                            Ver detalle
                          </Link>

                          {canStart(order) ? (
                            <button
                              type="button"
                              onClick={() => void handleAction(order.id, 'start')}
                              disabled={actionLoadingId !== null}
                              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent-hover"
                            >
                              {actionLoadingId === order.id
                                ? 'Actualizando...'
                                : 'Iniciar'}
                            </button>
                          ) : null}

                          {canFillReport(order) ? (
                            <Link
                              href={`/technician/dashboard/work-orders/${order.id}/report`}
                              className="inline-flex items-center justify-center rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition hover:bg-success/90"
                            >
                              Rellenar parte
                            </Link>
                          ) : null}

                          {canReopen(order) ? (
                            <button
                              type="button"
                              onClick={() => void handleAction(order.id, 'reopen')}
                              disabled={actionLoadingId !== null}
                              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:bg-surface-2"
                            >
                              {actionLoadingId === order.id
                                ? 'Actualizando...'
                                : 'Reabrir'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}