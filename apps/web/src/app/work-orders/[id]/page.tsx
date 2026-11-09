'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isTechnicianSession,
  readTcSession,
  type TcSession,
} from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPatch,
} from '@/lib/tc/api';

const WORK_ORDER_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
] as const;

type WorkOrderStatusValue = (typeof WORK_ORDER_STATUSES)[number];

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type EntityRow = {
  id: string;
  name: string;
  address?: string | null;
  email?: string;
  brand?: string | null;
  model?: string | null;
};

type TechnicianOption = {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  isActive?: boolean;
};

type WorkOrderDetail = {
  id: string;
  code: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: EntityRow | null;
  site?: EntityRow | null;
  asset?: EntityRow | null;
  assignedTo?: EntityRow | null;
  assignedTechnician?: EntityRow | null;
  // Si la orden es una ronda de muchos equipos.
  roundId?: string | null;
};

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseEntity(value: unknown): EntityRow | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    address: asNullableStr(value.address),
    email: asNullableStr(value.email) ?? undefined,
    brand: asNullableStr(value.brand),
    model: asNullableStr(value.model),
  };
}

function parseTechnician(value: unknown): TechnicianOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id) || asStr(value.userId);
  const userId = asStr(value.userId) || id;
  const email = asNullableStr(value.email);
  const name = asStr(value.name) || email || '';
  const isActive =
    typeof value.isActive === 'boolean' ? value.isActive : undefined;

  if (!id || !userId || !name) return null;

  return {
    id,
    userId,
    name,
    email,
    isActive,
  };
}

function parseDetail(value: unknown): WorkOrderDetail | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const title = asStr(value.title);

  if (!id || !title) return null;

  return {
    id,
    code: asNullableStr(value.code),
    title,
    description: asNullableStr(value.description),
    status: asStr(value.status, '—'),
    priority: asNullableStr(value.priority),
    scheduledAt: asNullableStr(value.scheduledAt),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
    customer: parseEntity(value.customer),
    site: parseEntity(value.site),
    asset: parseEntity(value.asset),
    assignedTo: parseEntity(value.assignedTo),
    assignedTechnician: parseEntity(value.assignedTechnician),
    roundId: isRecord(value.round) ? asNullableStr(value.round.id) : null,
  };
}

function formatDate(input?: string | null): string {
  if (!input) return '—';

  const date = new Date(input);

  return Number.isNaN(date.getTime()) ? input : date.toLocaleString('es-ES');
}

function formatStatus(status: string): string {
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

function formatPriority(priority?: string | null): string {
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

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'ASSIGNED':
      return 'border-accent/30 bg-accent-soft text-accent';
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

function priorityBadgeClass(priority?: string | null): string {
  switch (priority) {
    case 'LOW':
      return 'border-line-strong bg-surface-3 text-ink';
    case 'MEDIUM':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'HIGH':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'URGENT':
      return 'border-danger/30 bg-danger-soft text-danger';
    default:
      return 'border-line bg-surface-3 text-ink';
  }
}

function getAssignedUserId(order: WorkOrderDetail): string {
  return order.assignedTo?.id ?? order.assignedTechnician?.id ?? '';
}

function getAssignedName(order: WorkOrderDetail): string {
  return order.assignedTo?.name ?? order.assignedTechnician?.name ?? 'Sin asignar';
}

function getAssignedEmail(order: WorkOrderDetail): string | undefined {
  return order.assignedTo?.email ?? order.assignedTechnician?.email;
}

function getTechnicianLabel(technician: TechnicianOption): string {
  if (technician.email && technician.email !== technician.name) {
    return `${technician.name} · ${technician.email}`;
  }

  return technician.name;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const idRaw = (params as { id?: string | string[] })?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : String(idRaw ?? '');

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<LoadState<WorkOrderDetail>>({
    status: 'loading',
  });
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [techniciansError, setTechniciansError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
  });
  const [assignedToUserId, setAssignedToUserId] = useState('');

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const isTechnician = !!session && isTechnicianSession(session);
  const canAssignTechnician = !!session && !isTechnician;

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  const loadDetail = useCallback(
    async (currentSession: TcSession, currentId: string) => {
      setState({ status: 'loading' });

      const currentPaths = resolveCorePaths(currentSession);
      const response = await tcGet(
        currentSession,
        `${currentPaths.workOrders}/${currentId}`,
      );

      if (response.code === 404) {
        setState({ status: 'error', error: 'Orden de trabajo no encontrada.' });
        return;
      }

      if (response.code === 403) {
        setState({ status: 'error', error: '403 Forbidden.' });
        return;
      }

      if (response.code < 200 || response.code >= 300) {
        setState({ status: 'error', error: `HTTP ${response.code}` });
        return;
      }

      const parsed = parseDetail(response.json);

      if (!parsed) {
        setState({
          status: 'error',
          error: 'Respuesta inválida del backend.',
        });
        return;
      }

      setAssignedToUserId(getAssignedUserId(parsed));
      setState({ status: 'ok', data: parsed });
    },
    [],
  );

  const loadTechnicians = useCallback(async (currentSession: TcSession) => {
    const currentPaths = resolveCorePaths(currentSession);
    const response = await tcGet(currentSession, currentPaths.technicians);

    if (response.code < 200 || response.code >= 300) {
      setTechnicians([]);
      setTechniciansError(`No se pudieron cargar técnicos. HTTP ${response.code}`);
      return;
    }

    const { items } = normalizeList(response.json);
    const rows = items
      .map(parseTechnician)
      .filter((item): item is TechnicianOption => !!item)
      .filter((item) => item.isActive !== false);

    setTechnicians(rows);
    setTechniciansError(null);
  }, []);

  useEffect(() => {
    if (!mounted || !session) return;

    if (!id) {
      setState({ status: 'error', error: 'ID de orden inválido.' });
      return;
    }

    void loadDetail(session, id);

    if (!isTechnicianSession(session)) {
      void loadTechnicians(session);
    }
  }, [mounted, session, id, loadDetail, loadTechnicians]);

  async function applyPatchedResponse(
    response: { code: number; json: unknown },
    successMessage: string,
    fallbackReload = false,
  ) {
    if (response.code < 200 || response.code >= 300) {
      let message = `HTTP ${response.code}`;

      if (isRecord(response.json)) {
        const apiMessage = response.json.message;

        if (typeof apiMessage === 'string' && apiMessage.trim()) {
          message = apiMessage;
        }

        if (Array.isArray(apiMessage)) {
          const joined = apiMessage
            .filter((x): x is string => typeof x === 'string')
            .join(', ');

          if (joined) message = joined;
        }
      }

      setActionState({
        status: 'error',
        message,
      });
      return;
    }

    const parsed = parseDetail(response.json);

    if (parsed) {
      setAssignedToUserId(getAssignedUserId(parsed));
      setState({ status: 'ok', data: parsed });
      setActionState({ status: 'success', message: successMessage });
      return;
    }

    if (fallbackReload && session && id) {
      await loadDetail(session, id);
      setActionState({ status: 'success', message: successMessage });
      return;
    }

    setActionState({
      status: 'error',
      message: 'El backend respondió sin una orden válida.',
    });
  }

  async function handleStatusChange(nextStatus: WorkOrderStatusValue) {
    if (!session || !id) return;

    try {
      setActionState({
        status: 'saving',
        message: `Actualizando estado a ${nextStatus}...`,
      });

      const response = await tcPatch(session, `${paths.workOrders}/${id}/status`, {
        status: nextStatus,
      });

      await applyPatchedResponse(
        response,
        `Estado actualizado a ${formatStatus(nextStatus)}.`,
        true,
      );
    } catch (error) {
      setActionState({ status: 'error', message: errMsg(error) });
    }
  }

  async function handleAssignTechnician() {
    if (!session || !id) return;

    const technicianId = assignedToUserId.trim();

    if (!technicianId) {
      setActionState({
        status: 'error',
        message: 'Selecciona un técnico antes de guardar la asignación.',
      });
      return;
    }

    try {
      setActionState({
        status: 'saving',
        message: 'Asignando técnico...',
      });

      const response = await tcPatch(session, `${paths.workOrders}/${id}/assign`, {
        assignedToId: technicianId,
      });

      await applyPatchedResponse(
        response,
        'Técnico asignado correctamente.',
        true,
      );
    } catch (error) {
      setActionState({ status: 'error', message: errMsg(error) });
    }
  }

  if (!mounted) {
    return <main className="p-6 text-ink">Cargando sesión…</main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-surface-2 p-6 text-ink">
        <div className="mx-auto max-w-3xl rounded-xl border border-line bg-surface p-6">
          <h1 className="text-2xl font-semibold">Sin sesión tenant.</h1>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white"
          >
            Ir a /login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-2 p-6 text-ink">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-line bg-surface p-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-muted">
            Work Order
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Detalle completo y acciones operativas
          </h1>
          <Link
            href={isTechnician ? '/technician/dashboard/work-orders' : '/work-orders'}
            className="mt-4 inline-flex rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3"
          >
            ← Volver
          </Link>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-xl border border-line bg-surface p-6">
            Cargando…
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-xl border border-danger/30 bg-danger-soft p-6 text-danger">
            {state.error}
          </section>
        ) : (
          <section className="rounded-xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                  state.data.status,
                )}`}
              >
                {formatStatus(state.data.status)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityBadgeClass(
                  state.data.priority,
                )}`}
              >
                Prioridad: {formatPriority(state.data.priority)}
              </span>
            </div>

            {state.data.code ? (
              <p className="mt-4 font-mono text-sm font-medium text-muted">
                {state.data.code}
              </p>
            ) : null}

            <h2
              className={`${state.data.code ? 'mt-1' : 'mt-4'} text-2xl font-semibold`}
            >
              {state.data.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-ink-2">
              {state.data.description || 'Sin descripción.'}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-xs font-bold uppercase text-subtle">Cliente</p>
                <p className="mt-1 font-bold">{state.data.customer?.name ?? '—'}</p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-xs font-bold uppercase text-subtle">Site</p>
                <p className="mt-1 font-bold">{state.data.site?.name ?? '—'}</p>
                {state.data.site?.address ? (
                  <p className="mt-1 text-xs text-muted">
                    {state.data.site.address}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-xs font-bold uppercase text-subtle">Activo</p>
                <p className="mt-1 font-bold">{state.data.asset?.name ?? '—'}</p>
                {state.data.asset?.brand || state.data.asset?.model ? (
                  <p className="mt-1 text-xs text-muted">
                    {[state.data.asset?.brand, state.data.asset?.model]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <p className="text-xs font-bold uppercase text-subtle">
                  Asignado a
                </p>
                <p className="mt-1 font-bold">{getAssignedName(state.data)}</p>
                {getAssignedEmail(state.data) ? (
                  <p className="mt-1 text-xs text-muted">
                    {getAssignedEmail(state.data)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase text-subtle">
                  Programado
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {formatDate(state.data.scheduledAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-subtle">
                  Iniciado
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {formatDate(state.data.startedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-subtle">
                  Completado
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {formatDate(state.data.completedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-subtle">
                  Actualizado
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {formatDate(state.data.updatedAt)}
                </p>
              </div>
            </div>
          </section>
        )}

        {state.status === 'ok' && state.data.roundId ? (
          <section className="rounded-xl border border-accent/25 bg-accent-soft p-6">
            <h3 className="text-xl font-semibold">Ronda de mantenimiento</h3>
            <p className="mt-1 text-sm text-ink-2">
              Esta orden recorre muchos equipos, uno detrás de otro. Los
              técnicos, la revisión y el cierre se llevan desde la ronda.
            </p>
            <Link
              href={`/rounds/${state.data.roundId}`}
              className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Abrir la ronda
            </Link>
          </section>
        ) : (
          <section className="rounded-xl border border-line bg-surface p-6">
            <h3 className="text-xl font-semibold">Cambiar estado</h3>
            <p className="mt-1 text-sm text-muted">
              Disponible para administración y técnico.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {WORK_ORDER_STATUSES.map((status) => {
                const isCurrent = state.status === 'ok' && state.data.status === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void handleStatusChange(status)}
                    disabled={
                      actionState.status === 'saving' ||
                      isCurrent ||
                      state.status !== 'ok'
                    }
                    className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {formatStatus(status)}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {canAssignTechnician && !(state.status === 'ok' && state.data.roundId) ? (
          <section className="rounded-xl border border-line bg-surface p-6">
            <h3 className="text-xl font-semibold">Asignar técnico</h3>
            <p className="mt-1 text-sm text-muted">
              Selecciona un técnico activo de la empresa.
            </p>

            {techniciansError ? (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning">
                {techniciansError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <select
                value={assignedToUserId}
                onChange={(event) => setAssignedToUserId(event.target.value)}
                className="h-11 flex-1 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">Selecciona un técnico</option>
                {technicians.map((technician) => (
                  <option key={technician.userId} value={technician.userId}>
                    {getTechnicianLabel(technician)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleAssignTechnician()}
                disabled={actionState.status === 'saving' || state.status !== 'ok'}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar asignación
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-line bg-surface p-6">
          <h3 className="text-xl font-semibold">Estado de operación</h3>

          {actionState.status === 'idle' ? (
            <p className="mt-2 text-sm text-muted">Sin cambios pendientes.</p>
          ) : actionState.status === 'saving' ? (
            <p className="mt-2 text-sm text-accent">{actionState.message}</p>
          ) : actionState.status === 'success' ? (
            <p className="mt-2 text-sm text-success">
              {actionState.message}
            </p>
          ) : (
            <p className="mt-2 text-sm text-danger">{actionState.message}</p>
          )}
        </section>
      </div>
    </main>
  );
}