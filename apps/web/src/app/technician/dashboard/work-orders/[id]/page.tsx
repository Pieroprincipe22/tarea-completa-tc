'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
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

type WorkOrderDetail = {
  id: string;
  code?: string | null;
  title: string;
  description?: string | null;
  status: WorkOrderStatus;
  priority?: WorkOrderPriority | null;

  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
  createdBy?: NamedEntity | null;
  assignedTo?: NamedEntity | null;
  assignedTechnician?: NamedEntity | null;

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

type WorkOrderAction = 'start' | 'done' | 'reopen';

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

function parseWorkOrder(value: unknown): WorkOrderDetail {
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
    createdBy: parseNamedEntity(value.createdBy),
    assignedTo: parseNamedEntity(value.assignedTo),
    assignedTechnician: parseNamedEntity(value.assignedTechnician),

    scheduledAt: asNullableStr(value.scheduledAt),
    scheduledFor: asNullableStr(value.scheduledFor),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
  };
}

function unwrapWorkOrderResponse(json: unknown): WorkOrderDetail {
  if (isRecord(json)) {
    if (isRecord(json.item)) return parseWorkOrder(json.item);
    if (isRecord(json.data)) return parseWorkOrder(json.data);
    if (isRecord(json.workOrder)) return parseWorkOrder(json.workOrder);
  }

  return parseWorkOrder(json);
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

function canStart(order: WorkOrderDetail): boolean {
  return order.status === 'OPEN' || order.status === 'ASSIGNED';
}

function canMarkDone(order: WorkOrderDetail): boolean {
  return order.status === 'IN_PROGRESS' || order.status === 'ASSIGNED';
}

function canReopen(order: WorkOrderDetail): boolean {
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

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-slate-950">
        {value?.trim() ? value : '—'}
      </p>
    </div>
  );
}

export default function TechnicianWorkOrderDetailPage() {
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<Load<WorkOrderDetail>>({
    status: 'loading',
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<WorkOrderAction | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const workOrderId = useMemo(() => {
    const rawId = params?.id;

    if (Array.isArray(rawId)) {
      return rawId[0] ?? '';
    }

    return typeof rawId === 'string' ? rawId : '';
  }, [params]);

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

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

    if (!workOrderId) {
      setState({
        status: 'error',
        error: 'No se encontró el ID de la orden.',
      });
      return;
    }

    let cancelled = false;

    async function loadWorkOrder() {
      try {
        setState({ status: 'loading' });
        setActionError(null);

        const response = await tcGet(
          session,
          `${paths.workOrders}/${workOrderId}`,
        );

        if (cancelled) return;

        if (response.code === 404) {
          setState({
            status: 'error',
            error: 'No se encontró esta orden de trabajo.',
          });
          return;
        }

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudo cargar el detalle de la orden. HTTP ${response.code}`,
          });
          return;
        }

        const order = unwrapWorkOrderResponse(response.json);

        if (!order.id) {
          setState({
            status: 'error',
            error: 'La respuesta del servidor no contiene una orden válida.',
          });
          return;
        }

        setState({
          status: 'ok',
          data: order,
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

    void loadWorkOrder();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.workOrders, refreshKey, session, workOrderId]);

  async function handleAction(action: WorkOrderAction) {
    if (!session) {
      setActionError('Sesión no encontrada.');
      return;
    }

    if (!workOrderId) {
      setActionError('No se encontró el ID de la orden.');
      return;
    }

    try {
      setActionLoading(action);
      setActionError(null);

      const response = await tcPatch(
        session,
        `${paths.workOrders}/${workOrderId}/${action}`,
      );

      if (response.code < 200 || response.code >= 300) {
        setActionError(`No se pudo actualizar la orden. HTTP ${response.code}`);
        return;
      }

      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(`No se pudo actualizar la orden: ${errMsg(error)}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          Cargando sesión...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Panel técnico</p>
          <h1 className="mt-2 text-2xl font-bold">Sesión no encontrada</h1>
          <p className="mt-3 text-slate-600">
            Para ver el detalle de la orden necesitas iniciar sesión como
            técnico.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  if (!isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Panel técnico</p>
          <h1 className="mt-2 text-2xl font-bold">
            Esta vista es para técnicos
          </h1>
          <p className="mt-3 text-slate-600">
            Tu sesión actual no tiene rol técnico.
          </p>
          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  const order = state.status === 'ok' ? state.data : null;

  const customerName = displayName(order?.customer);
  const siteName = displaySite(order?.site);
  const assetName = displayAsset(order?.asset);
  const assignedName =
    displayName(order?.assignedTo) !== '—'
      ? displayName(order?.assignedTo)
      : displayName(order?.assignedTechnician);
  const createdByName = displayName(order?.createdBy);
  const scheduledDate = order?.scheduledFor ?? order?.scheduledAt;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Panel técnico
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Detalle de orden
            </h1>
          </div>

          <Link
            href="/technician/dashboard/work-orders"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Volver a órdenes
          </Link>
        </div>

        {state.status === 'loading' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            Cargando detalle de la orden...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
            {state.error}
          </section>
        ) : order ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {order.code ? `Código: ${order.code}` : 'Orden de trabajo'}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{order.title}</h2>
                <p className="mt-3 max-w-3xl whitespace-pre-line text-base leading-7 text-slate-700">
                  {order.description?.trim()
                    ? order.description
                    : 'Sin descripción registrada.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${statusBadgeClass(
                    order.status,
                  )}`}
                >
                  {formatStatus(order.status)}
                </span>

                <span
                  className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold ${priorityBadgeClass(
                    order.priority,
                  )}`}
                >
                  Prioridad: {formatPriority(order.priority)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Cliente" value={customerName} />
              <DetailItem label="Ubicación / site" value={siteName} />
              <DetailItem label="Activo / máquina" value={assetName} />
              <DetailItem label="Técnico asignado" value={assignedName} />
              <DetailItem label="Creado por" value={createdByName} />
              <DetailItem
                label="Programado"
                value={formatDateTime(scheduledDate)}
              />
              <DetailItem
                label="Inicio"
                value={formatDateTime(order.startedAt)}
              />
              <DetailItem
                label="Finalización"
                value={formatDateTime(order.completedAt)}
              />
              <DetailItem
                label="Última actualización"
                value={formatDateTime(order.updatedAt)}
              />
            </div>

            {actionError ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                {actionError}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              {canStart(order) ? (
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => void handleAction('start')}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {actionLoading === 'start' ? 'Actualizando...' : 'Iniciar'}
                </button>
              ) : null}

              {canMarkDone(order) ? (
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => void handleAction('done')}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {actionLoading === 'done'
                    ? 'Actualizando...'
                    : 'Marcar finalizada'}
                </button>
              ) : null}

              {canReopen(order) ? (
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => void handleAction('reopen')}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {actionLoading === 'reopen'
                    ? 'Actualizando...'
                    : 'Reabrir'}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}