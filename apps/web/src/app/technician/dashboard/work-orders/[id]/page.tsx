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

type WorkOrderAction = 'start' | 'reopen';

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

function canStart(order: WorkOrderDetail): boolean {
  return order.status === 'OPEN' || order.status === 'ASSIGNED';
}

function canFillReport(order: WorkOrderDetail): boolean {
  return order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS';
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">
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
          Para ver el detalle de la orden necesitas iniciar sesión como técnico.
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
          Tu sesión actual no tiene rol técnico.
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
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Panel técnico
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Detalle de orden
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Revisa la información de la orden, inicia el trabajo y rellena
                el parte antes de enviarlo al administrador.
              </p>
            </div>

            <Link
              href="/technician/dashboard/work-orders"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Volver a órdenes
            </Link>
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            Cargando detalle de la orden...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {state.error}
          </section>
        ) : order ? (
          <>
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    {order.code ? `Código: ${order.code}` : 'Orden de trabajo'}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {order.title}
                  </h2>

                  <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {order.description?.trim()
                      ? order.description
                      : 'Sin descripción registrada.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>

              {order.status === 'PENDING' ? (
                <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm font-semibold text-purple-700">
                  El parte ya fue enviado. La orden queda pendiente de revisión
                  del administrador.
                </div>
              ) : null}

              {actionError ? (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {actionError}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {canStart(order) ? (
                  <button
                    type="button"
                    onClick={() => void handleAction('start')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {actionLoading === 'start' ? 'Actualizando...' : 'Iniciar'}
                  </button>
                ) : null}

                {canFillReport(order) ? (
                  <Link
                    href={`/technician/dashboard/work-orders/${order.id}/report`}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    Rellenar parte de trabajo
                  </Link>
                ) : null}

                {canReopen(order) ? (
                  <button
                    type="button"
                    onClick={() => void handleAction('reopen')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {actionLoading === 'reopen' ? 'Actualizando...' : 'Reabrir'}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DetailItem label="Cliente" value={customerName} />
              <DetailItem label="Ubicación / sede" value={siteName} />
              <DetailItem label="Activo / máquina" value={assetName} />
              <DetailItem label="Técnico asignado" value={assignedName} />
              <DetailItem label="Creada por" value={createdByName} />
              <DetailItem
                label="Fecha programada"
                value={formatDateTime(scheduledDate)}
              />
              <DetailItem
                label="Fecha de inicio"
                value={formatDateTime(order.startedAt)}
              />
              <DetailItem
                label="Fecha de finalización"
                value={formatDateTime(order.completedAt)}
              />
              <DetailItem
                label="Última actualización"
                value={formatDateTime(order.updatedAt)}
              />
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-black">Flujo de trabajo</h2>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Paso 1
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    Recibir orden
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Paso 2
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    Iniciar trabajo
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Paso 3
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    Rellenar parte
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Paso 4
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    Admin revisa
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}