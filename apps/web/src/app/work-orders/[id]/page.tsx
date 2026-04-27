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
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'ASSIGNED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
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

function priorityBadgeClass(priority?: string | null): string {
  switch (priority) {
    case 'LOW':
      return 'border-slate-600 bg-slate-800 text-slate-200';
    case 'MEDIUM':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
    case 'HIGH':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-300';
    case 'URGENT':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
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
    return <main className="p-6 text-slate-200">Cargando sesión…</main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-black">Sin sesión tenant.</h1>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-950"
          >
            Ir a /login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
            Work Order
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Detalle completo y acciones operativas
          </h1>
          <Link
            href={isTechnician ? '/technician/dashboard/work-orders' : '/work-orders'}
            className="mt-4 inline-flex rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            ← Volver
          </Link>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            Cargando…
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
            {state.error}
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${statusBadgeClass(
                  state.data.status,
                )}`}
              >
                {formatStatus(state.data.status)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${priorityBadgeClass(
                  state.data.priority,
                )}`}
              >
                Prioridad: {formatPriority(state.data.priority)}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black">{state.data.title}</h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {state.data.description || 'Sin descripción.'}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Cliente</p>
                <p className="mt-1 font-bold">{state.data.customer?.name ?? '—'}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Site</p>
                <p className="mt-1 font-bold">{state.data.site?.name ?? '—'}</p>
                {state.data.site?.address ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {state.data.site.address}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Activo</p>
                <p className="mt-1 font-bold">{state.data.asset?.name ?? '—'}</p>
                {state.data.asset?.brand || state.data.asset?.model ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {[state.data.asset?.brand, state.data.asset?.model]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Asignado a
                </p>
                <p className="mt-1 font-bold">{getAssignedName(state.data)}</p>
                {getAssignedEmail(state.data) ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {getAssignedEmail(state.data)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Programado
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {formatDate(state.data.scheduledAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Iniciado
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {formatDate(state.data.startedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Completado
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {formatDate(state.data.completedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">
                  Actualizado
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {formatDate(state.data.updatedAt)}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-black">Cambiar estado</h3>
          <p className="mt-1 text-sm text-slate-400">
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
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {formatStatus(status)}
                </button>
              );
            })}
          </div>
        </section>

        {canAssignTechnician ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-black">Asignar técnico</h3>
            <p className="mt-1 text-sm text-slate-400">
              Selecciona un técnico activo de la empresa.
            </p>

            {techniciansError ? (
              <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                {techniciansError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <select
                value={assignedToUserId}
                onChange={(event) => setAssignedToUserId(event.target.value)}
                className="h-11 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-slate-500"
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
                className="rounded-2xl bg-white px-5 py-2 text-sm font-black text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar asignación
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-black">Estado de operación</h3>

          {actionState.status === 'idle' ? (
            <p className="mt-2 text-sm text-slate-400">Sin cambios pendientes.</p>
          ) : actionState.status === 'saving' ? (
            <p className="mt-2 text-sm text-blue-300">{actionState.message}</p>
          ) : actionState.status === 'success' ? (
            <p className="mt-2 text-sm text-emerald-300">
              {actionState.message}
            </p>
          ) : (
            <p className="mt-2 text-sm text-rose-300">{actionState.message}</p>
          )}
        </section>
      </div>
    </main>
  );
}
