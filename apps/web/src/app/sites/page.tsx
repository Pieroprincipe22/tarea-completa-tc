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
import {
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type SiteCustomer = {
  id: string;
  name: string;
};

type SiteRow = {
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

type SiteFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const EMPTY_SITES: SiteRow[] = [];

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

function parseSite(value: unknown): SiteRow {
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

function getFullAddress(site: SiteRow): string {
  const parts = [
    site.address,
    site.city,
    site.state,
    site.postalCode,
    site.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : '—';
}

function getStatusLabel(site: SiteRow): string {
  return site.isActive ? 'Activo' : 'Inactivo';
}

function getStatusClass(site: SiteRow): string {
  return site.isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-600';
}

export default function SitesPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

  const [state, setState] = useState<Load<SiteRow[]>>({
    status: 'loading',
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SiteFilter>('ALL');

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

    async function loadSites() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(session, paths.sites);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudieron cargar los sites. HTTP ${response.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items.map(parseSite).filter((site) => site.id);

        setState({ status: 'ok', data: rows });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadSites();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.sites, session]);

  const sites = state.status === 'ok' ? state.data : EMPTY_SITES;

  const filteredSites = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && site.isActive) ||
        (filter === 'INACTIVE' && !site.isActive);

      const searchableText = [
        site.name,
        site.customer?.name,
        site.address,
        site.city,
        site.state,
        site.postalCode,
        site.country,
        site.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, search, sites]);

  const activeCount = sites.filter((site) => site.isActive).length;
  const inactiveCount = sites.filter((site) => !site.isActive).length;
  const cityCount = new Set(
    sites
      .map((site) => site.city?.trim().toLowerCase())
      .filter((city): city is string => !!city),
  ).size;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargando sesión...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sites</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Sesión no encontrada
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para ver los sites necesitas iniciar sesión y tener una empresa
            activa.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Sites / ubicaciones
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Ubicaciones operativas
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Gestiona hoteles, edificios, plantas, salas técnicas, oficinas o
                centros de trabajo vinculados a cada cliente.
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
                href="/sites/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Nuevo site
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total sites
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {sites.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Activos</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Inactivos</p>
            <p className="mt-3 text-3xl font-bold text-slate-600">
              {inactiveCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Ciudades</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {cityCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Listado de sites
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredSites.length} resultado
                {filteredSites.length === 1 ? '' : 's'} encontrado
                {filteredSites.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por site, cliente, ciudad..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:w-80"
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as SiteFilter)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                Cargando sites...
              </p>
            </div>
          ) : state.status === 'error' ? (
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {state.error}
              </div>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No hay sites para mostrar.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Crea un site nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Site
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Cliente
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Dirección
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Ciudad
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Creado
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSites.map((site) => (
                    <tr
                      key={site.id}
                      className="text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-semibold text-slate-950">
                          {site.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {site.notes?.trim()
                            ? site.notes
                            : 'Sin notas operativas'}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {site.customer?.name ?? '—'}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {getFullAddress(site)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {site.city ?? '—'}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            site,
                          )}`}
                        >
                          {getStatusLabel(site)}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {formatDate(site.createdAt)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right">
                        <Link
                          href={`/sites/${site.id}`}
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