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
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED'
  | string;

type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;

type NamedEntity = {
  id: string;
  name: string;
  address?: string | null;
  email?: string | null;
};

type WorkOrderRow = {
  id: string;
  title: string;
  description?: string | null;
  status: WorkOrderStatus;
  priority?: WorkOrderPriority | null;
  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
  assignedTo?: NamedEntity | null;
  assignedToId?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type WorkOrderAction = 'start' | 'done' | 'reopen';

const EMPTY_WORK_ORDERS: WorkOrderRow[] = [];

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseNamedEntity(value: unknown): NamedEntity | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    address: asNullableStr(value.address),
    email: asNullableStr(value.email),
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
    title: asStr(value.title, 'Orden sin título'),
    description: asNullableStr(value.description),
    status: asStr(value.status, 'OPEN'),
    priority: asNullableStr(value.priority),
    customer: parseNamedEntity(value.customer),
    site: parseNamedEntity(value.site),
    asset: parseNamedEntity(value.asset),
    assignedTo: parseNamedEntity(value.assignedTo),
    assignedToId: asNullableStr(value.assignedToId),
    scheduledAt: asNullableStr(value.scheduledAt),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
  };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatStatus(status: WorkOrderStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Abierta';
    case 'ASSIGNED':
      return 'Asignada';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'DONE':
      return 'Finalizada';
    case 'CANCELLED':
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
      return '—';
  }
}

function statusBadgeClass(status: WorkOrderStatus): string {
  switch (status) {
    case 'OPEN':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'ASSIGNED':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'IN_PROGRESS':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'DONE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function priorityBadgeClass(priority?: WorkOrderPriority | null): string {
  switch (priority) {
    case 'LOW':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'MEDIUM':
      return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    case 'HIGH':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'URGENT':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function canStart(order: WorkOrderRow): boolean {
  return order.status === 'OPEN' || order.status === 'ASSIGNED';
}

function canMarkDone(order: WorkOrderRow): boolean {
  return order.status === 'IN_PROGRESS' || order.status === 'ASSIGNED';
}

function canReopen(order: WorkOrderRow): boolean {
  return order.status === 'DONE' || order.status === 'CANCELLED';
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

    let cancelled = false;

    async function loadWorkOrders() {
      try {
        setState({ status: 'loading' });
        setActionError(null);

        const query = new URLSearchParams();
        query.set('assignedToId', session.userId);
        query.set('pageSize', '100');

        const response = await tcGet<unknown>(
          session,
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

        setState({ status: 'ok', data: rows });
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

      const response = await tcPatch<unknown>(
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

  const doneCount = workOrders.filter((order) => order.status === 'DONE').length;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargando sesión...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Panel técnico
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Sesión no encontrada
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para ver tus órdenes de trabajo necesitas iniciar sesión como
            técnico.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Panel técnico
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Esta vista es para técnicos
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tu sesión actual no tiene rol técnico. Vuelve al panel principal.
          </p>

          <Link
            href={homePath}
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Panel técnico
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Mis órdenes de trabajo
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Aquí aparecen únicamente las órdenes asignadas a tu usuario
                técnico.
              </p>
            </div>

            <Link
              href="/technician/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver al panel técnico
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total asignadas
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {workOrders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pendientes</p>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">En progreso</p>
            <p className="mt-3 text-3xl font-bold text-blue-700">
              {inProgressCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Finalizadas</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {doneCount}
            </p>
          </div>
        </section>

        {actionError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-bold text-slate-950">
              Órdenes asignadas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {workOrders.length} orden{workOrders.length === 1 ? '' : 'es'} en
              tu bandeja de trabajo.
            </p>
          </div>

          {state.status === 'loading' ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                Cargando tus órdenes...
              </p>
            </div>
          ) : state.status === 'error' ? (
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {state.error}
              </div>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No tienes órdenes asignadas.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cuando el administrador te asigne una orden, aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {workOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">
                        {order.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {order.description?.trim()
                          ? order.description
                          : 'Sin descripción registrada.'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                        order.status,
                      )}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cliente
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {order.customer?.name ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Site
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {order.site?.name ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Activo
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {order.asset?.name ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Programado
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDateTime(order.scheduledAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityBadgeClass(
                        order.priority,
                      )}`}
                    >
                      Prioridad: {formatPriority(order.priority)}
                    </span>

                    {order.startedAt ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        Inicio: {formatDateTime(order.startedAt)}
                      </span>
                    ) : null}

                    {order.completedAt ? (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Cierre: {formatDateTime(order.completedAt)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link
                      href={`/technician/dashboard/work-orders/${order.id}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver detalle
                    </Link>

                    {canStart(order) ? (
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => void handleAction(order.id, 'start')}
                        className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {actionLoadingId === order.id
                          ? 'Actualizando...'
                          : 'Iniciar'}
                      </button>
                    ) : null}

                    {canMarkDone(order) ? (
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => void handleAction(order.id, 'done')}
                        className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {actionLoadingId === order.id
                          ? 'Actualizando...'
                          : 'Marcar finalizada'}
                      </button>
                    ) : null}

                    {canReopen(order) ? (
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => void handleAction(order.id, 'reopen')}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        {actionLoadingId === order.id
                          ? 'Actualizando...'
                          : 'Reabrir'}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}