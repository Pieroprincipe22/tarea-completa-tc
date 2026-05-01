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

type MaterialToOrderRow = {
  id: string;
  reportId: string;
  workOrderId?: string | null;
  reportTitle: string;
  reportStatus: string;
  customerName: string;
  siteName: string;
  assetName: string;
  technicianName: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
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

function getReportRows(value: unknown): MaterialToOrderRow[] {
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
    .map((rawMaterial, index): MaterialToOrderRow | null => {
      if (!isRecord(rawMaterial)) return null;

      const name = asStr(rawMaterial.name).trim();

      if (!name) return null;

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
        name,
        description: asNullableStr(rawMaterial.description),
        quantity: asNumber(rawMaterial.quantity, 1),
        unit: asNullableStr(rawMaterial.unit),
        notes: asNullableStr(rawMaterial.notes),
      };
    })
    .filter((row): row is MaterialToOrderRow => !!row);
}

function formatStatus(status: string): string {
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

function formatQuantity(quantity: number, unit?: string | null): string {
  const cleanQuantity = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2);

  return unit ? `${cleanQuantity} ${unit}` : cleanQuantity;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300';
    case 'APPROVED':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'REJECTED':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    case 'IN_PROGRESS':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
    case 'ASSIGNED':
      return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
}

export default function MaterialsToOrderPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [state, setState] = useState<LoadState<MaterialToOrderRow[]>>({
    status: 'loading',
  });

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homeHref = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  const loadRows = useCallback(async () => {
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

    void loadRows();
  }, [mounted, session, loadRows]);

  const filteredRows = useMemo(() => {
    if (state.status !== 'ok') return [];

    const search = searchTerm.trim().toLowerCase();

    if (!search) return state.data;

    return state.data.filter((row) =>
      [
        row.name,
        row.description ?? '',
        row.notes ?? '',
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
          <h1 className="text-2xl font-black">Materiales a pedir</h1>
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
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                Administración
              </p>
              <h1 className="mt-2 text-3xl font-black">Materiales a pedir</h1>
              <p className="mt-1 text-sm text-slate-400">
                Lista administrativa de piezas, repuestos y materiales reportados por técnicos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/maintenance-reports"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Partes de trabajo
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por material, cliente, site, activo, técnico o notas"
              className="h-11 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-slate-500"
            />

            <button
              type="button"
              onClick={() => void loadRows()}
              className="h-11 rounded-2xl border border-slate-700 px-4 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Recargar
            </button>
          </div>

          {state.status === 'ok' ? (
            <p className="mt-4 text-sm text-slate-400">
              {filteredRows.length} material
              {filteredRows.length === 1 ? '' : 'es'} encontrado
              {filteredRows.length === 1 ? '' : 's'}.
            </p>
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
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
              No hay materiales reportados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Material / pieza</th>
                    <th className="px-3 py-3">Cantidad</th>
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Site</th>
                    <th className="px-3 py-3">Activo</th>
                    <th className="px-3 py-3">Técnico</th>
                    <th className="px-3 py-3">Parte</th>
                    <th className="px-3 py-3">Estado</th>
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
                        <p className="font-black text-slate-100">{row.name}</p>

                        {row.description ? (
                          <p className="mt-1 max-w-[280px] text-xs leading-5 text-slate-400">
                            {row.description}
                          </p>
                        ) : null}

                        {row.notes ? (
                          <p className="mt-2 max-w-[280px] rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                            {row.notes}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-3 py-4 font-bold text-slate-200">
                        {formatQuantity(row.quantity, row.unit)}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.customerName}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.siteName}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.assetName}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {row.technicianName}
                      </td>

                      <td className="px-3 py-4">
                        <p className="max-w-[220px] font-bold text-slate-100">
                          {row.reportTitle}
                        </p>

                        <Link
                          href={`/maintenance-reports/${row.reportId}`}
                          className="mt-1 inline-flex text-xs font-bold text-sky-300 hover:underline"
                        >
                          Abrir parte
                        </Link>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusBadgeClass(
                            row.reportStatus,
                          )}`}
                        >
                          {formatStatus(row.reportStatus)}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-right">
                        {row.workOrderId ? (
                          <Link
                            href={`/work-orders/${row.workOrderId}`}
                            className="inline-flex rounded-xl border border-slate-600 px-3 py-2 text-xs font-black text-slate-100 hover:bg-slate-800"
                          >
                            Ver orden
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">Sin orden</span>
                        )}
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
