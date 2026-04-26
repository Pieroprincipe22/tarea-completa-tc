'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { errMsg, isRecord, resolveCorePaths, tcGet } from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type SiteCustomer = {
  id: string;
  name: string;
};

type SiteDetail = {
  id: string;
  companyId?: string;
  customerId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: SiteCustomer | null;
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

function parseCustomer(value: unknown): SiteCustomer | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return { id, name };
}

function parseSite(value: unknown): SiteDetail {
  if (!isRecord(value)) {
    return {
      id: '',
      customerId: '',
      name: 'Site sin nombre',
      isActive: false,
    };
  }

  return {
    id: asStr(value.id),
    companyId: asStr(value.companyId) || undefined,
    customerId: asStr(value.customerId),
    name: asStr(value.name, 'Site sin nombre'),
    address: asNullableStr(value.address),
    city: asNullableStr(value.city),
    state: asNullableStr(value.state),
    postalCode: asNullableStr(value.postalCode),
    country: asNullableStr(value.country),
    notes: asNullableStr(value.notes),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
    customer: parseCustomer(value.customer),
  };
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

function getFullAddress(site: SiteDetail): string {
  const parts = [
    site.address,
    site.city,
    site.state,
    site.postalCode,
    site.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : '—';
}

function getStatusLabel(site: SiteDetail): string {
  return site.isActive ? 'Activo' : 'Inactivo';
}

function getStatusClass(site: SiteDetail): string {
  return site.isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-600';
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

export default function SiteDetailPage() {
  const params = useParams();

  const siteId = useMemo(() => {
    const rawId = params?.id;

    if (Array.isArray(rawId)) return rawId[0] ?? '';
    if (typeof rawId === 'string') return rawId;

    return '';
  }, [params]);

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [state, setState] = useState<Load<SiteDetail>>({
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
        error: 'Sesión no encontrada. Inicia sesión para ver este site.',
      });
      return;
    }

    if (!siteId) {
      setState({
        status: 'error',
        error: 'ID de site no válido.',
      });
      return;
    }

    let cancelled = false;

    async function loadSite() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(session, `${paths.sites}/${siteId}`);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error:
              response.code === 404
                ? 'Site no encontrado.'
                : `No se pudo cargar el site. HTTP ${response.code}`,
          });
          return;
        }

        const site = parseSite(response.json);

        if (!site.id) {
          setState({
            status: 'error',
            error: 'La API respondió un site sin ID.',
          });
          return;
        }

        setState({ status: 'ok', data: site });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadSite();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.sites, session, siteId]);

  if (!mounted || state.status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargando site...
          </p>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Detalle de site</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            No se pudo cargar el site
          </h1>

          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {state.error}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sites"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a sites
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

  const site = state.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Detalle de site
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {site.name}
                </h1>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                    site,
                  )}`}
                >
                  {getStatusLabel(site)}
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta la información operativa de esta ubicación, el cliente
                asociado y sus datos de trazabilidad.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/sites"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver a sites
              </Link>

              <Link
                href="/assets/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Crear activo
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="Cliente" value={site.customer?.name} />
          <DetailCard label="Ciudad" value={site.city} />
          <DetailCard label="País" value={site.country} />
          <DetailCard label="Estado" value={getStatusLabel(site)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Información de ubicación
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailCard label="Nombre" value={site.name} />
              <DetailCard label="Cliente" value={site.customer?.name} />
              <DetailCard label="Dirección completa" value={getFullAddress(site)} />
              <DetailCard label="Dirección" value={site.address} />
              <DetailCard label="Ciudad" value={site.city} />
              <DetailCard label="Provincia / Estado" value={site.state} />
              <DetailCard label="Código postal" value={site.postalCode} />
              <DetailCard label="País" value={site.country} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Trazabilidad</h2>

            <div className="mt-5 space-y-4">
              <DetailCard label="Creado" value={formatDateTime(site.createdAt)} />
              <DetailCard
                label="Actualizado"
                value={formatDateTime(site.updatedAt)}
              />
              <DetailCard label="ID del site" value={site.id} />
              <DetailCard label="ID del cliente" value={site.customerId} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Notas operativas
          </h2>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {site.notes?.trim()
              ? site.notes
              : 'Este site no tiene notas registradas.'}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Acciones relacionadas
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/assets/new"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Crear activo para este site
            </Link>

            <Link
              href="/assets"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver activos
            </Link>

            <Link
              href="/work-orders/new"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Crear orden de trabajo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}