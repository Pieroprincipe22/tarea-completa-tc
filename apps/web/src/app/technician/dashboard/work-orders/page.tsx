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
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'ASSIGNED':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'PENDING':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    case 'IN_PROGRESS':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'DONE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
    case 'CANCELED':
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
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        Cargando sesión...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <p className="text-sm font-semibold text-slate-500">Panel técnico</p>
        <h1 className="mt-2 text-3xl font-black">Sesión no encontrada</h1>
        <p className="mt-3 text-slate-600">
          Para ver tus órdenes de trabajo necesitas iniciar sesión como técnico.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Ir a login
        </Link>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <p className="text-sm font-semibold text-slate-500">Panel técnico</p>
        <h1 className="mt-2 text-3xl font-black">Esta vista es para técnicos</h1>
        <p className="mt-3 text-slate-600">
          Tu sesión actual no tiene rol técnico. Vuelve al panel principal.
        </p>
        <Link
          href={homePath}
          className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Volver al dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Panel técnico
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Mis órdenes de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Aquí aparecen únicamente las órdenes asignadas a tu usuario
                técnico. Primero inicia el trabajo y después rellena el parte.
              </p>
            </div>

            <Link
              href="/technician/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Volver al panel técnico
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total asignadas
            </p>
            <p className="mt-2 text-3xl font-black">{workOrders.length}</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pendientes
            </p>
            <p className="mt-2 text-3xl font-black text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              En progreso
            </p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {inProgressCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              En revisión
            </p>
            <p className="mt-2 text-3xl font-black text-purple-600">
              {reviewCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Finalizadas
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {doneCount}
            </p>
          </div>
        </section>

        {actionError ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
            {actionError}
          </section>
        ) : null}

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black">Órdenes asignadas</h2>
              <p className="mt-1 text-sm text-slate-600">
                {workOrders.length} orden
                {workOrders.length === 1 ? '' : 'es'} en tu bandeja de trabajo.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {state.status === 'loading' ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Cargando tus órdenes...
              </div>
            ) : state.status === 'error' ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                {state.error}
              </div>
            ) : workOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-lg font-bold text-slate-900">
                  No tienes órdenes asignadas.
                </p>
                <p className="mt-2 text-sm text-slate-500">
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
                      className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
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
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                {order.code}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-xl font-black text-slate-900">
                            {order.title}
                          </h3>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                            {order.description?.trim()
                              ? order.description
                              : 'Sin descripción registrada.'}
                          </p>

                          <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-400">
                                Cliente
                              </p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {displayName(order.customer)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-400">
                                Site
                              </p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {displaySite(order.site)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-400">
                                Activo
                              </p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {displayAsset(order.asset)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-400">
                                Programado
                              </p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {formatDateTime(scheduledDate)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
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
                              <span className="text-purple-600">
                                Parte enviado. Esperando revisión del admin.
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          <Link
                            href={`/technician/dashboard/work-orders/${order.id}`}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Ver detalle
                          </Link>

                          {canStart(order) ? (
                            <button
                              type="button"
                              onClick={() => void handleAction(order.id, 'start')}
                              disabled={actionLoadingId !== null}
                              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                              {actionLoadingId === order.id
                                ? 'Actualizando...'
                                : 'Iniciar'}
                            </button>
                          ) : null}

                          {canFillReport(order) ? (
                            <Link
                              href={`/technician/dashboard/work-orders/${order.id}/report`}
                              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Rellenar parte
                            </Link>
                          ) : null}

                          {canReopen(order) ? (
                            <button
                              type="button"
                              onClick={() => void handleAction(order.id, 'reopen')}
                              disabled={actionLoadingId !== null}
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
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