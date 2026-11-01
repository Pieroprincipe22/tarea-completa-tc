'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';
import { readTcSession, resolveHomePath, type TcSession } from '@/lib/tc/session';

type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED' | string;

type AssetSite = {
  id: string;
  name: string;
  customerId?: string | null;
};

type AssetRow = {
  id: string;
  companyId?: string;
  customerId?: string | null;
  siteId?: string | null;
  name: string;
  code?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  serial?: string | null;
  internalCode?: string | null;
  status: AssetStatus;
  installationAt?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  site?: AssetSite | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

const EMPTY_ASSETS: AssetRow[] = [];

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseSite(value: unknown): AssetSite | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    customerId: asNullableStr(value.customerId),
  };
}

function parseAsset(value: unknown): AssetRow {
  if (!isRecord(value)) {
    return {
      id: '',
      name: 'Activo sin nombre',
      status: 'UNKNOWN',
    };
  }

  return {
    id: asStr(value.id),
    companyId: asStr(value.companyId) || undefined,
    customerId: asNullableStr(value.customerId),
    siteId: asNullableStr(value.siteId),
    name: asStr(value.name, 'Activo sin nombre'),
    code: asNullableStr(value.code),
    category: asNullableStr(value.category),
    brand: asNullableStr(value.brand),
    model: asNullableStr(value.model),
    serialNumber: asNullableStr(value.serialNumber),
    serial: asNullableStr(value.serial),
    internalCode: asNullableStr(value.internalCode),
    status: asStr(value.status, 'UNKNOWN'),
    installationAt: asNullableStr(value.installationAt),
    location: asNullableStr(value.location),
    notes: asNullableStr(value.notes),
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
    site: parseSite(value.site),
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getAssetCode(asset: AssetRow): string {
  return asset.code ?? asset.internalCode ?? asset.serialNumber ?? asset.serial ?? '—';
}

function getAssetTechnicalInfo(asset: AssetRow): string {
  return (
    [asset.brand, asset.model, asset.serialNumber ?? asset.serial]
      .filter(Boolean)
      .join(' · ') || 'Sin datos técnicos'
  );
}

function getAssetLocation(asset: AssetRow): string {
  const parts = [asset.site?.name, asset.location].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function getStatusLabel(status?: AssetStatus | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'INACTIVE':
      return 'Inactivo';
    case 'MAINTENANCE':
      return 'En mantenimiento';
    case 'RETIRED':
      return 'Retirado';
    default:
      return 'Sin estado';
  }
}

function getStatusClass(status?: AssetStatus | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-success/30 bg-success-soft text-success';
    case 'INACTIVE':
      return 'border-line bg-surface-2 text-muted';
    case 'MAINTENANCE':
      return 'border-warning/30 bg-warning-soft text-warning';
    case 'RETIRED':
      return 'border-danger/30 bg-danger-soft text-danger';
    default:
      return 'border-line bg-surface-2 text-muted';
  }
}

export default function AssetsPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

  const [state, setState] = useState<Load<AssetRow[]>>({ status: 'loading' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssetStatus>('ALL');

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({ status: 'ok', data: [] });
      return;
    }

    let cancelled = false;

    async function loadAssets() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(session, paths.assets);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({ status: 'error', error: `HTTP ${response.code}` });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items.map(parseAsset).filter((asset) => asset.id);

        setState({ status: 'ok', data: rows });
      } catch (error) {
        if (!cancelled) {
          setState({ status: 'error', error: errMsg(error) });
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.assets, session]);

  const assets = state.status === 'ok' ? state.data : EMPTY_ASSETS;

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set<AssetStatus>();

    assets.forEach((asset) => {
      if (asset.status) uniqueStatuses.add(asset.status);
    });

    return Array.from(uniqueStatuses);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;

      const searchableText = [
        asset.name,
        asset.code,
        asset.internalCode,
        asset.serialNumber,
        asset.serial,
        asset.category,
        asset.brand,
        asset.model,
        asset.site?.name,
        asset.location,
        asset.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [assets, search, statusFilter]);

  const activeCount = assets.filter((asset) => asset.status === 'ACTIVE').length;
  const maintenanceCount = assets.filter((asset) => asset.status === 'MAINTENANCE').length;
  const retiredCount = assets.filter((asset) => asset.status === 'RETIRED').length;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-2 px-4 py-6 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-muted">Cargando sesión...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-surface-2 px-4 py-6 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-line bg-surface p-8 shadow-sm">
          <p className="text-sm font-medium text-muted">Activos</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Sesión no encontrada</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Para ver los activos necesitas iniciar sesión y tener una empresa activa.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-2 px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Activos</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Gestión de equipos y máquinas
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Consulta los equipos registrados, su ubicación, estado operativo y datos técnicos principales.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={homePath}
                className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
              >
                Volver al dashboard
              </Link>

              <Link
                href="/assets/new"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
              >
                Nuevo activo
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Total registrados</p>
            <p className="mt-3 text-3xl font-bold text-ink">{assets.length}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Activos</p>
            <p className="mt-3 text-3xl font-bold text-success">{activeCount}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">En mantenimiento</p>
            <p className="mt-3 text-3xl font-bold text-warning">{maintenanceCount}</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Retirados</p>
            <p className="mt-3 text-3xl font-bold text-danger">{retiredCount}</p>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Listado de activos</h2>
              <p className="mt-1 text-sm text-muted">
                {filteredAssets.length} resultado{filteredAssets.length === 1 ? '' : 's'} encontrado
                {filteredAssets.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, código, ubicación..."
                className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-sm outline-none transition placeholder:text-subtle focus:border-accent sm:w-80"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | AssetStatus)}
                className="h-11 rounded-lg border border-line bg-surface px-4 text-sm outline-none transition focus:border-accent"
              >
                <option value="ALL">Todos los estados</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-muted">Cargando activos...</p>
            </div>
          ) : state.status === 'error' ? (
            <div className="p-6">
              <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
                No se pudieron cargar los activos: {state.error}
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-ink-2">No hay activos para mostrar.</p>
              <p className="mt-1 text-sm text-muted">
                Crea un activo nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="border-b border-line px-4 py-3 font-semibold">Equipo</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Código</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Categoría</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Ubicación</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Estado</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Instalación</th>
                    <th className="border-b border-line px-4 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="text-sm text-ink-2 transition hover:bg-surface-2">
                      <td className="border-b border-line px-4 py-4">
                        <div className="font-semibold text-ink">{asset.name}</div>
                        <div className="mt-1 text-xs text-muted">{getAssetTechnicalInfo(asset)}</div>
                      </td>

                      <td className="border-b border-line px-4 py-4">{getAssetCode(asset)}</td>
                      <td className="border-b border-line px-4 py-4">{asset.category ?? '—'}</td>
                      <td className="border-b border-line px-4 py-4">{getAssetLocation(asset)}</td>

                      <td className="border-b border-line px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            asset.status,
                          )}`}
                        >
                          {getStatusLabel(asset.status)}
                        </span>
                      </td>

                      <td className="border-b border-line px-4 py-4">
                        {formatDate(asset.installationAt)}
                      </td>

                      <td className="border-b border-line px-4 py-4 text-right">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-2 transition hover:bg-surface"
                        >
                          Ver detalle
                        </Link>
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