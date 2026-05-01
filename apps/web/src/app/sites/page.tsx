'use client';

import Link from 'next/link';
import {
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

const futureFeatures = [
  {
    title: 'Plantas y zonas',
    description:
      'División por plantas, habitaciones, salas técnicas, zonas comunes y áreas operativas.',
  },
  {
    title: 'Checklist por ubicación',
    description:
      'Checklist específico por site, planta o habitación para mantenimiento preventivo.',
  },
  {
    title: 'Activos instalados',
    description:
      'Relación directa entre cada ubicación y sus máquinas, equipos o instalaciones.',
  },
  {
    title: 'Mapa operativo',
    description:
      'Vista futura con distribución de ubicaciones, clientes, sites y activos.',
  },
];

function LocationIcon(props: IconProps) {
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
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <path d="M12 10.5h.01" />
    </svg>
  );
}

function BuildingIcon(props: IconProps) {
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
      <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" />
      <path d="M17 9h1a2 2 0 0 1 2 2v10" />
      <path d="M8 7h5" />
      <path d="M8 11h5" />
      <path d="M8 15h5" />
      <path d="M3 21h18" />
    </svg>
  );
}

function ShieldIcon(props: IconProps) {
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
      <path d="M12 22s8-4 8-10V5.5L12 2 4 5.5V12c0 6 8 10 8 10Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  );
}

function CityIcon(props: IconProps) {
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
      <path d="M3 21h18" />
      <path d="M5 21V7h6v14" />
      <path d="M13 21V3h6v18" />
      <path d="M7.5 10h1" />
      <path d="M7.5 14h1" />
      <path d="M15.5 7h1" />
      <path d="M15.5 11h1" />
      <path d="M15.5 15h1" />
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
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
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      <path d="M18 8.5a3 3 0 0 1 2.5 3" />
      <path d="M20.5 19a5 5 0 0 0-3-4.5" />
    </svg>
  );
}

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
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    : 'border-rose-400/40 bg-rose-400/10 text-rose-300';
}

function SiteInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sm font-black text-sky-300">
      {initials || 'S'}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: 'sites' | 'active' | 'inactive' | 'city';
}) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-400">
          {icon === 'sites' ? <BuildingIcon className="h-6 w-6" /> : null}
          {icon === 'active' ? <ShieldIcon className="h-6 w-6" /> : null}
          {icon === 'inactive' ? <UsersIcon className="h-6 w-6" /> : null}
          {icon === 'city' ? <CityIcon className="h-6 w-6" /> : null}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-white">
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

function ComingSoonCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/40 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.20)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight text-white">
            {title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
          Próximo
        </span>
      </div>
    </div>
  );
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
        const rows = items
          .map(parseSite)
          .filter((site) => site.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

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
            Sites / ubicaciones
          </h1>

          <p className="mt-2 text-sm leading-6 text-amber-100">
            No hay sesión activa. Entra otra vez para ver las ubicaciones de la
            empresa.
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
                Clientes
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                Sites / ubicaciones
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Gestiona hoteles, edificios, plantas, salas técnicas, oficinas o
                centros de trabajo vinculados a cada cliente.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <LocationIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    sites · ubicaciones · plantas · zonas · cliente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Sites"
            value={sites.length}
            description="Ubicaciones registradas."
            icon="sites"
          />

          <MetricCard
            title="Activos"
            value={activeCount}
            description="Ubicaciones operativas."
            icon="active"
          />

          <MetricCard
            title="Inactivos"
            value={inactiveCount}
            description="Ubicaciones sin operación activa."
            icon="inactive"
          />

          <MetricCard
            title="Ciudades"
            value={cityCount}
            description="Ciudades con ubicaciones."
            icon="city"
          />
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Listado de sites
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredSites.length} resultado
                {filteredSites.length === 1 ? '' : 's'} encontrado
                {filteredSites.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar site…"
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10 sm:w-80"
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as SiteFilter)}
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>

              <Link
                href="/customers"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
              >
                Ver clientes
              </Link>

              <Link
                href="/sites/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                <PlusIcon className="h-4 w-4" />
                Nuevo site
              </Link>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando sites…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && filteredSites.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-black text-white">
                No hay sites para mostrar.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Crea un site nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && filteredSites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-2">Site</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Dirección</th>
                    <th className="px-4 py-2">Ciudad</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Creado</th>
                    <th className="px-4 py-2">Última act.</th>
                    <th className="px-4 py-2 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSites.map((site) => (
                    <tr
                      key={site.id}
                      className="rounded-2xl bg-slate-950/55 text-sm text-slate-300"
                    >
                      <td className="rounded-l-2xl border-y border-l border-slate-800 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <SiteInitials name={site.name} />

                          <div>
                            <p className="font-black text-white">
                              {site.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {site.notes?.trim()
                                ? site.notes
                                : 'Sin notas operativas'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {site.customer?.name ?? '—'}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {getFullAddress(site)}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {site.city ?? '—'}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide',
                            getStatusClass(site),
                          ].join(' ')}
                        >
                          {getStatusLabel(site)}
                        </span>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {formatDate(site.createdAt)}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 text-slate-400">
                        {formatDate(site.updatedAt)}
                      </td>

                      <td className="rounded-r-2xl border-y border-r border-slate-800 px-4 py-4 text-right">
                        <Link
                          href={`/sites/${site.id}`}
                          className="inline-flex rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-xs font-black text-slate-200 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Futuras funciones de ubicaciones
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {futureFeatures.map((item) => (
              <ComingSoonCard
                key={item.title}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Link
            href={homePath}
            className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-2 text-sm font-black text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}