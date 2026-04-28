'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isTechnicianSession,
  readTcSession,
  resolveHomePath,
  resolveWorkOrdersPath,
  type TcSession,
} from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcDelete,
  tcGet,
} from '@/lib/tc/api';

type StatusFilterValue =
  | ''
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED'
  | 'CANCELED'
  | 'PENDING';

type WorkOrderRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string | null;
  customer?: { id: string; name: string } | null;
  site?: { id: string; name: string; address?: string | null } | null;
  asset?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string; email?: string } | null;
  assignedTechnician?: { id: string; name: string; email?: string } | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseNamedEntity(
  value: unknown,
): { id: string; name: string; address?: string | null; email?: string } | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    address: asNullableStr(value.address),
    email: asNullableStr(value.email) ?? undefined,
  };
}

function parsePriority(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().toUpperCase()
    : null;
}

function parseRow(value: unknown): WorkOrderRow {
  if (!isRecord(value)) {
    return {
      id: '',
      title: '—',
      status: '—',
      priority: null,
    };
  }

  return {
    id: asStr(value.id),
    title: asStr(value.title, '—'),
    description: asNullableStr(value.description),
    status: asStr(value.status, '—'),
    priority: parsePriority(value.priority),
    customer: parseNamedEntity(value.customer),
    site: parseNamedEntity(value.site),
    asset: parseNamedEntity(value.asset),
    assignedTo: parseNamedEntity(value.assignedTo),
    assignedTechnician: parseNamedEntity(value.assignedTechnician),
    scheduledAt: asNullableStr(value.scheduledAt),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    createdAt: asNullableStr(value.createdAt) ?? undefined,
    updatedAt: asNullableStr(value.updatedAt) ?? undefined,
  };
}

function formatStatus(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Abierta';
    case 'ASSIGNED':
      return 'Asignada';
    case 'PENDING':
      return 'Pendiente';
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

function formatPriority(priority: string | null): string {
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

function formatDate(input?: string | null): string {
  if (!input) return '—';

  const date = new Date(input);

  return Number.isNaN(date.getTime()) ? input : date.toLocaleString('es-ES');
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'ASSIGNED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'PENDING':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-200';
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

function priorityBadgeClass(priority: string | null): string {
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

function getAssignedName(order: WorkOrderRow): string {
  return (
    order.assignedTo?.name ??
    order.assignedTechnician?.name ??
    'Sin asignar'
  );
}

export default function WorkOrdersPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('');
  const [state, setState] = useState<LoadState<WorkOrderRow[]>>({
    status: 'loading',
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homeHref = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted || !session) return;

    if (isTechnicianSession(session)) {
      router.replace(resolveWorkOrdersPath(session));
    }
  }, [mounted, router, session]);

  const loadWorkOrders = useCallback(async () => {
    if (!session || isTechnicianSession(session)) return;

    try {
      setState({ status: 'loading' });

      const query = new URLSearchParams();
      query.set('pageSize', '100');

      if (statusFilter) {
        query.set('status', statusFilter);
      }

      if (searchTerm.trim()) {
        query.set('q', searchTerm.trim());
      }

      const response = await tcGet(session, `${paths.workOrders}?${query.toString()}`);

      if (response.code < 200 || response.code >= 300) {
        setState({
          status: 'error',
          error:
            response.code === 403
              ? '403 Not a member (UserCompany)'
              : `HTTP ${response.code}`,
        });
        return;
      }

      const { items } = normalizeList(response.json);
      const rows = items.map(parseRow).filter((order) => order.id);

      setState({ status: 'ok', data: rows });
    } catch (error) {
      setState({ status: 'error', error: errMsg(error) });
    }
  }, [session, statusFilter, searchTerm, paths.workOrders]);

  useEffect(() => {
    if (!mounted || !session) return;
    if (isTechnicianSession(session)) return;

    void loadWorkOrders();
  }, [mounted, session, loadWorkOrders]);

  async function handleDelete(order: WorkOrderRow) {
    if (!session) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar esta orden?\n\n${order.title}\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(order.id);
      setActionState({
        status: 'saving',
        message: 'Eliminando orden de trabajo...',
      });

      const response = await tcDelete(session, `${paths.workOrders}/${order.id}`);

      if (response.code < 200 || response.code >= 300) {
        setActionState({
          status: 'error',
          message: `No se pudo eliminar la orden. HTTP ${response.code}`,
        });
        return;
      }

      setState((current) => {
        if (current.status !== 'ok') return current;

        return {
          status: 'ok',
          data: current.data.filter((item) => item.id !== order.id),
        };
      });

      setActionState({
        status: 'success',
        message: 'Orden eliminada correctamente.',
      });
    } catch (error) {
      setActionState({ status: 'error', message: errMsg(error) });
    } finally {
      setDeletingId(null);
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        Cargando sesión…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-black">Work Orders</h1>
          <p className="mt-2 text-slate-400">Sin sesión tenant. Ve a /login.</p>

          <Link
            href="/login"
            className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
          >
            Ir a /login
          </Link>
        </section>
      </main>
    );
  }

  if (isTechnicianSession(session)) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        Redirigiendo al panel técnico…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                Operaciones
              </p>
              <h1 className="mt-2 text-3xl font-black">Work Orders</h1>
              <p className="mt-1 text-sm text-slate-400">
                Vista administrativa de todas las órdenes de trabajo.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/work-orders/new"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
              >
                + Nueva Work Order
              </Link>

              <Link
                href={homeHref}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por título o descripción"
              className="h-11 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-slate-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilterValue)
              }
              className="h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-slate-500"
            >
              <option value="">Todos los estados</option>
              <option value="OPEN">Abiertas</option>
              <option value="ASSIGNED">Asignadas</option>
              <option value="PENDING">Pendientes</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="DONE">Finalizadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="h-11 rounded-2xl border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Limpiar
            </button>
          </div>

          {state.status === 'ok' ? (
            <p className="mt-4 text-sm text-slate-400">
              {state.data.length} work order
              {state.data.length === 1 ? '' : 's'} encontrada
              {state.data.length === 1 ? '' : 's'}.
            </p>
          ) : null}

          {actionState.status !== 'idle' ? (
            <div
              className={`mt-4 rounded-2xl border p-4 text-sm ${
                actionState.status === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : actionState.status === 'error'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'border-blue-500/40 bg-blue-500/10 text-blue-200'
              }`}
            >
              {actionState.message}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          {state.status === 'loading' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              Cargando…
            </div>
          ) : state.status === 'error' ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
              {state.error}
            </div>
          ) : state.data.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              No hay work orders.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Título</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Site</th>
                    <th className="px-3 py-3">Técnico</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Prioridad</th>
                    <th className="px-3 py-3">Programado</th>
                    <th className="px-3 py-3">Actualizado</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {state.data.map((order, index) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-800/80 align-top last:border-0"
                    >
                      <td className="px-3 py-4 text-slate-300">{index + 1}</td>

                      <td className="px-3 py-4">
                        <p className="max-w-[260px] font-black text-slate-100">
                          {order.title}
                        </p>

                        {order.description ? (
                          <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-400">
                            {order.description}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-3 py-4 font-bold text-slate-200">
                        {order.customer?.name ?? '—'}
                      </td>

                      <td className="px-3 py-4">
                        <p className="font-bold text-slate-200">
                          {order.site?.name ?? '—'}
                        </p>

                        {order.site?.address ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {order.site.address}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {getAssignedName(order)}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusBadgeClass(
                            order.status,
                          )}`}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${priorityBadgeClass(
                            order.priority,
                          )}`}
                        >
                          {formatPriority(order.priority)}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {formatDate(order.scheduledAt)}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {formatDate(order.updatedAt)}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/work-orders/${order.id}`}
                            className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-black text-slate-100 hover:bg-slate-800"
                          >
                            Ver detalle
                          </Link>

                          <button
                            type="button"
                            onClick={() => void handleDelete(order)}
                            disabled={deletingId === order.id}
                            className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === order.id ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
