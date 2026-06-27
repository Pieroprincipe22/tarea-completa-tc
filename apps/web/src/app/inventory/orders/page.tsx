'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SVGProps,
} from 'react';

import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

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

type MetricTone = 'blue' | 'violet' | 'amber' | 'cyan' | 'emerald' | 'rose';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function ClipboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function CubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function InvoiceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m21 21-4.3-4.3" />
      <path d="M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z" />
    </svg>
  );
}

function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 11a8 8 0 0 0-14.8-4" />
      <path d="M4 5v5h5" />
      <path d="M4 13a8 8 0 0 0 14.8 4" />
      <path d="M20 19v-5h-5" />
    </svg>
  );
}

function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function getToneClasses(tone: MetricTone) {
  if (tone === 'violet') {
    return 'border-violet-400/30 bg-violet-500/15 text-violet-300';
  }

  if (tone === 'amber') {
    return 'border-amber-400/30 bg-amber-500/15 text-amber-300';
  }

  if (tone === 'cyan') {
    return 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300';
  }

  if (tone === 'emerald') {
    return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300';
  }

  if (tone === 'rose') {
    return 'border-rose-400/30 bg-rose-500/15 text-rose-300';
  }

  return 'border-blue-400/30 bg-blue-600/20 text-blue-300';
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
      return 'bg-blue-600/20 text-blue-300';
    case 'APPROVED':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'REJECTED':
      return 'bg-rose-500/15 text-rose-300';
    case 'IN_PROGRESS':
      return 'bg-cyan-500/15 text-cyan-300';
    default:
      return 'bg-slate-800 text-slate-300';
  }
}

function invoiceBadgeClass(status: MaterialOrderRow['invoiceStatus']): string {
  if (status === 'UPLOADED') {
    return 'bg-emerald-500/15 text-emerald-300';
  }

  return 'bg-amber-500/15 text-amber-300';
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
  tone: MetricTone;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
      <div className="flex items-start gap-4">
        <div
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
            getToneClasses(tone),
          )}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-300">{title}</p>

          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {value}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: MetricTone;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          getToneClasses(tone),
        )}
      >
        <ClipboardIcon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
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
      <main className="min-h-[calc(100vh-74px)] bg-[#080f1d] p-6 text-slate-100">
        Cargando pedidos…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-74px)] bg-[#080f1d] p-6 text-slate-100">
        <section className="mx-auto max-w-3xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h1 className="text-2xl font-black text-white">
            Pedidos de materiales
          </h1>

          <p className="mt-2 text-sm leading-6 text-amber-100">
            No hay sesión activa. Entra otra vez para revisar los pedidos.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500"
          >
            Ir a login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#080f1d] px-6 py-6 text-slate-100">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-600/20 text-blue-300 shadow-[0_0_35px_rgba(37,99,235,0.20)]">
              <ClipboardIcon className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                Pedidos
              </h1>

              <p className="mt-2 text-base text-slate-400">
                Revisa materiales solicitados desde partes técnicos, entregas y facturas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0c1728] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-blue-400/50 hover:bg-blue-600/10"
            >
              Volver a inventario
            </Link>

            <button
              type="button"
              disabled
              title="Se conectará cuando creemos el flujo manual de pedidos."
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-blue-600/50 px-5 py-3 text-sm font-black text-white opacity-70"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo pedido
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Solicitudes"
            value={state.status === 'ok' ? state.data.length : '—'}
            description="Materiales detectados desde partes técnicos."
            icon={<CubeIcon className="h-7 w-7" />}
            tone="blue"
          />

          <MetricCard
            title="Pendiente factura"
            value={state.status === 'ok' ? pendingInvoiceCount : '—'}
            description="Pedidos sin factura asociada todavía."
            icon={<InvoiceIcon className="h-7 w-7" />}
            tone="amber"
          />

          <MetricCard
            title="Factura subida"
            value={state.status === 'ok' ? uploadedInvoiceCount : '—'}
            description="Materiales con comprobante registrado."
            icon={<InvoiceIcon className="h-7 w-7" />}
            tone="emerald"
          />

          <MetricCard
            title="Seguimiento"
            value="Activo"
            description="Control administrativo de pedido y entrega."
            icon={<CalendarIcon className="h-7 w-7" />}
            tone="cyan"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
            <div className="flex flex-col gap-4 border-b border-slate-800/90 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Pedidos de materiales
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Listado generado desde materiales añadidos en partes de trabajo.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar pedido..."
                    className="h-11 w-full rounded-xl border border-slate-700 bg-[#080f1d] pl-11 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#080f1d] px-4 text-sm font-bold text-slate-300 transition hover:border-blue-400/50 hover:text-white"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filtros
                </button>

                <button
                  type="button"
                  onClick={() => void loadOrders()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#080f1d] px-4 text-sm font-bold text-slate-300 transition hover:border-blue-400/50 hover:text-white"
                >
                  <RefreshIcon className="h-4 w-4" />
                  Recargar
                </button>
              </div>
            </div>

            {state.status === 'loading' ? (
              <div className="p-10 text-center text-sm text-slate-400">
                Cargando pedidos…
              </div>
            ) : null}

            {state.status === 'error' ? (
              <div className="m-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-100">
                {state.error}
              </div>
            ) : null}

            {state.status === 'ok' && filteredRows.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-600/20 text-blue-300">
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
              <div className="overflow-x-auto">
                <table className="min-w-[1280px] text-left">
                  <thead className="bg-[#101c30] text-sm text-slate-300">
                    <tr>
                      <th className="px-5 py-4 font-black">Material</th>
                      <th className="px-5 py-4 font-black">Cantidad</th>
                      <th className="px-5 py-4 font-black">Marca / modelo</th>
                      <th className="px-5 py-4 font-black">Referencia</th>
                      <th className="px-5 py-4 font-black">Cliente / activo</th>
                      <th className="px-5 py-4 font-black">Técnico</th>
                      <th className="px-5 py-4 font-black">Entrega</th>
                      <th className="px-5 py-4 font-black">Factura</th>
                      <th className="px-5 py-4 font-black">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-800/80 text-sm text-slate-300"
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="font-black text-white">
                            {row.materialName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Parte: {row.reportTitle}
                          </p>

                          <span
                            className={cx(
                              'mt-3 inline-flex rounded-lg px-3 py-1 text-xs font-black',
                              reportStatusBadgeClass(row.reportStatus),
                            )}
                          >
                            {formatReportStatus(row.reportStatus)}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top font-black text-white">
                          {formatQuantity(row.quantity, row.unit)}
                        </td>

                        <td className="px-5 py-4 align-top">
                          {row.brandModel ?? 'Pendiente'}
                        </td>

                        <td className="px-5 py-4 align-top">
                          {row.reference ?? 'Pendiente'}
                        </td>

                        <td className="px-5 py-4 align-top">
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

                        <td className="px-5 py-4 align-top">
                          {row.technicianName}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <p>Estimada: {formatDate(row.expectedDeliveryAt)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Real: {formatDate(row.deliveredAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <span
                            className={cx(
                              'inline-flex rounded-lg px-3 py-1 text-xs font-black',
                              invoiceBadgeClass(row.invoiceStatus),
                            )}
                          >
                            {row.invoiceStatus === 'UPLOADED'
                              ? 'Subida'
                              : 'Pendiente'}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex gap-2">
                            <Link
                              href={`/maintenance-reports/${row.reportId}`}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-[#080f1d] text-slate-300 transition hover:border-blue-400/50 hover:text-blue-300"
                              aria-label="Abrir parte"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>

                            {row.workOrderId ? (
                              <Link
                                href={`/work-orders/${row.workOrderId}`}
                                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-700 bg-[#080f1d] px-3 text-xs font-black text-slate-300 transition hover:border-blue-400/50 hover:text-blue-300"
                              >
                                Orden
                                <ArrowIcon className="h-3 w-3" />
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {state.status === 'ok' && filteredRows.length > 0 ? (
              <div className="flex flex-col gap-4 border-t border-slate-800/80 p-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
                <span>
                  Mostrando {filteredRows.length} pedido
                  {filteredRows.length === 1 ? '' : 's'}.
                </span>

                <span className="rounded-lg border border-slate-800 px-3 py-2 text-slate-500">
                  Vista administrativa
                </span>
              </div>
            ) : null}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
              <h2 className="text-lg font-black text-white">
                Flujo de pedido
              </h2>

              <div className="mt-6 space-y-5">
                <ActivityRow
                  title="1. Técnico solicita"
                  description="El material se añade desde el parte técnico."
                  tone="blue"
                />

                <ActivityRow
                  title="2. Administración revisa"
                  description="Se valida cantidad, marca, modelo y referencia."
                  tone="violet"
                />

                <ActivityRow
                  title="3. Compra / almacén"
                  description="Se compra o se prepara desde stock existente."
                  tone="amber"
                />

                <ActivityRow
                  title="4. Factura y entrega"
                  description="Se registra entrega y se adjunta comprobante."
                  tone="emerald"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
              <h2 className="text-lg font-black text-white">
                Acciones rápidas
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/inventory/warehouse"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver almacén
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/purchases"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver compras
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/movements"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver movimientos
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}