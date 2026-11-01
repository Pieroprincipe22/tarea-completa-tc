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
    ? 'border-success/30 bg-success-soft text-success'
    : 'border-danger/30 bg-danger-soft text-danger';
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
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-sm font-semibold text-accent">
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
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
          {icon === 'customers' ? <BuildingIcon className="h-6 w-6" /> : null}
          {icon === 'active' ? <ShieldIcon className="h-6 w-6" /> : null}
          {icon === 'inactive' ? <UsersIcon className="h-6 w-6" /> : null}
          {icon === 'email' ? <MailIcon className="h-6 w-6" /> : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            {value}
          </p>

          <p className="mt-1 text-sm leading-6 text-muted">
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
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-muted">
            {description}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
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
      <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
        <div className="rounded-xl border border-line bg-surface p-6 text-ink-2">
          Cargando sesión…
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-warning/30 bg-warning-soft p-6">
          <h1 className="text-2xl font-semibold text-ink">Clientes</h1>

          <p className="mt-2 text-sm leading-6 text-warning">
            No hay sesión activa. Entra otra vez para ver los clientes de la
            empresa.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Ir a login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-accent/30 bg-surface p-8 ">
          <div className="absolute inset-0 " />
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                Módulo
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-ink">
                Clientes
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-ink-2">
                Consulta y organiza los clientes de la empresa para vincular
                sites, ubicaciones, activos, contratos, órdenes de trabajo y
                mantenimiento.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
                  <BuildingIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
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

        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Listado de clientes
              </h2>

              <p className="mt-1 text-sm text-muted">
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
                className="h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent/30 focus:ring-2 focus:ring-accent/25 sm:w-80"
              />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as CustomerFilter)
                }
                className="h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none transition focus:border-accent/30 focus:ring-2 focus:ring-accent/25"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>

              <Link
                href="/sites"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 px-4 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
              >
                <LocationIcon className="h-4 w-4" />
                Sites / ubicaciones
              </Link>

              <Link
                href="/customers/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 text-sm font-semibold text-accent transition hover:bg-accent-soft"
              >
                <PlusIcon className="h-4 w-4" />
                Nuevo cliente
              </Link>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="py-12 text-center text-sm text-muted">
              Cargando clientes…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && filteredCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-ink">
                No hay clientes para mostrar.
              </p>

              <p className="mt-2 text-sm text-muted">
                Crea un cliente nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
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
                      className="rounded-lg bg-surface-2 text-sm text-ink-2"
                    >
                      <td className="rounded-l-lg border-y border-l border-line px-4 py-4">
                        <div className="flex items-center gap-3">
                          <CustomerInitials name={customer.name} />

                          <div>
                            <p className="font-semibold text-ink">
                              {customer.name}
                            </p>

                            <p className="mt-1 text-xs text-subtle">
                              {customer.notes?.trim()
                                ? customer.notes
                                : 'Sin notas registradas'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="border-y border-line px-4 py-4">
                        {customer.email ?? '—'}
                      </td>

                      <td className="border-y border-line px-4 py-4">
                        {customer.phone ?? '—'}
                      </td>

                      <td className="border-y border-line px-4 py-4">
                        <span
                          className={[
                            'inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                            getStatusClass(customer),
                          ].join(' ')}
                        >
                          {getStatusLabel(customer)}
                        </span>
                      </td>

                      <td className="border-y border-line px-4 py-4">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="border-y border-line px-4 py-4 text-muted">
                        {formatDate(customer.updatedAt)}
                      </td>

                      <td className="rounded-r-lg border-y border-r border-line px-4 py-4 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex rounded-lg border border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-ink transition hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
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

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
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
            className="inline-flex rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}