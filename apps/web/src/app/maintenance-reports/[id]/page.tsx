'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  resolveCorePaths,
  tcGet,
  tcPost,
} from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type ReportItemStatusValue = 'PENDING' | 'OK' | 'FAIL' | 'NA';

type ItemType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'CHECKBOX'
  | 'CHECKLIST'
  | 'PHOTO'
  | 'SIGNATURE'
  | string;

type MaterialRow = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  description: string;
  notes: string;
};

type ReportItem = {
  id: string;
  sortOrder: number;
  title: string;
  description?: string | null;
  status: ReportItemStatusValue;
  type: ItemType;
  required: boolean;
  unit?: string | null;
  valueText: string;
  valueNumber: string;
  valueBoolean: 'true' | 'false' | '';
  valueDate: string;
  valueChecklistText: string;
  notes: string;
};

type ReportDetail = {
  id: string;
  workOrderId?: string | null;
  workOrderCode?: string | null;
  workOrderTitle?: string | null;
  workOrderStatus?: string | null;
  performedAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  reviewedAt?: string | null;
  state?: string | null;
  status?: string | null;
  templateName?: string | null;
  templateDesc?: string | null;
  title?: string | null;
  description?: string | null;
  summary?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  workPerformed?: string | null;
  recommendations?: string | null;
  observations?: string | null;
  technicianNotes?: string | null;
  reviewNotes?: string | null;
  laborHours?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  siteName?: string | null;
  siteAddress?: string | null;
  assetName?: string | null;
  assetCode?: string | null;
  assetBrand?: string | null;
  assetModel?: string | null;
  assetSerialNumber?: string | null;
  assetLocation?: string | null;
  technicianName?: string | null;
  technicianEmail?: string | null;
  items: ReportItem[];
  materials: MaterialRow[];
};

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatDate(input?: string | null): string {
  if (!input) return '—';

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizeDateInput(value?: string | null): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

function checklistToText(valueJson: unknown, fallback?: string | null): string {
  if (Array.isArray(valueJson)) {
    return valueJson
      .map((row) => {
        if (typeof row === 'string') return row;

        if (isRecord(row)) {
          const label = asStr(row.label);
          const checked =
            typeof row.checked === 'boolean'
              ? row.checked
                ? 'sí'
                : 'no'
              : '';

          return label ? `${label}${checked ? ` | ${checked}` : ''}` : '';
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return typeof fallback === 'string' ? fallback : '';
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
        .join(', ');

      if (joined) return joined;
    }

    const error = json.error;

    if (typeof error === 'string' && error.trim()) {
      return `${error} (HTTP ${code})`;
    }
  }

  return `HTTP ${code}`;
}

function statusLabel(status?: string | null): string {
  switch (String(status ?? '').toUpperCase()) {
    case 'DRAFT':
      return 'Borrador';
    case 'ASSIGNED':
      return 'Asignado';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'SUBMITTED':
      return 'Enviado al admin';
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
  switch (String(status ?? '').toUpperCase()) {
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
  switch (String(status ?? '').toUpperCase()) {
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

function reportBadgeClass(status?: string | null): string {
  switch (String(status ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'REJECTED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'SUBMITTED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    case 'ASSIGNED':
      return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
    case 'CANCELLED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
  }
}

function workOrderBadgeClass(status?: string | null): string {
  switch (String(status ?? '').toUpperCase()) {
    case 'PENDING':
      return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
    case 'DONE':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    case 'CANCELLED':
    case 'CANCELED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

function parseItem(value: unknown): ReportItem | null {
  if (!isRecord(value)) return null;

  const templateItem = isRecord(value.templateItem) ? value.templateItem : null;
  const id = asStr(value.id);
  const title =
    asStr(value.title) ||
    asStr(value.label) ||
    asStr(templateItem?.title) ||
    asStr(templateItem?.label);

  if (!id || !title) return null;

  const rawStatus = asStr(value.status, 'PENDING').toUpperCase();
  const rawType = asStr(
    value.type,
    asStr(templateItem?.type, 'TEXT'),
  ).toUpperCase();

  const status: ReportItemStatusValue =
    rawStatus === 'OK' || rawStatus === 'FAIL' || rawStatus === 'NA'
      ? rawStatus
      : 'PENDING';

  const valueNumber =
    value.valueNumber === null || value.valueNumber === undefined
      ? ''
      : String(value.valueNumber);

  const valueBoolean =
    typeof value.valueBoolean === 'boolean'
      ? (String(value.valueBoolean) as 'true' | 'false')
      : '';

  return {
    id,
    sortOrder: asNumber(value.sortOrder, asNumber(value.itemOrder, 0)),
    title,
    description:
      asNullableStr(value.description) ?? asNullableStr(templateItem?.description),
    status,
    type: rawType || 'TEXT',
    required: Boolean(value.required ?? templateItem?.required),
    unit: asNullableStr(value.unit) ?? asNullableStr(templateItem?.unit),
    valueText: asNullableStr(value.valueText) ?? asNullableStr(value.value) ?? '',
    valueNumber,
    valueBoolean,
    valueDate: normalizeDateInput(asNullableStr(value.valueDate)),
    valueChecklistText: checklistToText(
      (value as { valueJson?: unknown }).valueJson,
      asNullableStr(value.valueText) ?? asNullableStr(value.value),
    ),
    notes: asNullableStr(value.notes) ?? '',
  };
}

function parseMaterial(value: unknown): MaterialRow | null {
  if (!isRecord(value)) return null;

  return {
    id: asStr(value.id),
    name: asStr(value.name),
    quantity:
      value.quantity === null || value.quantity === undefined
        ? ''
        : String(value.quantity),
    unit: asStr(value.unit),
    description: asStr(value.description),
    notes: asStr(value.notes),
  };
}

function parseDetail(value: unknown, fallbackId: string): ReportDetail | null {
  if (!isRecord(value)) return null;

  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const materialsRaw = Array.isArray(value.materials) ? value.materials : [];

  const customer = isRecord(value.customer) ? value.customer : null;
  const site = isRecord(value.site) ? value.site : null;
  const asset = isRecord(value.asset) ? value.asset : null;
  const workOrder = isRecord(value.workOrder) ? value.workOrder : null;
  const assignedTechnician = isRecord(value.assignedTechnician)
    ? value.assignedTechnician
    : null;

  const items = itemsRaw
    .map(parseItem)
    .filter((item): item is ReportItem => !!item)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const materials = materialsRaw
    .map(parseMaterial)
    .filter((material): material is MaterialRow => !!material);

  return {
    id: asStr(value.id, fallbackId),
    workOrderId: asNullableStr(value.workOrderId),
    workOrderCode: asNullableStr(workOrder?.code),
    workOrderTitle: asNullableStr(workOrder?.title),
    workOrderStatus: asNullableStr(workOrder?.status),
    performedAt:
      asNullableStr(value.performedAt) ??
      asNullableStr(value.completedAt) ??
      asNullableStr(value.startedAt) ??
      asNullableStr(value.createdAt),
    startedAt: asNullableStr(value.startedAt),
    submittedAt: asNullableStr(value.submittedAt),
    completedAt: asNullableStr(value.completedAt),
    reviewedAt: asNullableStr(value.reviewedAt),
    state: asNullableStr(value.state),
    status: asNullableStr(value.status),
    templateName:
      asNullableStr(value.templateName) ??
      asNullableStr(value.title) ??
      'Parte de trabajo',
    templateDesc:
      asNullableStr(value.templateDesc) ?? asNullableStr(value.description),
    title: asNullableStr(value.title),
    description: asNullableStr(value.description),
    summary: asNullableStr(value.summary),
    notes: asNullableStr(value.notes),
    diagnosis: asNullableStr(value.diagnosis),
    workPerformed: asNullableStr(value.workPerformed),
    recommendations: asNullableStr(value.recommendations),
    observations: asNullableStr(value.observations),
    technicianNotes: asNullableStr(value.technicianNotes),
    reviewNotes: asNullableStr(value.reviewNotes),
    laborHours:
      value.laborHours === null || value.laborHours === undefined
        ? ''
        : String(value.laborHours),

    customerName: asNullableStr(customer?.name),
    customerEmail: asNullableStr(customer?.email),
    customerPhone: asNullableStr(customer?.phone),

    siteName: asNullableStr(site?.name),
    siteAddress: asNullableStr(site?.address),

    assetName: asNullableStr(asset?.name),
    assetCode: asNullableStr(asset?.code) ?? asNullableStr(asset?.internalCode),
    assetBrand: asNullableStr(asset?.brand),
    assetModel: asNullableStr(asset?.model),
    assetSerialNumber: asNullableStr(asset?.serialNumber),
    assetLocation: asNullableStr(asset?.location),

    technicianName: asNullableStr(assignedTechnician?.name),
    technicianEmail: asNullableStr(assignedTechnician?.email),

    items,
    materials,
  };
}

function valueForItem(item: ReportItem): string {
  switch (item.type) {
    case 'NUMBER':
      return item.valueNumber || '—';
    case 'BOOLEAN':
    case 'CHECKBOX':
      if (item.valueBoolean === 'true') return 'Sí';
      if (item.valueBoolean === 'false') return 'No';
      return '—';
    case 'DATE':
      return item.valueDate || '—';
    case 'CHECKLIST':
      return item.valueChecklistText || '—';
    default:
      return item.valueText || '—';
  }
}

function StatusPill({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function InfoBox({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value?: string | null;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 whitespace-pre-wrap text-sm ${
          emphasis ? 'font-semibold text-white' : 'text-slate-200'
        }`}
      >
        {value?.trim() ? value : '—'}
      </p>
    </div>
  );
}

function TextSection({
  title,
  value,
  accent,
}: {
  title: string;
  value?: string | null;
  accent?: 'danger' | 'warning' | 'success';
}) {
  const accentClass =
    accent === 'danger'
      ? 'border-rose-500/30 bg-rose-500/10'
      : accent === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10'
        : accent === 'success'
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-white/10 bg-slate-950/40';

  return (
    <section className={`rounded-2xl border p-5 ${accentClass}`}>
      <h2 className="text-lg font-black text-white">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
        {value?.trim() ? value : '—'}
      </p>
    </section>
  );
}

export default function MaintenanceReportDetailPage() {
  const params = useParams();
  const idRaw = (params as { id?: string | string[] })?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : String(idRaw ?? '');

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<LoadState<ReportDetail>>({
    status: 'loading',
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
  });
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState<'approve' | 'reject' | null>(
    null,
  );

  const paths = useMemo(() => resolveCorePaths(session), [session]);

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
        `${currentPaths.reports}/${currentId}`,
      );

      if (response.code === 404) {
        setState({
          status: 'error',
          error: 'Parte de trabajo no encontrado.',
        });
        return;
      }

      if (response.code < 200 || response.code >= 300) {
        setState({
          status: 'error',
          error: getApiError(response.json, response.code),
        });
        return;
      }

      const parsed = parseDetail(response.json, currentId);

      if (!parsed) {
        setState({
          status: 'error',
          error: 'Respuesta inválida del backend.',
        });
        return;
      }

      setReviewNotes(parsed.reviewNotes ?? '');
      setState({
        status: 'ok',
        data: parsed,
      });
    },
    [],
  );

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({
        status: 'error',
        error: 'Sesión no encontrada. Inicia sesión otra vez.',
      });
      return;
    }

    if (!id) {
      setState({
        status: 'error',
        error: 'ID de parte inválido.',
      });
      return;
    }

    const activeSession = session;
    const activeId = id;

    let cancelled = false;

    async function run() {
      try {
        await loadDetail(activeSession, activeId);
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [id, loadDetail, mounted, session]);

  const report = state.status === 'ok' ? state.data : null;

  const backHref = report?.workOrderId
    ? `/work-orders/${report.workOrderId}`
    : '/maintenance-reports';

  const canReview =
    report && String(report.status ?? '').toUpperCase() === 'SUBMITTED';

  const checklistItems = useMemo(() => {
    if (!report) return [];

    return report.items.filter(
      (item) => item.type !== 'PHOTO' && item.type !== 'SIGNATURE',
    );
  }, [report]);

  const visualItems = useMemo(() => {
    if (!report) return [];

    return report.items.filter(
      (item) => item.type === 'PHOTO' || item.type === 'SIGNATURE',
    );
  }, [report]);

  async function reviewReport(approved: boolean) {
    if (!session || !id) return;

    try {
      setReviewLoading(approved ? 'approve' : 'reject');
      setActionState({
        status: 'saving',
        message: approved ? 'Aprobando parte...' : 'Rechazando parte...',
      });

      const response = await tcPost(session, `${paths.reports}/${id}/review`, {
        approved,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      if (response.code < 200 || response.code >= 300) {
        setActionState({
          status: 'error',
          message: getApiError(response.json, response.code),
        });
        return;
      }

      const parsed = parseDetail(response.json, id);

      if (parsed) {
        setState({
          status: 'ok',
          data: parsed,
        });
      } else {
        await loadDetail(session, id);
      }

      setActionState({
        status: 'success',
        message: approved
          ? 'Parte aprobado. La orden quedó finalizada.'
          : 'Parte rechazado. La orden vuelve al técnico.',
      });
    } catch (error) {
      setActionState({
        status: 'error',
        message: errMsg(error),
      });
    } finally {
      setReviewLoading(null);
    }
  }

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
        <div className="mx-auto max-w-7xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          Sesión no encontrada. Ve a{' '}
          <Link href="/login" className="font-bold underline">
            /login
          </Link>
          .
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Administración / Revisión de parte
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Detalle del parte de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Aquí administración revisa el diagnóstico, incidencias,
                recomendaciones, piezas a pedir y horas trabajadas por el técnico.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={backHref}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Volver
              </Link>

              <Link
                href="/maintenance-reports"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Lista de partes
              </Link>
            </div>
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Cargando parte...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
            {state.error}
          </section>
        ) : report ? (
          <>
            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label={`Parte: ${statusLabel(report.status)}`}
                      className={reportBadgeClass(report.status)}
                    />

                    <StatusPill
                      label={`Orden: ${workOrderStatusLabel(
                        report.workOrderStatus,
                      )}`}
                      className={workOrderBadgeClass(report.workOrderStatus)}
                    />
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-white">
                    {report.templateName ?? report.title ?? 'Parte de trabajo'}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {report.templateDesc ?? report.description ?? 'Sin descripción.'}
                  </p>
                </div>

                <div className="text-sm text-slate-400">
                  <p>
                    ID parte:{' '}
                    <span className="font-semibold text-slate-200">
                      {report.id}
                    </span>
                  </p>
                  <p className="mt-1">
                    Orden:{' '}
                    <span className="font-semibold text-slate-200">
                      {report.workOrderCode ??
                        report.workOrderTitle ??
                        report.workOrderId ??
                        '—'}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {actionState.status !== 'idle' ? (
              <section
                className={`rounded-3xl border p-5 text-sm font-semibold ${
                  actionState.status === 'error'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    : actionState.status === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                }`}
              >
                {actionState.message}
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoBox label="Cliente" value={report.customerName} emphasis />
              <InfoBox label="Email cliente" value={report.customerEmail} />
              <InfoBox label="Teléfono cliente" value={report.customerPhone} />
              <InfoBox label="Técnico" value={report.technicianName} emphasis />
              <InfoBox label="Site" value={report.siteName} emphasis />
              <InfoBox label="Dirección" value={report.siteAddress} />
              <InfoBox label="Activo / máquina" value={report.assetName} emphasis />
              <InfoBox label="Ubicación activo" value={report.assetLocation} />
              <InfoBox label="Marca" value={report.assetBrand} />
              <InfoBox label="Modelo" value={report.assetModel} />
              <InfoBox label="Código activo" value={report.assetCode} />
              <InfoBox label="Nº serie" value={report.assetSerialNumber} />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoBox label="Fecha inicio" value={formatDate(report.startedAt)} />
              <InfoBox label="Fecha envío" value={formatDate(report.submittedAt)} />
              <InfoBox label="Fecha cierre" value={formatDate(report.completedAt)} />
              <InfoBox
                label="Horas trabajadas"
                value={report.laborHours || '—'}
                emphasis
              />
            </section>

            <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6">
              <h2 className="text-xl font-black text-amber-100">
                Acción para administración
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-50">
                Revisa especialmente <strong>diagnóstico</strong>,{' '}
                <strong>incidencias</strong> y{' '}
                <strong>recomendaciones / pieza a pedir</strong>. Esa información
                es la que sirve para pedir repuestos, preparar presupuesto o
                devolver la orden al técnico.
              </p>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <TextSection
                title="Estado final del equipo"
                value={finalStatusLabel(report.summary)}
                accent={
                  String(report.summary ?? '').toUpperCase() === 'NO_OPERATIVO'
                    ? 'danger'
                    : 'success'
                }
              />

              <TextSection
                title="Diagnóstico técnico"
                value={report.diagnosis}
                accent="warning"
              />

              <TextSection
                title="Trabajo realizado"
                value={report.workPerformed}
              />

              <TextSection
                title="Incidencias encontradas"
                value={report.observations}
                accent="danger"
              />

              <div className="lg:col-span-2">
                <TextSection
                  title="Recomendaciones / pieza a pedir"
                  value={report.recommendations}
                  accent="warning"
                />
              </div>

              <div className="lg:col-span-2">
                <TextSection
                  title="Notas internas del técnico"
                  value={report.technicianNotes}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <h2 className="text-xl font-black text-white">Materiales usados</h2>
              <p className="mt-1 text-sm text-slate-400">
                Materiales que el técnico ya utilizó en esta intervención.
              </p>

              {report.materials.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                  No hay materiales añadidos.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-4">Material</th>
                        <th className="py-3 pr-4">Cantidad</th>
                        <th className="py-3 pr-4">Unidad</th>
                        <th className="py-3 pr-4">Descripción</th>
                        <th className="py-3 pr-4">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.materials.map((material, index) => (
                        <tr
                          key={material.id ?? `${material.name}-${index}`}
                          className="border-b border-white/10"
                        >
                          <td className="py-3 pr-4 font-semibold text-white">
                            {material.name || '—'}
                          </td>
                          <td className="py-3 pr-4 text-slate-200">
                            {material.quantity || '—'}
                          </td>
                          <td className="py-3 pr-4 text-slate-200">
                            {material.unit || '—'}
                          </td>
                          <td className="py-3 pr-4 text-slate-300">
                            {material.description || '—'}
                          </td>
                          <td className="py-3 pr-4 text-slate-300">
                            {material.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <h2 className="text-xl font-black text-white">Checklist técnico</h2>

              {checklistItems.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                  No hay ítems de checklist en este parte.
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {checklistItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-black text-white">
                            {item.sortOrder ? `${item.sortOrder}. ` : ''}
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-400">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <StatusPill
                          label={item.status}
                          className={
                            item.status === 'OK'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : item.status === 'FAIL'
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                : item.status === 'NA'
                                  ? 'border-slate-500/40 bg-slate-500/10 text-slate-300'
                                  : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <InfoBox label="Resultado" value={valueForItem(item)} />
                        <InfoBox label="Notas" value={item.notes} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <h2 className="text-xl font-black text-white">Evidencia visual</h2>

              {visualItems.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                  Este parte no trae ítems de foto o firma en la plantilla actual.
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {visualItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-black text-white">
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-400">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <StatusPill
                          label={item.status}
                          className={
                            item.status === 'OK'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : item.status === 'FAIL'
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                : item.status === 'NA'
                                  ? 'border-slate-500/40 bg-slate-500/10 text-slate-300'
                                  : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <InfoBox label="Referencia" value={valueForItem(item)} />
                        <InfoBox label="Notas" value={item.notes} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <h2 className="text-xl font-black text-white">Revisión del admin</h2>

              <label className="mt-5 block">
                <span className="text-sm font-bold text-slate-300">
                  Nota de revisión
                </span>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  disabled={!canReview || reviewLoading !== null}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
                  placeholder="Ejemplo: Aprobado. Pedir compresor Mitsubishi MOD. NN33NAAMT y preparar presupuesto."
                />
              </label>

              {canReview ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void reviewReport(true)}
                    disabled={reviewLoading !== null}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {reviewLoading === 'approve'
                      ? 'Aprobando...'
                      : 'Aprobar parte'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void reviewReport(false)}
                    disabled={reviewLoading !== null}
                    className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {reviewLoading === 'reject'
                      ? 'Rechazando...'
                      : 'Rechazar y devolver al técnico'}
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                  Este parte no está pendiente de revisión. Estado actual:{' '}
                  <span className="font-bold text-slate-200">
                    {statusLabel(report.status)}
                  </span>
                  .
                </div>
              )}

              {report.reviewNotes ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Última nota de revisión
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                    {report.reviewNotes}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Revisado: {formatDate(report.reviewedAt)}
                  </p>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}