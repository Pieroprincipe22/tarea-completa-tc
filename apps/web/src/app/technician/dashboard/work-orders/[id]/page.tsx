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
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-ink">
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
          Para ver el detalle de la orden necesitas iniciar sesión como técnico.
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
          Tu sesión actual no tiene rol técnico.
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
    <main className="min-h-screen bg-surface-2 p-4 text-ink md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">
                Panel técnico
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Detalle de orden
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Revisa la información de la orden, inicia el trabajo y rellena
                el parte antes de enviarlo al administrador.
              </p>
            </div>

            <Link
              href="/technician/dashboard/work-orders"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-ink-2 hover:bg-surface-2"
            >
              Volver a órdenes
            </Link>
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
            Cargando detalle de la orden...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-xl border border-danger/30 bg-danger-soft p-6 text-danger">
            {state.error}
          </section>
        ) : order ? (
          <>
            <section className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold text-muted">
                    {order.code ? `Código: ${order.code}` : 'Orden de trabajo'}
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    {order.title}
                  </h2>

                  <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-muted">
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
                <div className="mt-5 rounded-lg border border-special/30 bg-special-soft p-4 text-sm font-semibold text-special">
                  El parte ya fue enviado. La orden queda pendiente de revisión
                  del administrador.
                </div>
              ) : null}

              {actionError ? (
                <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm font-semibold text-danger">
                  {actionError}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {canStart(order) ? (
                  <button
                    type="button"
                    onClick={() => void handleAction('start')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent-hover"
                  >
                    {actionLoading === 'start' ? 'Actualizando...' : 'Iniciar'}
                  </button>
                ) : null}

                {canFillReport(order) ? (
                  <Link
                    href={`/technician/dashboard/work-orders/${order.id}/report`}
                    className="inline-flex items-center justify-center rounded-lg bg-success px-5 py-3 text-sm font-bold text-white transition hover:bg-success/90"
                  >
                    Rellenar parte de trabajo
                  </Link>
                ) : null}

                {canReopen(order) ? (
                  <button
                    type="button"
                    onClick={() => void handleAction('reopen')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-5 py-3 text-sm font-bold text-ink-2 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:bg-surface-2"
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

            <section className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
              <h2 className="text-xl font-semibold">Flujo de trabajo</h2>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-xs font-bold uppercase text-subtle">
                    Paso 1
                  </p>
                  <p className="mt-2 text-sm font-bold text-ink">
                    Recibir orden
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-xs font-bold uppercase text-subtle">
                    Paso 2
                  </p>
                  <p className="mt-2 text-sm font-bold text-ink">
                    Iniciar trabajo
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-xs font-bold uppercase text-subtle">
                    Paso 3
                  </p>
                  <p className="mt-2 text-sm font-bold text-ink">
                    Rellenar parte
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-xs font-bold uppercase text-subtle">
                    Paso 4
                  </p>
                  <p className="mt-2 text-sm font-bold text-ink">
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