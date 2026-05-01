'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SVGProps,
} from 'react';

import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';
import {
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type IconProps = SVGProps<SVGSVGElement>;

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type MaterialOrderRow = {
  id: string;
  reportId: string;
  workOrderId?: string | null;
  reportTitle: string;
  reportStatus: string;
  customerName: string;
  siteName: string;
  assetName: string;
  technicianName: string;
  materialName: string;
  quantity: number;
  unit?: string | null;
  brandModel?: string | null;
  reference?: string | null;
  observation?: string | null;
  requestedAt?: string | null;
  expectedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  invoiceStatus: 'PENDING' | 'UPLOADED';
};

function ClipboardIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function BoxIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function InvoiceIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function RefreshIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m21 21-4.3-4.3" />
      <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 12h3" />
      <path d="M13 12h3" />
      <path d="M8 16h3" />
    </svg>
  );
}

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getEntityName(value: unknown): string {
  if (!isRecord(value)) return '—';

  return asStr(value.name, '—');
}

function getMaterialText(
  material: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = asNullableStr(material[key]);

    if (value) return value;
  }

  return null;
}

function getReportRows(value: unknown): MaterialOrderRow[] {
  if (!isRecord(value)) return [];

  const reportId = asStr(value.id);

  if (!reportId) return [];

  const materials = Array.isArray(value.materials) ? value.materials : [];

  const workOrder = isRecord(value.workOrder) ? value.workOrder : null;
  const customer = isRecord(value.customer) ? value.customer : null;
  const site = isRecord(value.site) ? value.site : null;
  const asset = isRecord(value.asset) ? value.asset : null;
  const technician = isRecord(value.assignedTechnician)
    ? value.assignedTechnician
    : null;

  const reportTitle =
    asNullableStr(value.title) ??
    asNullableStr(value.templateName) ??
    asNullableStr(workOrder?.title) ??
    'Parte de trabajo';

  return materials
    .map((rawMaterial, index): MaterialOrderRow | null => {
      if (!isRecord(rawMaterial)) return null;

      const materialName = asStr(rawMaterial.name).trim();

      if (!materialName) return null;

      return {
        id: asStr(rawMaterial.id, `${reportId}-${index}`),
        reportId,
        workOrderId:
          asNullableStr(value.workOrderId) ?? asNullableStr(workOrder?.id),
        reportTitle,
        reportStatus: asStr(value.status, '—'),
        customerName: getEntityName(customer),
        siteName: getEntityName(site),
        assetName: getEntityName(asset),
        technicianName: getEntityName(technician),
        materialName,
        quantity: asNumber(rawMaterial.quantity, 1),
        unit: asNullableStr(rawMaterial.unit),
        brandModel: getMaterialText(rawMaterial, [
          'brandModel',
          'brand',
          'model',
          'manufacturer',
        ]),
        reference: getMaterialText(rawMaterial, [
          'reference',
          'sku',
          'partNumber',
          'code',
        ]),
        observation: getMaterialText(rawMaterial, [
          'notes',
          'observation',
          'description',
        ]),
        requestedAt: asNullableStr(rawMaterial.requestedAt),
        expectedDeliveryAt: asNullableStr(rawMaterial.expectedDeliveryAt),
        deliveredAt: asNullableStr(rawMaterial.deliveredAt),
        invoiceStatus: asNullableStr(rawMaterial.invoiceUrl)
          ? 'UPLOADED'
          : 'PENDING',
      };
    })
    .filter((row): row is MaterialOrderRow => !!row);
}

function formatQuantity(quantity: number, unit?: string | null): string {
  const cleanQuantity = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2);

  return unit ? `${cleanQuantity} ${unit}` : cleanQuantity;
}

function formatDate(input?: string | null): string {
  if (!input) return 'Pendiente';

  const date = new Date(input);

  return Number.isNaN(date.getTime())
    ? input
    : date.toLocaleDateString('es-ES');
}

function formatReportStatus(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'ASSIGNED':
      return 'Asignado';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'SUBMITTED':
      return 'Enviado';
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

function reportStatusBadgeClass(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'border-sky-400/40 bg-sky-400/10 text-sky-300';
    case 'APPROVED':
      return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';
    case 'REJECTED':
      return 'border-rose-400/40 bg-rose-400/10 text-rose-300';
    case 'IN_PROGRESS':
      return 'border-blue-400/40 bg-blue-400/10 text-blue-300';
    default:
      return 'border-slate-700/80 bg-slate-950/70 text-slate-300';
  }
}

function invoiceBadgeClass(status: MaterialOrderRow['invoiceStatus']): string {
  if (status === 'UPLOADED') {
    return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';
  }

  return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone = 'default',
}: {
  title: string;
  value: number | string;
  description: string;
  icon: 'orders' | 'invoice' | 'calendar';
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-400">
          {icon === 'orders' ? <BoxIcon className="h-6 w-6" /> : null}
          {icon === 'invoice' ? <InvoiceIcon className="h-6 w-6" /> : null}
          {icon === 'calendar' ? <CalendarIcon className="h-6 w-6" /> : null}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>

          <p
            className={[
              'mt-2 text-3xl font-black tracking-tight',
              tone === 'warning' ? 'text-amber-200' : 'text-white',
            ].join(' ')}
          >
            {value}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InventoryOrdersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [state, setState] = useState<LoadState<MaterialOrderRow[]>>({
    status: 'loading',
  });

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homeHref = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  const loadOrders = useCallback(async () => {
    if (!session) return;

    try {
      setState({ status: 'loading' });

      const response = await tcGet(session, paths.reports);

      if (response.code < 200 || response.code >= 300) {
        setState({
          status: 'error',
          error: `HTTP ${response.code}`,
        });
        return;
      }

      const { items } = normalizeList(response.json);
      const rows = items.flatMap(getReportRows);

      setState({
        status: 'ok',
        data: rows,
      });
    } catch (error) {
      setState({
        status: 'error',
        error: errMsg(error),
      });
    }
  }, [session, paths.reports]);

  useEffect(() => {
    if (!mounted || !session) return;

    void loadOrders();
  }, [mounted, session, loadOrders]);

  const filteredRows = useMemo(() => {
    if (state.status !== 'ok') return [];

    const search = searchTerm.trim().toLowerCase();

    if (!search) return state.data;

    return state.data.filter((row) =>
      [
        row.materialName,
        row.brandModel ?? '',
        row.reference ?? '',
        row.observation ?? '',
        row.customerName,
        row.siteName,
        row.assetName,
        row.technicianName,
        row.reportTitle,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [state, searchTerm]);

  const pendingInvoiceCount = useMemo(() => {
    if (state.status !== 'ok') return 0;

    return state.data.filter((row) => row.invoiceStatus === 'PENDING').length;
  }, [state]);

  const uploadedInvoiceCount = useMemo(() => {
    if (state.status !== 'ok') return 0;

    return state.data.filter((row) => row.invoiceStatus === 'UPLOADED').length;
  }, [state]);

  if (!mounted) {
    return (
      <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
          Cargando sesión…
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h1 className="text-2xl font-black text-white">
            Pedidos de materiales
          </h1>

          <p className="mt-2 text-sm leading-6 text-amber-100">
            No hay sesión activa. Entra otra vez para revisar los pedidos de
            materiales.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-400"
          >
            Ir a login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/40 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%)]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.07)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Inventario
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                Pedidos
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Revisa los materiales solicitados por técnicos desde los partes
                de trabajo: cantidad, marca/modelo, referencia, observaciones,
                fechas de pedido, entrega y factura.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <ClipboardIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Flujo correcto
                  </p>

                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    técnico solicita → admin compra → almacén recibe → factura
                    se adjunta
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Solicitudes"
            value={state.status === 'ok' ? state.data.length : '—'}
            description="Materiales detectados desde partes técnicos."
            icon="orders"
          />

          <MetricCard
            title="Pendiente factura"
            value={state.status === 'ok' ? pendingInvoiceCount : '—'}
            description="Pedidos sin factura asociada todavía."
            icon="invoice"
            tone="warning"
          />

          <MetricCard
            title="Factura subida"
            value={state.status === 'ok' ? uploadedInvoiceCount : '—'}
            description="Materiales con comprobante registrado."
            icon="invoice"
          />

          <MetricCard
            title="Seguimiento"
            value="Activo"
            description="Control administrativo del pedido y entrega."
            icon="calendar"
          />
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Pedidos de materiales
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Listado generado desde los materiales añadidos en los partes de
                trabajo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar pedido…"
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 pl-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10 sm:w-[360px]"
                />
              </div>

              <button
                type="button"
                onClick={() => void loadOrders()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                <RefreshIcon className="h-4 w-4" />
                Recargar
              </button>

              <Link
                href={homeHref}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {state.status === 'ok' ? (
            <p className="mt-5 text-sm text-slate-400">
              {filteredRows.length} pedido
              {filteredRows.length === 1 ? '' : 's'} encontrado
              {filteredRows.length === 1 ? '' : 's'}.
            </p>
          ) : null}

          {state.status === 'loading' ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/55 p-8 text-center text-sm text-slate-400">
              Cargando pedidos…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-100">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && filteredRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/55 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                <ClipboardIcon className="h-8 w-8" />
              </div>

              <p className="mt-5 text-lg font-black text-white">
                No hay pedidos de materiales todavía.
              </p>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Cuando un técnico añada materiales en un parte de trabajo,
                aparecerán aquí para que administración pueda revisar qué se
                debe comprar o preparar desde almacén.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && filteredRows.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1380px] border-separate border-spacing-y-3 text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-2">Material</th>
                    <th className="px-4 py-2">Cantidad</th>
                    <th className="px-4 py-2">Marca / modelo</th>
                    <th className="px-4 py-2">Referencia</th>
                    <th className="px-4 py-2">Observación</th>
                    <th className="px-4 py-2">Cliente / activo</th>
                    <th className="px-4 py-2">Técnico</th>
                    <th className="px-4 py-2">Fecha pedido</th>
                    <th className="px-4 py-2">Entrega</th>
                    <th className="px-4 py-2">Factura</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="rounded-2xl bg-slate-950/55 text-slate-300"
                    >
                      <td className="rounded-l-2xl border-y border-l border-slate-800 px-4 py-4 align-top">
                        <p className="font-black text-white">
                          {row.materialName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Parte: {row.reportTitle}
                        </p>

                        <span
                          className={[
                            'mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide',
                            reportStatusBadgeClass(row.reportStatus),
                          ].join(' ')}
                        >
                          {formatReportStatus(row.reportStatus)}
                        </span>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top font-black text-slate-200">
                        {formatQuantity(row.quantity, row.unit)}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        {row.brandModel ?? 'Pendiente'}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        {row.reference ?? 'Pendiente'}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        <p className="max-w-[260px] leading-6">
                          {row.observation ?? 'Sin observación.'}
                        </p>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        <p className="font-black text-slate-200">
                          {row.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Site: {row.siteName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Activo: {row.assetName}
                        </p>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        {row.technicianName}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        {formatDate(row.requestedAt)}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        <p>Estimada: {formatDate(row.expectedDeliveryAt)}</p>
                        <p className="mt-1">
                          Real: {formatDate(row.deliveredAt)}
                        </p>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 align-top">
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide',
                            invoiceBadgeClass(row.invoiceStatus),
                          ].join(' ')}
                        >
                          {row.invoiceStatus === 'UPLOADED'
                            ? 'Subida'
                            : 'Pendiente'}
                        </span>
                      </td>

                      <td className="rounded-r-2xl border-y border-r border-slate-800 px-4 py-4 align-top text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/maintenance-reports/${row.reportId}`}
                            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
                          >
                            Abrir parte
                          </Link>

                          {row.workOrderId ? (
                            <Link
                              href={`/work-orders/${row.workOrderId}`}
                              className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
                            >
                              Ver orden
                            </Link>
                          ) : null}

                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-500 opacity-60"
                            title="Se conectará cuando creemos el modelo de pedidos y adjuntos."
                          >
                            Subir factura
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}