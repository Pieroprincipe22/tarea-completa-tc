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
      return 'border-success/30 bg-success-soft text-success';
    case 'REJECTED':
      return 'border-danger/30 bg-danger-soft text-danger';
    case 'SUBMITTED':
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'IN_PROGRESS':
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'ASSIGNED':
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'CANCELLED':
      return 'border-danger/30 bg-danger-soft text-danger';
    default:
      return 'border-warning/30 bg-warning-soft text-warning';
  }
}

function workOrderBadgeClass(status?: string | null): string {
  switch (String(status ?? '').toUpperCase()) {
    case 'PENDING':
      return 'border-special/30 bg-special-soft text-special';
    case 'DONE':
      return 'border-success/30 bg-success-soft text-success';
    case 'IN_PROGRESS':
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'CANCELLED':
    case 'CANCELED':
      return 'border-danger/30 bg-danger-soft text-danger';
    default:
      return 'border-line bg-surface-3 text-ink';
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
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={`mt-2 whitespace-pre-wrap text-sm ${
          emphasis ? 'font-semibold text-ink' : 'text-ink'
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
      ? 'border-danger/30 bg-danger-soft'
      : accent === 'warning'
        ? 'border-warning/30 bg-warning-soft'
        : accent === 'success'
          ? 'border-success/30 bg-success-soft'
          : 'border-line bg-surface-2';

  return (
    <section className={`rounded-lg border p-5 ${accentClass}`}>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">
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
  const [pdfLoading, setPdfLoading] = useState(false);

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

  async function downloadPdf() {
    if (!session || !id) return;

    setPdfLoading(true);
    try {
      const base = session.apiBase.endsWith('/')
        ? session.apiBase.slice(0, -1)
        : session.apiBase;

      const res = await fetch(`${base}${paths.reports}/${id}/pdf`, {
        headers: { 'x-company-id': session.companyId },
        credentials: 'include',
      });

      if (!res.ok) {
        setActionState({
          status: 'error',
          message: `No se pudo generar el PDF (error ${res.status}).`,
        });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Le damos tiempo a la pestaña nueva a cargar el blob antes de liberarlo.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setActionState({ status: 'error', message: errMsg(error) });
    } finally {
      setPdfLoading(false);
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
        <div className="mx-auto max-w-7xl rounded-xl border border-danger/30 bg-danger-soft p-6 text-danger">
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
    <main className="min-h-screen bg-surface-2 p-4 text-ink md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">
                Administración / Revisión de parte
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Detalle del parte de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Aquí administración revisa el diagnóstico, incidencias,
                recomendaciones, piezas a pedir y horas trabajadas por el técnico.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={backHref}
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3"
              >
                Volver
              </Link>

              <Link
                href="/maintenance-reports"
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3"
              >
                Lista de partes
              </Link>

              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={pdfLoading}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-xl border border-line bg-surface p-6 text-ink-2">
            Cargando parte...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-xl border border-danger/30 bg-danger-soft p-6 text-danger">
            {state.error}
          </section>
        ) : report ? (
          <>
            <section className="rounded-xl border border-line bg-surface p-6">
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

                  <h2 className="mt-4 text-2xl font-semibold text-ink">
                    {report.templateName ?? report.title ?? 'Parte de trabajo'}
                  </h2>

                  <p className="mt-2 text-sm text-muted">
                    {report.templateDesc ?? report.description ?? 'Sin descripción.'}
                  </p>
                </div>

                <div className="text-sm text-muted">
                  <p>
                    ID parte:{' '}
                    <span className="font-semibold text-ink">
                      {report.id}
                    </span>
                  </p>
                  <p className="mt-1">
                    Orden:{' '}
                    <span className="font-semibold text-ink">
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
                className={`rounded-xl border p-5 text-sm font-semibold ${
                  actionState.status === 'error'
                    ? 'border-danger/30 bg-danger-soft text-danger'
                    : actionState.status === 'success'
                      ? 'border-success/30 bg-success-soft text-success'
                      : 'border-accent/30 bg-accent-soft text-accent'
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

            <section className="rounded-xl border border-warning/30 bg-warning-soft p-6">
              <h2 className="text-xl font-semibold text-warning">
                Acción para administración
              </h2>
              <p className="mt-2 text-sm leading-6 text-warning">
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

            <section className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-xl font-semibold text-ink">Materiales usados</h2>
              <p className="mt-1 text-sm text-muted">
                Materiales que el técnico ya utilizó en esta intervención.
              </p>

              {report.materials.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-line p-5 text-sm text-subtle">
                  No hay materiales añadidos.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs uppercase text-subtle">
                      <tr className="border-b border-line">
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
                          className="border-b border-line"
                        >
                          <td className="py-3 pr-4 font-semibold text-ink">
                            {material.name || '—'}
                          </td>
                          <td className="py-3 pr-4 text-ink">
                            {material.quantity || '—'}
                          </td>
                          <td className="py-3 pr-4 text-ink">
                            {material.unit || '—'}
                          </td>
                          <td className="py-3 pr-4 text-ink-2">
                            {material.description || '—'}
                          </td>
                          <td className="py-3 pr-4 text-ink-2">
                            {material.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-xl font-semibold text-ink">Checklist técnico</h2>

              {checklistItems.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-line p-5 text-sm text-subtle">
                  No hay ítems de checklist en este parte.
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {checklistItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-line bg-surface-2 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {item.sortOrder ? `${item.sortOrder}. ` : ''}
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-muted">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <StatusPill
                          label={item.status}
                          className={
                            item.status === 'OK'
                              ? 'border-success/30 bg-success-soft text-success'
                              : item.status === 'FAIL'
                                ? 'border-danger/30 bg-danger-soft text-danger'
                                : item.status === 'NA'
                                  ? 'border-line-strong bg-line-strong text-ink-2'
                                  : 'border-warning/30 bg-warning-soft text-warning'
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

            <section className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-xl font-semibold text-ink">Evidencia visual</h2>

              {visualItems.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-line p-5 text-sm text-subtle">
                  Este parte no trae ítems de foto o firma en la plantilla actual.
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {visualItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-line bg-surface-2 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-muted">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <StatusPill
                          label={item.status}
                          className={
                            item.status === 'OK'
                              ? 'border-success/30 bg-success-soft text-success'
                              : item.status === 'FAIL'
                                ? 'border-danger/30 bg-danger-soft text-danger'
                                : item.status === 'NA'
                                  ? 'border-line-strong bg-line-strong text-ink-2'
                                  : 'border-warning/30 bg-warning-soft text-warning'
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

            <section className="rounded-xl border border-line bg-surface p-6">
              <h2 className="text-xl font-semibold text-ink">Revisión del admin</h2>

              <label className="mt-5 block">
                <span className="text-sm font-bold text-ink-2">
                  Nota de revisión
                </span>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  disabled={!canReview || reviewLoading !== null}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none placeholder:text-subtle disabled:opacity-60"
                  placeholder="Ejemplo: Aprobado. Pedir compresor Mitsubishi MOD. NN33NAAMT y preparar presupuesto."
                />
              </label>

              {canReview ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void reviewReport(true)}
                    disabled={reviewLoading !== null}
                    className="inline-flex items-center justify-center rounded-lg bg-success px-5 py-3 text-sm font-semibold text-white hover:bg-success/90 disabled:cursor-not-allowed disabled:bg-success/90"
                  >
                    {reviewLoading === 'approve'
                      ? 'Aprobando...'
                      : 'Aprobar parte'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void reviewReport(false)}
                    disabled={reviewLoading !== null}
                    className="inline-flex items-center justify-center rounded-lg bg-danger px-5 py-3 text-sm font-semibold text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-danger/90"
                  >
                    {reviewLoading === 'reject'
                      ? 'Rechazando...'
                      : 'Rechazar y devolver al técnico'}
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4 text-sm text-muted">
                  Este parte no está pendiente de revisión. Estado actual:{' '}
                  <span className="font-bold text-ink">
                    {statusLabel(report.status)}
                  </span>
                  .
                </div>
              )}

              {report.reviewNotes ? (
                <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-subtle">
                    Última nota de revisión
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                    {report.reviewNotes}
                  </p>
                  <p className="mt-3 text-xs text-subtle">
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