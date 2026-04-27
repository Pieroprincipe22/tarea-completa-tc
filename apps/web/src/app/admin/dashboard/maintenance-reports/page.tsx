'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPost,
} from '@/lib/tc/api';
import {
  isAdminSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; reportId: string; action: 'approve' | 'reject' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type NamedEntity = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  code?: string | null;
  internalCode?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
};

type WorkOrderInfo = {
  id?: string | null;
  code?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
};

type MaintenanceReportRow = {
  id: string;
  workOrderId?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  state?: string | null;
  summary?: string | null;
  diagnosis?: string | null;
  workPerformed?: string | null;
  recommendations?: string | null;
  observations?: string | null;
  technicianNotes?: string | null;
  reviewNotes?: string | null;
  laborHours?: string | null;
  submittedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
  assignedTechnician?: NamedEntity | null;
  submittedBy?: NamedEntity | null;
  reviewedBy?: NamedEntity | null;
  workOrder?: WorkOrderInfo | null;
  materialsCount: number;
  itemsCount: number;
};

const EMPTY_REPORTS: MaintenanceReportRow[] = [];

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
  const email = asNullableStr(value.email);
  const phone = asNullableStr(value.phone);
  const address = asNullableStr(value.address);
  const code = asNullableStr(value.code);
  const internalCode = asNullableStr(value.internalCode);
  const brand = asNullableStr(value.brand);
  const model = asNullableStr(value.model);
  const serialNumber = asNullableStr(value.serialNumber);
  const location = asNullableStr(value.location);

  if (
    !id &&
    !name &&
    !email &&
    !phone &&
    !address &&
    !code &&
    !internalCode &&
    !brand &&
    !model &&
    !serialNumber &&
    !location
  ) {
    return null;
  }

  return {
    id: id ?? undefined,
    name,
    email,
    phone,
    address,
    code,
    internalCode,
    brand,
    model,
    serialNumber,
    location,
  };
}

function parseWorkOrder(value: unknown): WorkOrderInfo | null {
  if (!isRecord(value)) return null;

  return {
    id: asNullableStr(value.id),
    code: asNullableStr(value.code),
    title: asNullableStr(value.title),
    status: asNullableStr(value.status),
    priority: asNullableStr(value.priority),
  };
}

function parseReport(value: unknown): MaintenanceReportRow | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);

  if (!id) return null;

  const materialsCount = Array.isArray(value.materials)
    ? value.materials.length
    : 0;

  const itemsCount = Array.isArray(value.items) ? value.items.length : 0;

  return {
    id,
    workOrderId: asNullableStr(value.workOrderId),
    title: asNullableStr(value.title),
    description: asNullableStr(value.description),
    status: asNullableStr(value.status),
    state: asNullableStr(value.state),
    summary: asNullableStr(value.summary),
    diagnosis: asNullableStr(value.diagnosis),
    workPerformed: asNullableStr(value.workPerformed),
    recommendations: asNullableStr(value.recommendations),
    observations: asNullableStr(value.observations),
    technicianNotes: asNullableStr(value.technicianNotes),
    reviewNotes: asNullableStr(value.reviewNotes),
    laborHours:
      value.laborHours === null || value.laborHours === undefined
        ? null
        : String(value.laborHours),
    submittedAt: asNullableStr(value.submittedAt),
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    reviewedAt: asNullableStr(value.reviewedAt),
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
    customer: parseNamedEntity(value.customer),
    site: parseNamedEntity(value.site),
    asset: parseNamedEntity(value.asset),
    assignedTechnician: parseNamedEntity(value.assignedTechnician),
    submittedBy: parseNamedEntity(value.submittedBy),
    reviewedBy: parseNamedEntity(value.reviewedBy),
    workOrder: parseWorkOrder(value.workOrder),
    materialsCount,
    itemsCount,
  };
}

function normalizeStatus(status?: string | null): string {
  return String(status ?? '').trim().toUpperCase();
}

function statusLabel(status?: string | null): string {
  switch (normalizeStatus(status)) {
    case 'DRAFT':
      return 'Borrador';
    case 'ASSIGNED':
      return 'Asignado';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'SUBMITTED':
      return 'Pendiente de revisión';
    case 'APPROVED':
      return 'Aprobado';
    case 'REJECTED':
      return 'Rechazado';
    case 'COMPLETED':
      return 'Completado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status || '—';
  }
}

function workOrderStatusLabel(status?: string | null): string {
  switch (normalizeStatus(status)) {
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

function finalStatusLabel(status?: string | null): string {
  switch (normalizeStatus(status)) {
    case 'OPERATIVO':
      return 'Equipo operativo';
    case 'OPERATIVO_CON_OBSERVACIONES':
      return 'Operativo con observaciones';
    case 'PENDIENTE_REVISION':
      return 'Pendiente de revisión';
    case 'NO_OPERATIVO':
      return 'No operativo';
    default:
      return status || '—';
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function displayName(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  return (
    entity.name?.trim() ||
    entity.code?.trim() ||
    entity.internalCode?.trim() ||
    entity.serialNumber?.trim() ||
    entity.email?.trim() ||
    entity.address?.trim() ||
    entity.location?.trim() ||
    '—'
  );
}

function displayAsset(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  const name =
    entity.name?.trim() ||
    entity.code?.trim() ||
    entity.internalCode?.trim() ||
    entity.serialNumber?.trim();

  const details = [entity.brand, entity.model, entity.location]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(' · ');

  if (name && details) return `${name} · ${details}`;
  if (name) return name;
  if (details) return details;

  return '—';
}

function displayWorkOrder(report: MaintenanceReportRow): string {
  return (
    report.workOrder?.code?.trim() ||
    report.workOrder?.title?.trim() ||
    report.workOrderId?.trim() ||
    '—'
  );
}

function badgeClass(status?: string | null): string {
  switch (normalizeStatus(status)) {
    case 'SUBMITTED':
      return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
    case 'APPROVED':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'REJECTED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    case 'ASSIGNED':
      return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
    case 'CANCELLED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

function finalStatusClass(status?: string | null): string {
  switch (normalizeStatus(status)) {
    case 'NO_OPERATIVO':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'PENDIENTE_REVISION':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'OPERATIVO_CON_OBSERVACIONES':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
    case 'OPERATIVO':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

function sortDateValue(report: MaintenanceReportRow): number {
  const raw =
    report.submittedAt ??
    report.updatedAt ??
    report.completedAt ??
    report.createdAt ??
    null;

  if (!raw) return 0;

  const time = new Date(raw).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function getApiError(json: unknown, code: number): string {
  if (isRecord(json)) {
    const message = json.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const joined = message
        .filter((item): item is string => typeof item === 'string')
        .join(' · ');

      if (joined) return joined;
    }

    const error = json.error;

    if (typeof error === 'string' && error.trim()) {
      return `${error} · HTTP ${code}`;
    }
  }

  return `HTTP ${code}`;
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-3xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-center">
      <h2 className="text-xl font-black text-white">
        No hay partes pendientes de revisión
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Cuando un técnico envíe un parte, aparecerá aquí para que administración
        lo revise, apruebe o devuelva.
      </p>
    </section>
  );
}

export default function AdminMaintenanceReportsInboxPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<Load<MaintenanceReportRow[]>>({
    status: 'loading',
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [reviewNotesById, setReviewNotesById] = useState<Record<string, string>>(
    {},
  );

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
        error: 'Sesión no encontrada. Inicia sesión como administrador.',
      });
      return;
    }

    if (!isAdminSession(session)) {
      setState({
        status: 'error',
        error: 'Esta pantalla es solo para administradores.',
      });
      return;
    }

    const activeSession = session;
    const activePaths = resolveCorePaths(activeSession);

    let cancelled = false;

    async function loadReports() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet(activeSession, activePaths.reports);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: getApiError(response.json, response.code),
          });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const parsed = items
          .map(parseReport)
          .filter((item): item is MaintenanceReportRow => !!item)
          .filter((item) => normalizeStatus(item.status) === 'SUBMITTED')
          .sort((a, b) => sortDateValue(b) - sortDateValue(a));

        setReviewNotesById((current) => {
          const next = { ...current };

          parsed.forEach((report) => {
            if (next[report.id] === undefined) {
              next[report.id] = '';
            }
          });

          return next;
        });

        setState({
          status: 'ok',
          data: parsed,
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

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [mounted, reloadKey, session]);

  const reports = state.status === 'ok' ? state.data : EMPTY_REPORTS;

  const stats = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.total += 1;

        if (normalizeStatus(report.summary) === 'NO_OPERATIVO') {
          acc.notOperational += 1;
        }

        if (report.recommendations?.trim()) {
          acc.withRecommendations += 1;
        }

        if (report.materialsCount > 0) {
          acc.withMaterials += 1;
        }

        return acc;
      },
      {
        total: 0,
        notOperational: 0,
        withRecommendations: 0,
        withMaterials: 0,
      },
    );
  }, [reports]);

  function updateReviewNotes(reportId: string, value: string) {
    setReviewNotesById((current) => ({
      ...current,
      [reportId]: value,
    }));
  }

  async function reviewReport(reportId: string, approved: boolean) {
    if (!session) {
      setActionState({
        status: 'error',
        message: 'Sesión no encontrada.',
      });
      return;
    }

    const notes = reviewNotesById[reportId]?.trim();

    if (!approved && !notes) {
      setActionState({
        status: 'error',
        message:
          'Para rechazar y devolver el parte al técnico, escribe una nota de revisión.',
      });
      return;
    }

    try {
      setActionState({
        status: 'saving',
        reportId,
        action: approved ? 'approve' : 'reject',
      });

      const response = await tcPost(session, `${paths.reports}/${reportId}/review`, {
        approved,
        reviewNotes:
          notes ||
          (approved
            ? 'Parte aprobado desde bandeja de revisión.'
            : 'Parte devuelto al técnico desde bandeja de revisión.'),
      });

      if (response.code < 200 || response.code >= 300) {
        setActionState({
          status: 'error',
          message: getApiError(response.json, response.code),
        });
        return;
      }

      setActionState({
        status: 'success',
        message: approved
          ? 'Parte aprobado correctamente. La orden quedó finalizada.'
          : 'Parte rechazado y devuelto al técnico.',
      });

      setReloadKey((current) => current + 1);
    } catch (error) {
      setActionState({
        status: 'error',
        message: errMsg(error),
      });
    }
  }

  const isSaving = actionState.status === 'saving';

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Cargando sesión...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black">Sesión no encontrada</h1>
          <p className="mt-2 text-sm">
            Para revisar partes necesitas iniciar sesión como administrador.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
          >
            Ir a login
          </Link>
        </section>
      </main>
    );
  }

  if (!isAdminSession(session)) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black">Acceso restringido</h1>
          <p className="mt-2 text-sm">
            Esta pantalla solo está disponible para administradores.
          </p>
          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
          >
            Volver al panel
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Administración
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Partes pendientes de revisión
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Revisa los partes enviados por los técnicos, valida diagnóstico,
                incidencias, piezas a pedir y decide si aprobar o devolver al
                técnico.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Actualizar
              </button>

              <Link
                href="/maintenance-reports"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Todos los partes
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Pendientes"
            value={stats.total}
            helper="Partes enviados por técnicos"
          />
          <MetricCard
            label="No operativos"
            value={stats.notOperational}
            helper="Equipos que requieren atención"
          />
          <MetricCard
            label="Con pieza a pedir"
            value={stats.withRecommendations}
            helper="Tienen recomendaciones"
          />
          <MetricCard
            label="Con materiales usados"
            value={stats.withMaterials}
            helper="Material ya consumido"
          />
        </section>

        {actionState.status === 'error' ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm font-semibold text-rose-200">
            {actionState.message}
          </section>
        ) : null}

        {actionState.status === 'success' ? (
          <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm font-semibold text-emerald-200">
            {actionState.message}
          </section>
        ) : null}

        {state.status === 'loading' ? (
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Cargando partes pendientes...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
            {state.error}
          </section>
        ) : reports.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid gap-5">
            {reports.map((report) => {
              const notes = reviewNotesById[report.id] ?? '';
              const approving =
                actionState.status === 'saving' &&
                actionState.reportId === report.id &&
                actionState.action === 'approve';
              const rejecting =
                actionState.status === 'saving' &&
                actionState.reportId === report.id &&
                actionState.action === 'reject';

              return (
                <article
                  key={report.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(
                            report.status,
                          )}`}
                        >
                          {statusLabel(report.status)}
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${finalStatusClass(
                            report.summary,
                          )}`}
                        >
                          {finalStatusLabel(report.summary)}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">
                          Orden: {workOrderStatusLabel(report.workOrder?.status)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black text-white">
                        {displayWorkOrder(report)}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        {report.title ?? 'Parte de trabajo'}
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Cliente
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {displayName(report.customer)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Site / ubicación
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {displayName(report.site)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Activo / máquina
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {displayAsset(report.asset)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Técnico
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {displayName(report.assignedTechnician)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Horas
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {report.laborHours || '—'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Enviado
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {formatDate(report.submittedAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Materiales
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {report.materialsCount}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Checklist
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-200">
                            {report.itemsCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Diagnóstico
                          </p>
                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-slate-200">
                            {report.diagnosis || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                          <p className="text-xs font-bold uppercase text-rose-300">
                            Incidencias
                          </p>
                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-rose-100">
                            {report.observations || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <p className="text-xs font-bold uppercase text-amber-300">
                            Recomendaciones / pieza a pedir
                          </p>
                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-amber-100">
                            {report.recommendations || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full shrink-0 space-y-3 xl:w-80">
                      <Link
                        href={`/maintenance-reports/${report.id}`}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-100 hover:bg-slate-800"
                      >
                        Ver parte completo
                      </Link>

                      {report.workOrderId ? (
                        <Link
                          href={`/work-orders/${report.workOrderId}`}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-100 hover:bg-slate-800"
                        >
                          Ver orden
                        </Link>
                      ) : null}

                      <label className="block">
                        <span className="text-sm font-bold text-slate-300">
                          Nota de revisión
                        </span>
                        <textarea
                          value={notes}
                          onChange={(event) =>
                            updateReviewNotes(report.id, event.target.value)
                          }
                          disabled={isSaving}
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
                          placeholder="Ejemplo: Aprobar y pedir compresor indicado por el técnico."
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void reviewReport(report.id, true)}
                        disabled={isSaving}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {approving ? 'Aprobando...' : 'Aprobar parte'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void reviewReport(report.id, false)}
                        disabled={isSaving}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {rejecting
                          ? 'Devolviendo...'
                          : 'Rechazar y devolver al técnico'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}