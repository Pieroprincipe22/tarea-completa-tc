'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isTechnicianSession,
  readTcSession,
  type TcSession,
} from '@/lib/tc/session';
import { errMsg, isRecord, resolveCorePaths, tcGet } from '@/lib/tc/api';

const WORK_ORDER_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
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
  customer?: { id: string; name: string } | null;
  site?: { id: string; name: string; address?: string | null } | null;
  asset?: { id: string; name: string; brand?: string | null; model?: string | null } | null;
  assignedTo?: { id: string; name: string; email?: string } | null;
};

type PatchResponse = {
  code: number;
  json: unknown;
  text: string;
};

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function parseEntity(
  value: unknown,
): {
  id: string;
  name: string;
  address?: string | null;
  email?: string;
  brand?: string | null;
  model?: string | null;
} | null {
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
  };
}

function formatDate(input?: string | null) {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString('es-ES');
}

function formatStatus(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'ASSIGNED':
      return 'Assigned';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'DONE':
      return 'Done';
    case 'CANCELLED':
      return 'Cancelled';
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

async function patchJson(session: TcSession, url: string, body: unknown): Promise<PatchResponse> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-company-id': session.companyId,
      'x-user-id': session.userId,
    },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') ?? '';
  let json: unknown = null;
  let text = '';

  if (contentType.includes('application/json')) {
    json = await res.json().catch(() => null);
  } else {
    text = await res.text().catch(() => '');
  }

  return {
    code: res.status,
    json,
    text,
  };
}

function getPatchError(response: PatchResponse): string {
  if (isRecord(response.json)) {
    const message = response.json.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const joined = message.filter((x): x is string => typeof x === 'string').join(', ');
      if (joined) return joined;
    }
  }

  if (response.text.trim()) {
    return response.text.trim();
  }

  return `HTTP ${response.code}`;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const idRaw = (params as { id?: string | string[] })?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : String(idRaw ?? '');

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<LoadState<WorkOrderDetail>>({ status: 'loading' });
  const [actionState, setActionState] = useState<ActionState>({ status: 'idle' });
  const [assignedToUserId, setAssignedToUserId] = useState('');

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const isTechnician = !!session && isTechnicianSession(session);
  const canAssignTechnician = !!session && !isTechnician;

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  const loadDetail = useCallback(async (currentSession: TcSession, currentId: string) => {
    setState({ status: 'loading' });

    const currentPaths = resolveCorePaths(currentSession);
    const r = await tcGet(currentSession, `${currentPaths.workOrders}/${currentId}`);

    if (r.code === 404) {
      setState({ status: 'error', error: 'Work order no encontrada.' });
      return;
    }

    if (r.code === 403) {
      setState({ status: 'error', error: '403 Forbidden.' });
      return;
    }

    if (r.code < 200 || r.code >= 300) {
      setState({ status: 'error', error: `HTTP ${r.code}` });
      return;
    }

    const parsed = parseDetail(r.json);

    if (!parsed) {
      setState({ status: 'error', error: 'Respuesta inválida del backend.' });
      return;
    }

    setAssignedToUserId(parsed.assignedTo?.id ?? '');
    setState({ status: 'ok', data: parsed });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!session) return;
    if (!id) {
      setState({ status: 'error', error: 'ID de work order inválido.' });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadDetail(session, id);
      } catch (e) {
        if (!cancelled) {
          setState({ status: 'error', error: errMsg(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, session, id, loadDetail]);

  async function applyPatchedResponse(
    response: PatchResponse,
    successMessage: string,
    fallbackReload = false,
  ) {
    if (response.code < 200 || response.code >= 300) {
      setActionState({
        status: 'error',
        message: getPatchError(response),
      });
      return;
    }

    const parsed = parseDetail(response.json);

    if (parsed) {
      setAssignedToUserId(parsed.assignedTo?.id ?? '');
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
      message: 'El backend respondió sin un objeto de work order válido.',
    });
  }

  async function handleStatusChange(nextStatus: WorkOrderStatusValue) {
    if (!session || !id) return;

    try {
      setActionState({ status: 'saving', message: `Actualizando estado a ${nextStatus}...` });

      const response = await patchJson(session, `${paths.workOrders}/${id}/status`, {
        status: nextStatus,
      });

      await applyPatchedResponse(response, `Estado actualizado a ${nextStatus}.`, true);
    } catch (e) {
      setActionState({ status: 'error', message: errMsg(e) });
    }
  }

  async function handleAssignTechnician() {
    if (!session || !id) return;

    const technicianId = assignedToUserId.trim();

    if (!technicianId) {
      setActionState({
        status: 'error',
        message: 'Pega el UUID del técnico en el campo antes de asignar.',
      });
      return;
    }

    try {
      setActionState({ status: 'saving', message: 'Asignando técnico...' });

      const response = await patchJson(session, `${paths.workOrders}/${id}`, {
        assignedToUserId: technicianId,
      });

      await applyPatchedResponse(
        response,
        'Técnico asignado correctamente.',
        true,
      );
    } catch (e) {
      setActionState({ status: 'error', message: errMsg(e) });
    }
  }

  if (!mounted) {
    return <div className="p-6">Cargando sesión…</div>;
  }

  if (!session) {
    return (
      <div className="p-6">
        <p>Sin sesión tenant.</p>
        <Link className="underline" href="/login">
          Ir a /login
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Work Order</h1>
          <p className="mt-1 text-sm text-slate-400">
            Detalle completo y acciones operativas de la orden.
          </p>
        </div>

        <Link className="underline" href="/work-orders">
          ← Volver
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          {state.status === 'loading' ? (
            <p>Cargando…</p>
          ) : state.status === 'error' ? (
            <p>{state.error}</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      state.data.status,
                    )}`}
                  >
                    {formatStatus(state.data.status)}
                  </span>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${priorityBadgeClass(
                      state.data.priority,
                    )}`}
                  >
                    Prioridad: {formatPriority(state.data.priority)}
                  </span>
                </div>

                <h2 className="text-2xl font-semibold">{state.data.title}</h2>

                {state.data.description ? (
                  <p className="mt-2 text-slate-300">{state.data.description}</p>
                ) : (
                  <p className="mt-2 text-slate-500">Sin descripción.</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Customer</div>
                  <div className="mt-1">{state.data.customer?.name ?? '—'}</div>
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Site</div>
                  <div className="mt-1">{state.data.site?.name ?? '—'}</div>
                  {state.data.site?.address ? (
                    <div className="mt-1 text-xs text-slate-400">{state.data.site.address}</div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Asset</div>
                  <div className="mt-1">{state.data.asset?.name ?? '—'}</div>
                  {state.data.asset?.brand || state.data.asset?.model ? (
                    <div className="mt-1 text-xs text-slate-400">
                      {[state.data.asset?.brand, state.data.asset?.model].filter(Boolean).join(' · ')}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Asignado a</div>
                  <div className="mt-1">{state.data.assignedTo?.name ?? 'Sin asignar'}</div>
                  {state.data.assignedTo?.email ? (
                    <div className="mt-1 text-xs text-slate-400">{state.data.assignedTo.email}</div>
                  ) : null}
                  {state.data.assignedTo?.id ? (
                    <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                      {state.data.assignedTo.id}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Programado</div>
                  <div className="mt-1">{formatDate(state.data.scheduledAt)}</div>
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Iniciado</div>
                  <div className="mt-1">{formatDate(state.data.startedAt)}</div>
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Completado</div>
                  <div className="mt-1">{formatDate(state.data.completedAt)}</div>
                </div>

                <div className="rounded-xl border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Actualizado</div>
                  <div className="mt-1">{formatDate(state.data.updatedAt)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-lg font-semibold">Cambiar estado</h3>
            <p className="mt-1 text-sm text-slate-400">
              Disponible para administración y técnico.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WORK_ORDER_STATUSES.map((status) => {
                const isCurrent =
                  state.status === 'ok' && state.data.status === status;

                return (
                  <button
                    key={status}
                    type="button"
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      isCurrent
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-700 hover:bg-slate-800'
                    }`}
                    onClick={() => handleStatusChange(status)}
                    disabled={actionState.status === 'saving' || isCurrent || state.status !== 'ok'}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {canAssignTechnician ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <h3 className="text-lg font-semibold">Asignar técnico</h3>
              <p className="mt-1 text-sm text-slate-400">
                Por ahora esta versión asigna por UUID del usuario técnico.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  placeholder="UUID del técnico"
                />

                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleAssignTechnician}
                  disabled={actionState.status === 'saving' || state.status !== 'ok'}
                >
                  Guardar asignación
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-lg font-semibold">Estado de operación</h3>

            {actionState.status === 'idle' ? (
              <p className="mt-2 text-sm text-slate-400">Sin cambios pendientes.</p>
            ) : actionState.status === 'saving' ? (
              <p className="mt-2 text-sm text-amber-300">{actionState.message}</p>
            ) : actionState.status === 'success' ? (
              <p className="mt-2 text-sm text-emerald-300">{actionState.message}</p>
            ) : (
              <p className="mt-2 text-sm text-rose-300">{actionState.message}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}