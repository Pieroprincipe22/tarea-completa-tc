'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { errMsg, isRecord, resolveCorePaths, tcGet } from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED' | string;

type AssetSite = {
  id: string;
  name: string;
  customerId?: string | null;
};

type AssetDetail = {
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

function parseAsset(value: unknown): AssetDetail {
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

function formatDateTime(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getAssetCode(asset: AssetDetail): string {
  return asset.code ?? asset.internalCode ?? asset.serialNumber ?? asset.serial ?? '—';
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
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'INACTIVE':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'MAINTENANCE':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'RETIRED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-500';
  }
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value?.trim() ? value : '—'}
      </p>
    </div>
  );
}

export default function AssetDetailPage() {
  const params = useParams();

  const assetId = useMemo(() => {
    const rawId = params?.id;

    if (Array.isArray(rawId)) return rawId[0] ?? '';
    if (typeof rawId === 'string') return rawId;

    return '';
  }, [params]);

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [state, setState] = useState<Load<AssetDetail>>({
    status: 'loading',
  });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({
        status: 'error',
        error: 'Sesión no encontrada. Inicia sesión para ver este activo.',
      });
      return;
    }

    if (!assetId) {
      setState({
        status: 'error',
        error: 'ID de activo no válido.',
      });
      return;
    }

    let cancelled = false;

    async function loadAsset() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(session, `${paths.assets}/${assetId}`);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error:
              response.code === 404
                ? 'Activo no encontrado.'
                : `No se pudo cargar el activo. HTTP ${response.code}`,
          });
          return;
        }

        const asset = parseAsset(response.json);

        if (!asset.id) {
          setState({
            status: 'error',
            error: 'La API respondió un activo sin ID.',
          });
          return;
        }

        setState({ status: 'ok', data: asset });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadAsset();

    return () => {
      cancelled = true;
    };
  }, [assetId, mounted, paths.assets, session]);

  if (!mounted || state.status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargando activo...
          </p>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Detalle de activo</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            No se pudo cargar el activo
          </h1>
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {state.error}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/assets"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a activos
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ir a login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const asset = state.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Detalle de activo
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {asset.name}
                </h1>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                    asset.status,
                  )}`}
                >
                  {getStatusLabel(asset.status)}
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta los datos técnicos, ubicación y trazabilidad básica del
                equipo registrado.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/assets"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver a activos
              </Link>

              <Link
                href={`/work-orders/new?assetId=${asset.id}`}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Crear orden
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="Código" value={getAssetCode(asset)} />
          <DetailCard label="Categoría" value={asset.category} />
          <DetailCard label="Site" value={asset.site?.name} />
          <DetailCard label="Instalación" value={formatDate(asset.installationAt)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Información técnica
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailCard label="Marca" value={asset.brand} />
              <DetailCard label="Modelo" value={asset.model} />
              <DetailCard label="Número de serie" value={asset.serialNumber ?? asset.serial} />
              <DetailCard label="Código interno" value={asset.internalCode} />
              <DetailCard label="Estado" value={getStatusLabel(asset.status)} />
              <DetailCard label="Ubicación específica" value={asset.location} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Trazabilidad
            </h2>

            <div className="mt-5 space-y-4">
              <DetailCard label="Creado" value={formatDateTime(asset.createdAt)} />
              <DetailCard label="Actualizado" value={formatDateTime(asset.updatedAt)} />
              <DetailCard label="ID del activo" value={asset.id} />
              <DetailCard label="ID del site" value={asset.siteId} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Notas</h2>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {asset.notes?.trim() ? asset.notes : 'Este activo no tiene notas registradas.'}
          </div>
        </section>
      </div>
    </main>
  );
}