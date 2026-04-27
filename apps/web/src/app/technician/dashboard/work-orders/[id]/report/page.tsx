'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  resolveCorePaths,
  tcGet,
  tcPatch,
  tcPost,
} from '@/lib/tc/api';
import {
  isTechnicianSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

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
  status: string;
  priority?: string | null;
  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
};

type ReportMaterial = {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  sortOrder?: number | null;
};

type MaintenanceReport = {
  id: string;
  title?: string | null;
  status?: string | null;
  state?: string | null;
  summary?: string | null;
  diagnosis?: string | null;
  workPerformed?: string | null;
  recommendations?: string | null;
  observations?: string | null;
  technicianNotes?: string | null;
  laborHours?: number | string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  materials?: ReportMaterial[];
  workOrder?: WorkOrderDetail | null;
  customer?: NamedEntity | null;
  site?: NamedEntity | null;
  asset?: NamedEntity | null;
};

type ReportForm = {
  workPerformed: string;
  diagnosis: string;
  laborHours: string;
  finalStatus: string;
  incidents: string;
  recommendations: string;
  technicianNotes: string;
  materials: ReportMaterial[];
};

const FINAL_STATUS_OPTIONS = [
  {
    value: 'OPERATIVO',
    label: 'Equipo operativo',
  },
  {
    value: 'OPERATIVO_CON_OBSERVACIONES',
    label: 'Operativo con observaciones',
  },
  {
    value: 'PENDIENTE_REVISION',
    label: 'Pendiente de revisión',
  },
  {
    value: 'NO_OPERATIVO',
    label: 'No operativo',
  },
];

const EMPTY_FORM: ReportForm = {
  workPerformed: '',
  diagnosis: '',
  laborHours: '',
  finalStatus: '',
  incidents: '',
  recommendations: '',
  technicianNotes: '',
  materials: [],
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
  };
}

function unwrapWorkOrder(json: unknown): WorkOrderDetail {
  if (isRecord(json)) {
    if (isRecord(json.item)) return parseWorkOrder(json.item);
    if (isRecord(json.data)) return parseWorkOrder(json.data);
    if (isRecord(json.workOrder)) return parseWorkOrder(json.workOrder);
  }

  return parseWorkOrder(json);
}

function parseMaterial(value: unknown, index: number): ReportMaterial {
  if (!isRecord(value)) {
    return {
      name: '',
      quantity: 1,
      sortOrder: index + 1,
    };
  }

  return {
    id: asNullableStr(value.id) ?? undefined,
    name: asStr(value.name),
    description: asNullableStr(value.description),
    quantity: asNumber(value.quantity, 1),
    unit: asNullableStr(value.unit),
    notes: asNullableStr(value.notes),
    sortOrder: asNumber(value.sortOrder, index + 1),
  };
}

function parseReport(value: unknown): MaintenanceReport {
  if (!isRecord(value)) {
    return {
      id: '',
      materials: [],
    };
  }

  const materials = Array.isArray(value.materials)
    ? value.materials.map(parseMaterial)
    : [];

  return {
    id: asStr(value.id),
    title: asNullableStr(value.title),
    status: asNullableStr(value.status),
    state: asNullableStr(value.state),
    summary: asNullableStr(value.summary),
    diagnosis: asNullableStr(value.diagnosis),
    workPerformed: asNullableStr(value.workPerformed),
    recommendations: asNullableStr(value.recommendations),
    observations: asNullableStr(value.observations),
    technicianNotes: asNullableStr(value.technicianNotes),
    laborHours:
      typeof value.laborHours === 'number' || typeof value.laborHours === 'string'
        ? value.laborHours
        : null,
    startedAt: asNullableStr(value.startedAt),
    completedAt: asNullableStr(value.completedAt),
    materials,
    workOrder: parseWorkOrder(value.workOrder),
    customer: parseNamedEntity(value.customer),
    site: parseNamedEntity(value.site),
    asset: parseNamedEntity(value.asset),
  };
}

function unwrapReport(json: unknown): MaintenanceReport {
  if (isRecord(json)) {
    if (isRecord(json.item)) return parseReport(json.item);
    if (isRecord(json.data)) return parseReport(json.data);
    if (isRecord(json.report)) return parseReport(json.report);
  }

  return parseReport(json);
}

function reportToForm(report: MaintenanceReport): ReportForm {
  return {
    workPerformed: report.workPerformed ?? '',
    diagnosis: report.diagnosis ?? '',
    laborHours:
      report.laborHours === null || report.laborHours === undefined
        ? ''
        : String(report.laborHours),
    finalStatus: report.summary ?? '',
    incidents: report.observations ?? '',
    recommendations: report.recommendations ?? '',
    technicianNotes: report.technicianNotes ?? '',
    materials: report.materials?.length ? report.materials : [],
  };
}

function displayName(entity?: NamedEntity | null): string {
  if (!entity) return '—';

  return (
    entity.name?.trim() ||
    entity.code?.trim() ||
    entity.serialNumber?.trim() ||
    entity.email?.trim() ||
    entity.address?.trim() ||
    entity.location?.trim() ||
    '—'
  );
}

function statusLabel(status?: string | null): string {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'ASSIGNED':
      return 'Asignado';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'SUBMITTED':
      return 'Enviado al admin';
    case 'COMPLETED':
      return 'Completado';
    case 'APPROVED':
      return 'Aprobado';
    case 'REJECTED':
      return 'Rechazado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status || '—';
  }
}

function isClosedReport(report?: MaintenanceReport | null): boolean {
  return (
    report?.status === 'SUBMITTED' ||
    report?.status === 'COMPLETED' ||
    report?.status === 'APPROVED' ||
    report?.status === 'CANCELLED'
  );
}

function cleanMaterials(materials: ReportMaterial[]) {
  return materials
    .map((item, index) => ({
      name: item.name.trim(),
      description: item.description?.trim() || undefined,
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      unit: item.unit?.trim() || undefined,
      notes: item.notes?.trim() || undefined,
      sortOrder: index + 1,
    }))
    .filter((item) => item.name);
}

export default function TechnicianWorkOrderReportPage() {
  const router = useRouter();
  const params = useParams();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<Load<MaintenanceReport>>({
    status: 'loading',
  });
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

    async function loadReport() {
      try {
        setState({ status: 'loading' });
        setActionError(null);
        setSuccessMessage(null);

        const orderResponse = await tcGet(
          session,
          `${paths.workOrders}/${workOrderId}`,
        );

        if (cancelled) return;

        if (orderResponse.code === 404) {
          setState({
            status: 'error',
            error: 'No se encontró esta orden de trabajo.',
          });
          return;
        }

        if (orderResponse.code < 200 || orderResponse.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudo cargar la orden. HTTP ${orderResponse.code}`,
          });
          return;
        }

        const parsedOrder = unwrapWorkOrder(orderResponse.json);

        if (!parsedOrder.id) {
          setState({
            status: 'error',
            error: 'La respuesta del servidor no contiene una orden válida.',
          });
          return;
        }

        setWorkOrder(parsedOrder);

        const reportResponse = await tcPost(
          session,
          `${paths.reports}/work-order/${workOrderId}/ensure`,
        );

        if (cancelled) return;

        if (reportResponse.code < 200 || reportResponse.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudo preparar el parte de trabajo. HTTP ${reportResponse.code}`,
          });
          return;
        }

        const report = unwrapReport(reportResponse.json);

        if (!report.id) {
          setState({
            status: 'error',
            error: 'La respuesta del servidor no contiene un parte válido.',
          });
          return;
        }

        setForm(reportToForm(report));
        setState({
          status: 'ok',
          data: report,
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

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.reports, paths.workOrders, session, workOrderId]);

  function updateField<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateMaterial(
    index: number,
    key: keyof ReportMaterial,
    value: string | number,
  ) {
    setForm((current) => {
      const next = [...current.materials];

      next[index] = {
        ...next[index],
        [key]: value,
      };

      return {
        ...current,
        materials: next,
      };
    });
  }

  function addMaterial() {
    setForm((current) => ({
      ...current,
      materials: [
        ...current.materials,
        {
          name: '',
          description: '',
          quantity: 1,
          unit: '',
          notes: '',
          sortOrder: current.materials.length + 1,
        },
      ],
    }));
  }

  function removeMaterial(index: number) {
    setForm((current) => ({
      ...current,
      materials: current.materials.filter((_, idx) => idx !== index),
    }));
  }

  function validateForm(): string | null {
    if (!form.workPerformed.trim()) {
      return 'Completa el campo Trabajo realizado.';
    }

    if (!form.diagnosis.trim()) {
      return 'Completa el campo Diagnóstico.';
    }

    const laborHours = Number(form.laborHours);

    if (!Number.isFinite(laborHours) || laborHours <= 0) {
      return 'Indica las horas trabajadas. Debe ser un número mayor que 0.';
    }

    if (!form.finalStatus.trim()) {
      return 'Selecciona el estado final.';
    }

    return null;
  }

  async function saveReport(showSuccess = true): Promise<MaintenanceReport | null> {
    if (!session) {
      setActionError('Sesión no encontrada.');
      return null;
    }

    if (state.status !== 'ok') {
      setActionError('El parte todavía no está cargado.');
      return null;
    }

    const report = state.data;

    if (isClosedReport(report)) {
      setActionError('Este parte ya fue enviado o cerrado.');
      return null;
    }

    const laborHours = Number(form.laborHours);

    try {
      setSaving(true);
      setActionError(null);
      setSuccessMessage(null);

      const response = await tcPatch(session, `${paths.reports}/${report.id}`, {
        workPerformed: form.workPerformed.trim(),
        diagnosis: form.diagnosis.trim(),
        laborHours: Number.isFinite(laborHours) ? laborHours : undefined,
        summary: form.finalStatus.trim(),
        observations: form.incidents.trim() || null,
        recommendations: form.recommendations.trim() || null,
        technicianNotes: form.technicianNotes.trim() || null,
        startedAt: report.startedAt ?? new Date().toISOString(),
        materials: cleanMaterials(form.materials),
      });

      if (response.code < 200 || response.code >= 300) {
        setActionError(`No se pudo guardar el parte. HTTP ${response.code}`);
        return null;
      }

      const updatedReport = unwrapReport(response.json);

      setState({
        status: 'ok',
        data: updatedReport,
      });

      setForm(reportToForm(updatedReport));

      if (showSuccess) {
        setSuccessMessage('Parte guardado correctamente.');
      }

      return updatedReport;
    } catch (error) {
      setActionError(`No se pudo guardar el parte: ${errMsg(error)}`);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitReport() {
    const validationError = validateForm();

    if (validationError) {
      setActionError(validationError);
      return;
    }

    if (!session) {
      setActionError('Sesión no encontrada.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      setSuccessMessage(null);

      const saved = await saveReport(false);

      if (!saved) return;

      const response = await tcPost(
        session,
        `${paths.reports}/${saved.id}/finalize`,
      );

      if (response.code < 200 || response.code >= 300) {
        setActionError(`No se pudo enviar el parte. HTTP ${response.code}`);
        return;
      }

      setSuccessMessage('Parte enviado al administrador para revisión.');
      router.push(`/technician/dashboard/work-orders/${workOrderId}`);
    } catch (error) {
      setActionError(`No se pudo enviar el parte: ${errMsg(error)}`);
    } finally {
      setSubmitting(false);
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
          Para rellenar el parte necesitas iniciar sesión como técnico.
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

  const report = state.status === 'ok' ? state.data : null;
  const closed = isClosedReport(report);

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
                Parte de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Rellena el trabajo realizado antes de enviar la orden al
                administrador para revisión.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/technician/dashboard/work-orders/${workOrderId}`}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Volver al detalle
              </Link>

              <Link
                href="/technician/dashboard/work-orders"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Mis órdenes
              </Link>
            </div>
          </div>
        </header>

        {state.status === 'loading' ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            Cargando parte de trabajo...
          </section>
        ) : state.status === 'error' ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {state.error}
          </section>
        ) : report ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Orden
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {workOrder?.code || workOrder?.id || workOrderId}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {workOrder?.title || report.title || 'Orden de trabajo'}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Cliente
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {displayName(report.customer ?? workOrder?.customer)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Activo
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {displayName(report.asset ?? workOrder?.asset)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Estado del parte
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {statusLabel(report.status)}
                </p>
              </div>
            </section>

            {closed ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                Este parte ya fue enviado o cerrado. No admite edición directa.
              </section>
            ) : null}

            {actionError ? (
              <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
                {actionError}
              </section>
            ) : null}

            {successMessage ? (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                {successMessage}
              </section>
            ) : null}

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-black">Información del trabajo</h2>

              <div className="mt-6 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Trabajo realizado *
                  </span>
                  <textarea
                    value={form.workPerformed}
                    onChange={(event) =>
                      updateField('workPerformed', event.target.value)
                    }
                    disabled={closed}
                    rows={5}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="Ejemplo: Se revisó la máquina, se limpió filtro, se comprobó funcionamiento y se dejó equipo operativo."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Diagnóstico *
                  </span>
                  <textarea
                    value={form.diagnosis}
                    onChange={(event) =>
                      updateField('diagnosis', event.target.value)
                    }
                    disabled={closed}
                    rows={4}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="Ejemplo: El equipo presenta suciedad en filtros y presión correcta. No se detectan fugas."
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      Horas trabajadas *
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={form.laborHours}
                      onChange={(event) =>
                        updateField('laborHours', event.target.value)
                      }
                      disabled={closed}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                      placeholder="Ejemplo: 2.5"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      Estado final *
                    </span>
                    <select
                      value={form.finalStatus}
                      onChange={(event) =>
                        updateField('finalStatus', event.target.value)
                      }
                      disabled={closed}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">Seleccionar estado final</option>
                      {FINAL_STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Incidencias encontradas
                  </span>
                  <textarea
                    value={form.incidents}
                    onChange={(event) =>
                      updateField('incidents', event.target.value)
                    }
                    disabled={closed}
                    rows={4}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="Ejemplo: Falla tipo 2: la máquina no enfría correctamente. Se recomienda revisión posterior."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Recomendaciones
                  </span>
                  <textarea
                    value={form.recommendations}
                    onChange={(event) =>
                      updateField('recommendations', event.target.value)
                    }
                    disabled={closed}
                    rows={4}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="Ejemplo: Repetir limpieza en 30 días y revisar válvula de zona."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Observaciones internas del técnico
                  </span>
                  <textarea
                    value={form.technicianNotes}
                    onChange={(event) =>
                      updateField('technicianNotes', event.target.value)
                    }
                    disabled={closed}
                    rows={3}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="Notas internas para administración."
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black">Materiales usados</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Añade solo los materiales realmente utilizados.
                  </p>
                </div>

                {!closed ? (
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Añadir material
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                {form.materials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    No hay materiales añadidos.
                  </div>
                ) : (
                  form.materials.map((material, index) => (
                    <div
                      key={`${material.id ?? 'material'}-${index}`}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="grid gap-4 md:grid-cols-4">
                        <label className="grid gap-2 md:col-span-2">
                          <span className="text-xs font-bold uppercase text-slate-400">
                            Material
                          </span>
                          <input
                            value={material.name}
                            onChange={(event) =>
                              updateMaterial(index, 'name', event.target.value)
                            }
                            disabled={closed}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                            placeholder="Ejemplo: Filtro G4"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase text-slate-400">
                            Cantidad
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={material.quantity}
                            onChange={(event) =>
                              updateMaterial(
                                index,
                                'quantity',
                                Number(event.target.value),
                              )
                            }
                            disabled={closed}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase text-slate-400">
                            Unidad
                          </span>
                          <input
                            value={material.unit ?? ''}
                            onChange={(event) =>
                              updateMaterial(index, 'unit', event.target.value)
                            }
                            disabled={closed}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                            placeholder="ud, m, kg..."
                          />
                        </label>
                      </div>

                      <label className="mt-4 grid gap-2">
                        <span className="text-xs font-bold uppercase text-slate-400">
                          Observaciones del material
                        </span>
                        <input
                          value={material.notes ?? ''}
                          onChange={(event) =>
                            updateMaterial(index, 'notes', event.target.value)
                          }
                          disabled={closed}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                          placeholder="Detalle opcional"
                        />
                      </label>

                      {!closed ? (
                        <button
                          type="button"
                          onClick={() => removeMaterial(index)}
                          className="mt-4 text-sm font-bold text-rose-600 hover:text-rose-700"
                        >
                          Quitar material
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            {!closed ? (
              <section className="sticky bottom-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => void saveReport(true)}
                    disabled={saving || submitting}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {saving ? 'Guardando...' : 'Guardar borrador'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void submitReport()}
                    disabled={saving || submitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {submitting ? 'Enviando...' : 'Guardar y enviar al admin'}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}