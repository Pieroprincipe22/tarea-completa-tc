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

type CompanyUserRole = 'ADMIN' | 'TECHNICIAN' | 'SUPER_ADMIN' | string;

type CompanyUserMembership = {
  id?: string;
  companyId?: string;
  role?: CompanyUserRole;
  active?: boolean;
  company?: {
    id?: string;
    name?: string | null;
    slug?: string | null;
    isActive?: boolean;
  } | null;
};

type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: CompanyUserRole;
  companyId?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  memberships?: CompanyUserMembership[];
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

const EMPTY_USERS: CompanyUser[] = [];

const futureFeatures = [
  {
    title: 'Permisos personalizados',
    description:
      'Permisos por módulo para decidir qué puede ver, crear, editar o aprobar cada usuario.',
  },
  {
    title: 'Historial de accesos',
    description:
      'Registro futuro de entradas, cambios de rol, activaciones, bloqueos y acciones críticas.',
  },
  {
    title: 'Invitación por correo',
    description:
      'Alta de usuario con invitación automática, contraseña temporal y activación segura.',
  },
  {
    title: 'Perfiles avanzados',
    description:
      'Datos de puesto, departamento, responsable, teléfono, firma y preferencias internas.',
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

function KeyIcon(props: IconProps) {
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
      <path d="M14.5 9.5a5 5 0 1 1-2.2-4.1" />
      <path d="M14 6h7v4h-3v3h-4v-3h-2" />
      <path d="M7 14h.01" />
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

function normalizeRole(role?: string | null): string {
  return String(role ?? '').trim().toUpperCase();
}

function parseMembership(value: unknown): CompanyUserMembership | null {
  if (!isRecord(value)) return null;

  return {
    id: asStr(value.id) || undefined,
    companyId: asStr(value.companyId) || undefined,
    role: asStr(value.role) || undefined,
    active: asBool(value.active, false),
    company: isRecord(value.company)
      ? {
          id: asStr(value.company.id) || undefined,
          name: asStr(value.company.name) || null,
          slug: asStr(value.company.slug) || null,
          isActive: asBool(value.company.isActive, false),
        }
      : null,
  };
}

function parseCompanyUser(value: unknown): CompanyUser {
  if (!isRecord(value)) {
    return {
      id: '',
      name: 'Usuario sin nombre',
      email: '',
      role: 'ADMIN',
      isActive: false,
      memberships: [],
    };
  }

  const memberships = Array.isArray(value.memberships)
    ? value.memberships.map(parseMembership).filter(Boolean)
    : [];

  return {
    id: asStr(value.id),
    name: asStr(value.name, 'Usuario sin nombre'),
    email: asStr(value.email),
    role: asStr(value.role, 'ADMIN'),
    companyId: asStr(value.companyId) || null,
    isActive: asBool(value.isActive, false),
    createdAt: asStr(value.createdAt) || null,
    updatedAt: asStr(value.updatedAt) || null,
    memberships: memberships as CompanyUserMembership[],
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

function currentMembership(
  user: CompanyUser,
  session: TcSession | null,
): CompanyUserMembership | undefined {
  return user.memberships?.find((item) => item.companyId === session?.companyId);
}

function resolveEffectiveRole(
  user: CompanyUser,
  session: TcSession | null,
): CompanyUserRole {
  return currentMembership(user, session)?.role ?? user.role;
}

function isUserActive(user: CompanyUser, session: TcSession | null): boolean {
  const membership = currentMembership(user, session);

  return user.isActive && membership?.active !== false;
}

function formatRole(role?: CompanyUserRole): string {
  switch (normalizeRole(role)) {
    case 'ADMIN':
      return 'Administrador';
    case 'TECHNICIAN':
      return 'Técnico';
    case 'SUPER_ADMIN':
      return 'Súper administrador';
    default:
      return role || '—';
  }
}

function roleBadgeClass(role?: CompanyUserRole): string {
  switch (normalizeRole(role)) {
    case 'ADMIN':
      return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
    case 'TECHNICIAN':
      return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200';
    case 'SUPER_ADMIN':
      return 'border-purple-400/40 bg-purple-400/10 text-purple-200';
    default:
      return 'border-slate-700/80 bg-slate-950/70 text-slate-300';
  }
}

function permissionsForRole(role?: CompanyUserRole): string[] {
  switch (normalizeRole(role)) {
    case 'SUPER_ADMIN':
      return ['Todo el sistema', 'Empresas', 'Usuarios', 'Seguridad'];
    case 'ADMIN':
      return ['Operación', 'Clientes', 'Inventario', 'Personal'];
    case 'TECHNICIAN':
      return ['Órdenes asignadas', 'Partes técnicos', 'Materiales'];
    default:
      return ['Acceso básico'];
  }
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

function resolveUserArea(role?: CompanyUserRole): string {
  switch (normalizeRole(role)) {
    case 'SUPER_ADMIN':
      return 'Dirección / sistema';
    case 'ADMIN':
      return 'Administración / oficina';
    case 'TECHNICIAN':
      return 'Equipo técnico';
    default:
      return 'Usuario interno';
  }
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sm font-black text-sky-300">
      {initials || 'U'}
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
  icon: 'users' | 'shield' | 'key' | 'calendar';
}) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-400">
          {icon === 'users' ? <UsersIcon className="h-6 w-6" /> : null}
          {icon === 'shield' ? <ShieldIcon className="h-6 w-6" /> : null}
          {icon === 'key' ? <KeyIcon className="h-6 w-6" /> : null}
          {icon === 'calendar' ? <CalendarIcon className="h-6 w-6" /> : null}
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

function PermissionChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-slate-700/80 bg-slate-950/70 px-3 py-1 text-[11px] font-bold text-slate-300">
      {label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide',
        active
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-rose-400/40 bg-rose-400/10 text-rose-300',
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

export default function TeamUsersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const [state, setState] = useState<Load<CompanyUser[]>>({
    status: 'loading',
  });

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
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

    async function loadUsers() {
      try {
        setState({ status: 'loading' });

        const query = new URLSearchParams();
        query.set('pageSize', '100');

        if (search.trim()) query.set('search', search.trim());
        if (activeFilter) query.set('active', activeFilter);
        if (roleFilter) query.set('role', roleFilter);

        const response = await tcGet(
          session,
          `/company-users?${query.toString()}`,
        );

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudieron cargar los usuarios. ${getServerMessage(
              response.json,
              `HTTP ${response.code}`,
            )}`,
          });
          return;
        }

        const { items } = normalizeList(response.json);
        const users = items
          .map(parseCompanyUser)
          .filter((user) => user.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        setState({
          status: 'ok',
          data: users,
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

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [activeFilter, mounted, refreshKey, roleFilter, search, session]);

  async function toggleActive(user: CompanyUser) {
    if (!session) {
      setMessage('Sesión no encontrada.');
      return;
    }

    const active = isUserActive(user, session);
    const endpoint = active ? 'deactivate' : 'activate';

    try {
      setActionLoadingId(user.id);
      setMessage(null);

      const response = await tcPatch(
        session,
        `/company-users/${user.id}/${endpoint}`,
      );

      if (response.code < 200 || response.code >= 300) {
        setMessage(
          `No se pudo actualizar el usuario. ${getServerMessage(
            response.json,
            `HTTP ${response.code}`,
          )}`,
        );
        return;
      }

      setMessage(
        active
          ? 'Usuario desactivado correctamente.'
          : 'Usuario activado correctamente.',
      );

      setRefreshKey((current) => current + 1);
    } catch (error) {
      setMessage(`No se pudo actualizar el usuario: ${errMsg(error)}`);
    } finally {
      setActionLoadingId(null);
    }
  }

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
          <h1 className="text-2xl font-black text-white">Usuarios</h1>

          <p className="mt-2 text-sm leading-6 text-amber-100">
            No hay sesión activa. Entra otra vez para ver usuarios, roles y
            permisos.
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

  if (!isAdminSession(session)) {
    return (
      <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6">
          <h1 className="text-2xl font-black text-white">
            Acceso no permitido
          </h1>

          <p className="mt-2 text-sm leading-6 text-rose-100">
            Esta sección solo está disponible para administradores.
          </p>

          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-400"
          >
            Volver al panel
          </Link>
        </section>
      </main>
    );
  }

  const users = state.status === 'ok' ? state.data : EMPTY_USERS;

  const activeUsers = users.filter((user) => isUserActive(user, session));
  const inactiveUsers = users.filter((user) => !isUserActive(user, session));
  const technicianUsers = users.filter(
    (user) => normalizeRole(resolveEffectiveRole(user, session)) === 'TECHNICIAN',
  );
  const adminUsers = users.filter((user) =>
    ['ADMIN', 'SUPER_ADMIN'].includes(
      normalizeRole(resolveEffectiveRole(user, session)),
    ),
  );

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/40 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%)]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.07)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Personal
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                Usuarios
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Controla los trabajadores de la empresa, sus roles, estado de
                acceso, mes de alta y permisos operativos dentro del sistema.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <UsersIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    trabajadores · roles · permisos · fecha de alta · estado
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Usuarios"
            value={users.length}
            description="Trabajadores registrados."
            icon="users"
          />

          <MetricCard
            title="Activos"
            value={activeUsers.length}
            description="Usuarios con acceso operativo."
            icon="shield"
          />

          <MetricCard
            title="Técnicos"
            value={technicianUsers.length}
            description="Personal de campo registrado."
            icon="calendar"
          />

          <MetricCard
            title="Administración"
            value={adminUsers.length}
            description="Usuarios con gestión interna."
            icon="key"
          />
        </section>

        {message ? (
          <div className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4 text-sm font-bold text-sky-100">
            {message}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Listado de trabajadores
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Consulta usuarios, rol asignado, estado, mes de alta y permisos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario…"
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10"
              >
                <option value="">Todos los roles</option>
                <option value="SUPER_ADMIN">Súper administrador</option>
                <option value="ADMIN">Administrador</option>
                <option value="TECHNICIAN">Técnico</option>
              </select>

              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/10"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>

              <Link
                href="/team/users/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                <PlusIcon className="h-4 w-4" />
                Alta de usuario
              </Link>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando usuarios…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-black text-white">
                No hay usuarios para mostrar.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Puedes crear un usuario desde el botón superior.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-2">Trabajador</th>
                    <th className="px-4 py-2">Rol</th>
                    <th className="px-4 py-2">Área</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Mes de alta</th>
                    <th className="px-4 py-2">Permisos</th>
                    <th className="px-4 py-2">Última act.</th>
                    <th className="px-4 py-2 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const role = resolveEffectiveRole(user, session);
                    const active = isUserActive(user, session);

                    return (
                      <tr
                        key={user.id}
                        className="rounded-2xl bg-slate-950/55 text-sm text-slate-300"
                      >
                        <td className="rounded-l-2xl border-y border-l border-slate-800 px-4 py-4">
                          <div className="flex items-center gap-3">
                            <UserInitials name={user.name} />

                            <div>
                              <p className="font-black text-white">
                                {user.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-slate-800 px-4 py-4">
                          <span
                            className={[
                              'rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide',
                              roleBadgeClass(role),
                            ].join(' ')}
                          >
                            {formatRole(role)}
                          </span>
                        </td>

                        <td className="border-y border-slate-800 px-4 py-4">
                          {resolveUserArea(role)}
                        </td>

                        <td className="border-y border-slate-800 px-4 py-4">
                          <StatusBadge active={active} />
                        </td>

                        <td className="border-y border-slate-800 px-4 py-4 capitalize">
                          {formatMonth(user.createdAt)}
                        </td>

                        <td className="border-y border-slate-800 px-4 py-4">
                          <div className="flex max-w-lg flex-wrap gap-2">
                            {permissionsForRole(role).map((permission) => (
                              <PermissionChip
                                key={`${user.id}-${permission}`}
                                label={permission}
                              />
                            ))}
                          </div>
                        </td>

                        <td className="border-y border-slate-800 px-4 py-4 text-slate-400">
                          {formatDate(user.updatedAt)}
                        </td>

                        <td className="rounded-r-2xl border-y border-r border-slate-800 px-4 py-4 text-right">
                          <button
                            type="button"
                            disabled={actionLoadingId === user.id}
                            onClick={() => void toggleActive(user)}
                            className={[
                              'inline-flex rounded-xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500',
                              active
                                ? 'border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                                : 'bg-sky-500 text-white hover:bg-sky-400',
                            ].join(' ')}
                          >
                            {actionLoadingId === user.id
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

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Futuras funciones de usuarios
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