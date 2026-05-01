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

type CustomerRow = {
  id: string;
  companyId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type CustomerFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const EMPTY_CUSTOMERS: CustomerRow[] = [];

const futureFeatures = [
  {
    title: 'Solicitud de nuevo cliente',
    description:
      'Formulario completo para registrar cliente, contacto, condiciones, sites, plantas y datos operativos.',
  },
  {
    title: 'Ficha comercial',
    description:
      'Datos de contrato, responsable, condiciones, histórico y documentos asociados al cliente.',
  },
  {
    title: 'Mapa de ubicaciones',
    description:
      'Vista futura para ver todos los sites y ubicaciones asociadas a cada cliente.',
  },
  {
    title: 'Historial del cliente',
    description:
      'Órdenes, partes, activos, incidencias, facturas y evolución operativa por cliente.',
  },
];

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

function MailIcon(props: IconProps) {
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
      <path d="M4 6h16v12H4V6Z" />
      <path d="m4 7 8 6 8-6" />
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

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseCustomer(value: unknown): CustomerRow {
  if (!isRecord(value)) {
    return {
      id: '',
      name: 'Cliente sin nombre',
      isActive: true,
    };
  }

  return {
    id: asStr(value.id),
    companyId: asStr(value.companyId) || undefined,
    name: asStr(value.name, 'Cliente sin nombre'),
    email: asNullableStr(value.email),
    phone: asNullableStr(value.phone),
    notes: asNullableStr(value.notes),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
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

function getStatusLabel(customer: CustomerRow): string {
  return customer.isActive ? 'Activo' : 'Inactivo';
}

function getStatusClass(customer: CustomerRow): string {
  return customer.isActive
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    : 'border-rose-400/40 bg-rose-400/10 text-rose-300';
}

function CustomerInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sm font-black text-sky-300">
      {initials || 'C'}
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
  icon: 'customers' | 'active' | 'inactive' | 'email';
}) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-400">
          {icon === 'customers' ? <BuildingIcon className="h-6 w-6" /> : null}
          {icon === 'active' ? <ShieldIcon className="h-6 w-6" /> : null}
          {icon === 'inactive' ? <UsersIcon className="h-6 w-6" /> : null}
          {icon === 'email' ? <MailIcon className="h-6 w-6" /> : null}
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

export default function CustomersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

  const [state, setState] = useState<Load<CustomerRow[]>>({
    status: 'loading',
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');

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

    async function loadCustomers() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(session, paths.customers);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudieron cargar los clientes. HTTP ${response.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items
          .map(parseCustomer)
          .filter((customer) => customer.id)
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

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.customers, session]);

  const customers = state.status === 'ok' ? state.data : EMPTY_CUSTOMERS;

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && customer.isActive) ||
        (filter === 'INACTIVE' && !customer.isActive);

      const searchableText = [
        customer.name,
        customer.email,
        customer.phone,
        customer.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [customers, filter, search]);

  const activeCount = customers.filter((customer) => customer.isActive).length;
  const inactiveCount = customers.filter((customer) => !customer.isActive).length;
  const withEmailCount = customers.filter((customer) => customer.email).length;

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
          <h1 className="text-2xl font-black text-white">Clientes</h1>

          <p className="mt-2 text-sm leading-6 text-amber-100">
            No hay sesión activa. Entra otra vez para ver los clientes de la
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
                Módulo
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                Clientes
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Consulta y organiza los clientes de la empresa para vincular
                sites, ubicaciones, activos, contratos, órdenes de trabajo y
                mantenimiento.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <BuildingIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    clientes · contratos · ubicaciones · sites · activos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Clientes"
            value={customers.length}
            description="Clientes registrados en la empresa."
            icon="customers"
          />

          <MetricCard
            title="Activos"
            value={activeCount}
            description="Clientes operativos actualmente."
            icon="active"
          />

          <MetricCard
            title="Inactivos"
            value={inactiveCount}
            description="Clientes sin operación activa."
            icon="inactive"
          />

          <MetricCard
            title="Con email"
            value={withEmailCount}
            description="Clientes con contacto registrado."
            icon="email"
          />
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Listado de clientes
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredCustomers.length} resultado
                {filteredCustomers.length === 1 ? '' : 's'} encontrado
                {filteredCustomers.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente…"
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10 sm:w-80"
              />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as CustomerFilter)
                }
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>

              <Link
                href="/sites"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
              >
                <LocationIcon className="h-4 w-4" />
                Sites / ubicaciones
              </Link>

              <Link
                href="/customers/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                <PlusIcon className="h-4 w-4" />
                Nuevo cliente
              </Link>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando clientes…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && filteredCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-black text-white">
                No hay clientes para mostrar.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Crea un cliente nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Teléfono</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Creado</th>
                    <th className="px-4 py-2">Última act.</th>
                    <th className="px-4 py-2 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="rounded-2xl bg-slate-950/55 text-sm text-slate-300"
                    >
                      <td className="rounded-l-2xl border-y border-l border-slate-800 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <CustomerInitials name={customer.name} />

                          <div>
                            <p className="font-black text-white">
                              {customer.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {customer.notes?.trim()
                                ? customer.notes
                                : 'Sin notas registradas'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {customer.email ?? '—'}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {customer.phone ?? '—'}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide',
                            getStatusClass(customer),
                          ].join(' ')}
                        >
                          {getStatusLabel(customer)}
                        </span>
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="border-y border-slate-800 px-4 py-4 text-slate-400">
                        {formatDate(customer.updatedAt)}
                      </td>

                      <td className="rounded-r-2xl border-y border-r border-slate-800 px-4 py-4 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
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
              Futuras funciones de clientes
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