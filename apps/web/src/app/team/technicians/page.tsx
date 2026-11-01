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
  tcGet,
  tcPatch,
} from '@/lib/tc/api';
import {
  isAdminSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type IconProps = SVGProps<SVGSVGElement>;

type TechnicianMembership = {
  id?: string;
  companyId?: string;
  role?: string;
  active?: boolean;
};

type Technician = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  specialty?: string | null;
  specialization?: string | null;
  phone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  memberships?: TechnicianMembership[];
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

const EMPTY_TECHNICIANS: Technician[] = [];

const futureFeatures = [
  {
    title: 'Especialidades avanzadas',
    description:
      'Clasificación por climatización, electricidad, fontanería, calderas, instalaciones y otros perfiles técnicos.',
  },
  {
    title: 'Disponibilidad y turnos',
    description:
      'Control de guardias, vacaciones, ausencias y disponibilidad real para asignar órdenes.',
  },
  {
    title: 'Carga de trabajo',
    description:
      'Visión del volumen de órdenes, partes abiertos y capacidad disponible por técnico.',
  },
  {
    title: 'Rendimiento técnico',
    description:
      'Medición futura de tiempos, cierres, incidencias recurrentes y calidad operativa.',
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

function CalendarIcon(props: IconProps) {
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
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 12h3" />
      <path d="M13 12h3" />
      <path d="M8 16h3" />
    </svg>
  );
}

function GaugeIcon(props: IconProps) {
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
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="M12 14l4-4" />
      <path d="M7 14h.01" />
      <path d="M17 14h.01" />
      <path d="M12 6h.01" />
    </svg>
  );
}

function WrenchIcon(props: IconProps) {
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
      <path d="M14.7 6.3a4 4 0 0 0 5 5L11 20l-5-5 8.7-8.7Z" />
      <path d="M6 15l3 3" />
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

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseMembership(value: unknown): TechnicianMembership | null {
  if (!isRecord(value)) return null;

  return {
    id: asStr(value.id) || undefined,
    companyId: asStr(value.companyId) || undefined,
    role: asStr(value.role) || undefined,
    active: asBool(value.active, false),
  };
}

function parseTechnician(value: unknown): Technician {
  if (!isRecord(value)) {
    return {
      id: '',
      name: 'Técnico sin nombre',
      email: '',
      role: 'TECHNICIAN',
      isActive: false,
      memberships: [],
    };
  }

  const memberships = Array.isArray(value.memberships)
    ? value.memberships.map(parseMembership).filter(Boolean)
    : [];

  return {
    id: asStr(value.id),
    name: asStr(value.name, 'Técnico sin nombre'),
    email: asStr(value.email),
    role: asStr(value.role, 'TECHNICIAN'),
    isActive: asBool(value.isActive, false),
    specialty: asStr(value.specialty) || null,
    specialization: asStr(value.specialization) || null,
    phone: asStr(value.phone) || null,
    createdAt: asStr(value.createdAt) || null,
    updatedAt: asStr(value.updatedAt) || null,
    memberships: memberships as TechnicianMembership[],
  };
}

function getServerMessage(json: unknown, fallback: string): string {
  if (!isRecord(json)) return fallback;

  const message = json.message;

  if (typeof message === 'string') return message;

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(', ');
  }

  return fallback;
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

function formatMonth(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function resolveSpecialty(technician: Technician): string {
  return (
    technician.specialty?.trim() ||
    technician.specialization?.trim() ||
    'Técnico general'
  );
}

function currentMembership(
  technician: Technician,
  session: TcSession | null,
): TechnicianMembership | undefined {
  return technician.memberships?.find(
    (item) => item.companyId === session?.companyId,
  );
}

function isTechnicianActive(
  technician: Technician,
  session: TcSession | null,
): boolean {
  const membership = currentMembership(technician, session);

  return technician.isActive && membership?.active !== false;
}

function getAvailability(active: boolean): string {
  return active ? 'Disponible' : 'No disponible';
}

function getWorkload(updatedAt?: string | null): string {
  if (!updatedAt) return 'Normal';

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) return 'Normal';

  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) return 'Alta';
  if (diffDays <= 30) return 'Media';

  return 'Normal';
}

function TechnicianInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-sm font-semibold text-accent">
      {initials || 'T'}
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
  icon: 'users' | 'shield' | 'calendar' | 'gauge';
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
          {icon === 'users' ? <UsersIcon className="h-6 w-6" /> : null}
          {icon === 'shield' ? <ShieldIcon className="h-6 w-6" /> : null}
          {icon === 'calendar' ? <CalendarIcon className="h-6 w-6" /> : null}
          {icon === 'gauge' ? <GaugeIcon className="h-6 w-6" /> : null}
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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
        active
          ? 'border-success/30 bg-success-soft text-success'
          : 'border-danger/30 bg-danger-soft text-danger',
      ].join(' ')}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
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

export default function TeamTechniciansPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<Load<Technician[]>>({
    status: 'loading',
  });
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const homePath = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({
        status: 'error',
        error: 'Sesión no encontrada. Inicia sesión como administrador.',
      });
      return;
    }

    if (!isAdminSession(session)) {
      setState({
        status: 'error',
        error: 'Esta sección es solo para administradores.',
      });
      return;
    }

    let cancelled = false;

    async function loadTechnicians() {
      try {
        setState({ status: 'loading' });

        const query = new URLSearchParams();
        query.set('role', 'TECHNICIAN');
        query.set('pageSize', '100');

        if (search.trim()) query.set('search', search.trim());
        if (activeFilter) query.set('active', activeFilter);

        const response = await tcGet(
          session,
          `/company-users?${query.toString()}`,
        );

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudieron cargar los técnicos. ${getServerMessage(
              response.json,
              `HTTP ${response.code}`,
            )}`,
          });
          return;
        }

        const { items } = normalizeList(response.json);
        const technicians = items
          .map(parseTechnician)
          .filter((technician) => technician.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        setState({
          status: 'ok',
          data: technicians,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadTechnicians();

    return () => {
      cancelled = true;
    };
  }, [activeFilter, mounted, refreshKey, search, session]);

  async function toggleActive(technician: Technician) {
    if (!session) {
      setMessage('Sesión no encontrada.');
      return;
    }

    const active = isTechnicianActive(technician, session);
    const endpoint = active ? 'deactivate' : 'activate';

    try {
      setActionLoadingId(technician.id);
      setMessage(null);

      const response = await tcPatch(
        session,
        `/company-users/${technician.id}/${endpoint}`,
      );

      if (response.code < 200 || response.code >= 300) {
        setMessage(
          `No se pudo actualizar el técnico. ${getServerMessage(
            response.json,
            `HTTP ${response.code}`,
          )}`,
        );
        return;
      }

      setMessage(
        active
          ? 'Técnico desactivado correctamente.'
          : 'Técnico activado correctamente.',
      );

      setRefreshKey((current) => current + 1);
    } catch (error) {
      setMessage(`No se pudo actualizar el técnico: ${errMsg(error)}`);
    } finally {
      setActionLoadingId(null);
    }
  }

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
          <h1 className="text-2xl font-semibold text-ink">Técnicos</h1>

          <p className="mt-2 text-sm leading-6 text-warning">
            No hay sesión activa. Entra otra vez para ver el listado técnico.
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

  if (!isAdminSession(session)) {
    return (
      <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
        <section className="mx-auto max-w-3xl rounded-xl border border-danger/30 bg-danger-soft p-6">
          <h1 className="text-2xl font-semibold text-ink">
            Acceso no permitido
          </h1>

          <p className="mt-2 text-sm leading-6 text-danger">
            Esta sección solo está disponible para administradores.
          </p>

          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Volver al panel
          </Link>
        </section>
      </main>
    );
  }

  const technicians = state.status === 'ok' ? state.data : EMPTY_TECHNICIANS;

  const activeTechnicians = technicians.filter((technician) =>
    isTechnicianActive(technician, session),
  );

  const inactiveTechnicians = technicians.filter(
    (technician) => !isTechnicianActive(technician, session),
  );

  const highWorkloadTechnicians = technicians.filter(
    (technician) => getWorkload(technician.updatedAt) === 'Alta',
  );

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-accent/30 bg-surface p-8 ">
          <div className="absolute inset-0 " />
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                Personal
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-ink">
                Técnicos
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-ink-2">
                Consulta el equipo técnico de la empresa, su estado operativo,
                especialidad, disponibilidad, carga de trabajo y fecha de alta
                dentro del sistema.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
                  <UsersIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
                    técnicos · disponibilidad · especialidad · carga · estado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Técnicos"
            value={technicians.length}
            description="Personal técnico registrado."
            icon="users"
          />

          <MetricCard
            title="Activos"
            value={activeTechnicians.length}
            description="Técnicos con acceso operativo."
            icon="shield"
          />

          <MetricCard
            title="Inactivos"
            value={inactiveTechnicians.length}
            description="Técnicos sin acceso activo."
            icon="calendar"
          />

          <MetricCard
            title="Carga alta"
            value={highWorkloadTechnicians.length}
            description="Actividad reciente detectada."
            icon="gauge"
          />
        </section>

        {message ? (
          <div className="rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm font-bold text-accent">
            {message}
          </div>
        ) : null}

        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Listado de técnicos
              </h2>

              <p className="mt-1 text-sm text-muted">
                Revisa técnicos activos, estado, especialidad, disponibilidad,
                carga y fechas.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar técnico…"
                className="h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent/30 focus:ring-2 focus:ring-accent/25"
              />

              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none transition focus:border-accent/30 focus:ring-2 focus:ring-accent/25"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>

              <Link
                href="/team/users/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 text-sm font-semibold text-accent transition hover:bg-accent-soft"
              >
                <PlusIcon className="h-4 w-4" />
                Alta de técnico
              </Link>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="py-12 text-center text-sm text-muted">
              Cargando técnicos…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && technicians.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-ink">
                No hay técnicos para mostrar.
              </p>

              <p className="mt-2 text-sm text-muted">
                Puedes dar de alta un técnico desde el botón superior.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && technicians.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
                    <th className="px-4 py-2">Técnico</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Especialidad</th>
                    <th className="px-4 py-2">Disponibilidad</th>
                    <th className="px-4 py-2">Carga</th>
                    <th className="px-4 py-2">Mes de alta</th>
                    <th className="px-4 py-2">Última act.</th>
                    <th className="px-4 py-2 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {technicians.map((technician) => {
                    const active = isTechnicianActive(technician, session);
                    const workload = getWorkload(technician.updatedAt);

                    return (
                      <tr
                        key={technician.id}
                        className="rounded-lg bg-surface-2 text-sm text-ink-2"
                      >
                        <td className="rounded-l-lg border-y border-l border-line px-4 py-4">
                          <div className="flex items-center gap-3">
                            <TechnicianInitials name={technician.name} />

                            <div>
                              <p className="font-semibold text-ink">
                                {technician.name}
                              </p>

                              <p className="mt-1 text-xs text-subtle">
                                {technician.email}
                              </p>

                              {technician.phone ? (
                                <p className="mt-1 text-xs text-subtle">
                                  Tel: {technician.phone}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          <StatusBadge active={active} />
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-bold text-ink-2">
                            <WrenchIcon className="h-3.5 w-3.5 text-accent" />
                            {resolveSpecialty(technician)}
                          </span>
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          {getAvailability(active)}
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          {workload}
                        </td>

                        <td className="border-y border-line px-4 py-4 capitalize">
                          {formatMonth(technician.createdAt)}
                        </td>

                        <td className="border-y border-line px-4 py-4 text-muted">
                          {formatDate(technician.updatedAt)}
                        </td>

                        <td className="rounded-r-lg border-y border-r border-line px-4 py-4 text-right">
                          <button
                            type="button"
                            disabled={actionLoadingId === technician.id}
                            onClick={() => void toggleActive(technician)}
                            className={[
                              'inline-flex rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-subtle',
                              active
                                ? 'border border-line bg-surface-2 text-ink hover:bg-surface-3'
                                : 'bg-accent text-white hover:bg-accent-hover',
                            ].join(' ')}
                          >
                            {actionLoadingId === technician.id
                              ? 'Actualizando…'
                              : active
                                ? 'Desactivar'
                                : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
              Futuras funciones del módulo técnico
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
      </div>
    </main>
  );
}