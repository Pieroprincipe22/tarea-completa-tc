'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, resolveHomePath } from '@/lib/tc/session';

type AssetStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'UNKNOWN'
  | string;

type Asset = {
  id: string;
  code?: string | null;
  assetTag?: string | null;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status?: AssetStatus | null;
  location?: string | null;
  floor?: string | null;
  room?: string | null;
  site?: {
    id?: string;
    name?: string | null;
  } | null;
  customer?: {
    id?: string;
    name?: string | null;
  } | null;
  company?: {
    id?: string;
    name?: string | null;
  } | null;
  lastMaintenanceAt?: string | null;
  nextMaintenanceAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ApiListResponse =
  | Asset[]
  | {
      data?: Asset[];
      items?: Asset[];
      assets?: Asset[];
    };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

function getAuthHeaders(): HeadersInit {
  const session = readTcSession();
  const token =
    (session as { token?: string; accessToken?: string } | null)?.token ??
    (session as { token?: string; accessToken?: string } | null)?.accessToken;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeAssetResponse(payload: ApiListResponse): Asset[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.assets)) return payload.assets;
  return [];
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

function getAssetCode(asset: Asset): string {
  return asset.code ?? asset.assetTag ?? asset.serialNumber ?? '—';
}

function getAssetLocation(asset: Asset): string {
  const parts = [
    asset.site?.name,
    asset.location,
    asset.floor ? `Planta ${asset.floor}` : null,
    asset.room ? `Hab. ${asset.room}` : null,
  ].filter(Boolean);

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
    case 'OUT_OF_SERVICE':
      return 'Fuera de servicio';
    default:
      return 'Sin estado';
  }
}

function getStatusClass(status?: AssetStatus | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'INACTIVE':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'MAINTENANCE':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'OUT_OF_SERVICE':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-500';
  }
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssetStatus>('ALL');

  const session = readTcSession();
  const homePath = resolveHomePath(session);

  useEffect(() => {
    let isMounted = true;

    async function loadAssets() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`${API_BASE_URL}/assets`, {
          method: 'GET',
          headers: getAuthHeaders(),
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ApiListResponse;
        const normalizedAssets = normalizeAssetResponse(payload);

        if (isMounted) {
          setAssets(normalizedAssets);
        }
      } catch (error) {
        console.error('Error loading assets:', error);

        if (isMounted) {
          setErrorMessage(
            'No se pudieron cargar los activos. Revisa que la API esté levantada y que el endpoint /assets exista.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const matchesStatus =
        statusFilter === 'ALL' || asset.status === statusFilter;

      const searchableText = [
        asset.name,
        asset.code,
        asset.assetTag,
        asset.serialNumber,
        asset.type,
        asset.category,
        asset.brand,
        asset.model,
        asset.site?.name,
        asset.customer?.name,
        asset.location,
        asset.floor,
        asset.room,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [assets, search, statusFilter]);

  const activeCount = assets.filter((asset) => asset.status === 'ACTIVE').length;
  const maintenanceCount = assets.filter(
    (asset) => asset.status === 'MAINTENANCE',
  ).length;
  const outOfServiceCount = assets.filter(
    (asset) => asset.status === 'OUT_OF_SERVICE',
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Activos</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Gestión de equipos y máquinas
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta los equipos registrados, su ubicación, estado operativo
                y próximas revisiones de mantenimiento.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={homePath}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al dashboard
              </Link>

              <Link
                href="/assets/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Nuevo activo
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total registrados
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {assets.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Activos</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              En mantenimiento
            </p>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {maintenanceCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Fuera de servicio
            </p>
            <p className="mt-3 text-3xl font-bold text-rose-700">
              {outOfServiceCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Listado de activos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredAssets.length} resultado
                {filteredAssets.length === 1 ? '' : 's'} encontrado
                {filteredAssets.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, código, ubicación..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:w-80"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | AssetStatus)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
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

          {isLoading ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                Cargando activos...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {errorMessage}
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No hay activos para mostrar.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Crea un activo nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Equipo
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Código
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Tipo
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Ubicación
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Próxima revisión
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-semibold text-slate-950">
                          {asset.name ?? 'Activo sin nombre'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[asset.brand, asset.model, asset.serialNumber]
                            .filter(Boolean)
                            .join(' · ') || 'Sin datos técnicos'}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {getAssetCode(asset)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {asset.type ?? asset.category ?? '—'}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {getAssetLocation(asset)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            asset.status,
                          )}`}
                        >
                          {getStatusLabel(asset.status)}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {formatDate(asset.nextMaintenanceAt)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
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