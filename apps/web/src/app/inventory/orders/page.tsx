'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { readTcSession, resolveHomePath, type TcSession } from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';

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

function getMaterialText(material: Record<string, unknown>, keys: string[]): string | null {
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
        workOrderId: asNullableStr(value.workOrderId) ?? asNullableStr(workOrder?.id),
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
        invoiceStatus: asNullableStr(rawMaterial.invoiceUrl) ? 'UPLOADED' : 'PENDING',
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

  return Number.isNaN(date.getTime()) ? input : date.toLocaleDateString('es-ES');
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
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'APPROVED':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'REJECTED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

function invoiceBadgeClass(status: MaterialOrderRow['invoiceStatus']): string {
  if (status === 'UPLOADED') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
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
          <h1 className="text-2xl font-black">Pedidos de materiales</h1>
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

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                Inventario
              </p>

              <h1 className="mt-4 text-3xl font-black">Pedidos de materiales</h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Materiales solicitados por técnicos desde los partes de trabajo.
                Aquí administración puede revisar qué se necesita pedir para
                terminar el servicio.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/inventory"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Volver a inventario
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

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Total solicitado
            </p>
            <p className="mt-3 text-3xl font-black">
              {state.status === 'ok' ? state.data.length : '—'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Pendiente factura
            </p>
            <p className="mt-3 text-3xl font-black text-amber-300">
              {state.status === 'ok' ? pendingInvoiceCount : '—'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Flujo
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Técnico solicita → Admin compra → Almacén recibe → Factura se adjunta.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por material, marca/modelo, referencia, cliente, activo o técnico"
              className="h-11 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-slate-500"
            />

            <button
              type="button"
              onClick={() => void loadOrders()}
              className="h-11 rounded-2xl border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Recargar
            </button>
          </div>

          {state.status === 'ok' ? (
            <p className="mt-4 text-sm text-slate-400">
              {filteredRows.length} pedido
              {filteredRows.length === 1 ? '' : 's'} encontrado
              {filteredRows.length === 1 ? '' : 's'}.
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          {state.status === 'loading' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              Cargando pedidos…
            </div>
          ) : state.status === 'error' ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
              {state.error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              No hay pedidos de materiales todavía. Cuando un técnico añada
              materiales en un parte, aparecerán aquí.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Material</th>
                    <th className="px-3 py-3">Cantidad</th>
                    <th className="px-3 py-3">Marca / modelo</th>
                    <th className="px-3 py-3">Referencia</th>
                    <th className="px-3 py-3">Observación</th>
                    <th className="px-3 py-3">Cliente / activo</th>
                    <th className="px-3 py-3">Técnico</th>
                    <th className="px-3 py-3">Fecha pedido</th>
                    <th className="px-3 py-3">Entrega</th>
                    <th className="px-3 py-3">Factura</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-800/80 align-top last:border-0"
                    >
                      <td className="px-3 py-4">
                        <p className="font-black text-slate-100">
                          {row.materialName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Parte: {row.reportTitle}
                        </p>

                        <span
                          className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${reportStatusBadgeClass(
                            row.reportStatus,
                          )}`}
                        >
                          {formatReportStatus(row.reportStatus)}
                        </span>
                      </td>

                      <td className="px-3 py-4 font-bold text-slate-200">
                        {formatQuantity(row.quantity, row.unit)}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.brandModel ?? 'Pendiente'}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.reference ?? 'Pendiente'}
                      </td>

                      <td className="px-3 py-4">
                        <p className="max-w-[260px] text-sm leading-6 text-slate-300">
                          {row.observation ?? 'Sin observación.'}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <p className="font-bold text-slate-200">
                          {row.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Site: {row.siteName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Activo: {row.assetName}
                        </p>
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.technicianName}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {formatDate(row.requestedAt)}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        <p>Estimada: {formatDate(row.expectedDeliveryAt)}</p>
                        <p className="mt-1">Real: {formatDate(row.deliveredAt)}</p>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${invoiceBadgeClass(
                            row.invoiceStatus,
                          )}`}
                        >
                          {row.invoiceStatus === 'UPLOADED'
                            ? 'Subida'
                            : 'Pendiente'}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/maintenance-reports/${row.reportId}`}
                            className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-black text-slate-100 hover:bg-slate-800"
                          >
                            Abrir parte
                          </Link>

                          {row.workOrderId ? (
                            <Link
                              href={`/work-orders/${row.workOrderId}`}
                              className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-black text-slate-100 hover:bg-slate-800"
                            >
                              Ver orden
                            </Link>
                          ) : null}

                          <button
                            type="button"
                            disabled
                            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-500 opacity-60"
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
          )}
        </section>
      </div>
    </main>
  );
}