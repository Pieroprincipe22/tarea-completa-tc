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

type PlanUsage = {
  plan: string;
  limits: {
    maxTechnicians: number;
    maxAdmins: number;
    maxSites: number;
    maxAssets: number;
    maxStorageMb: number;
  };
  usage: {
    technicians: number;
    admins: number;
    sites: number;
    assets: number;
    storageMb: number;
  };
};

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

function asNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parsePlanUsage(value: unknown): PlanUsage | null {
  if (!isRecord(value)) return null;

  const limits = isRecord(value.limits) ? value.limits : {};
  const usage = isRecord(value.usage) ? value.usage : {};

  return {
    plan: asStr(value.plan, 'BASIC'),
    limits: {
      maxTechnicians: asNum(limits.maxTechnicians),
      maxAdmins: asNum(limits.maxAdmins),
      maxSites: asNum(limits.maxSites),
      maxAssets: asNum(limits.maxAssets),
      maxStorageMb: asNum(limits.maxStorageMb),
    },
    usage: {
      technicians: asNum(usage.technicians),
      admins: asNum(usage.admins),
      sites: asNum(usage.sites),
      assets: asNum(usage.assets),
      storageMb: asNum(usage.storageMb),
    },
  };
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
      return 'border-accent/30 bg-accent-soft text-accent';
    case 'TECHNICIAN':
      return 'border-success/30 bg-success-soft text-success';
    case 'SUPER_ADMIN':
      return 'border-special/30 bg-special-soft text-special';
    default:
      return 'border-line bg-surface-2 text-ink-2';
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
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-sm font-semibold text-accent">
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
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
          {icon === 'users' ? <UsersIcon className="h-6 w-6" /> : null}
          {icon === 'shield' ? <ShieldIcon className="h-6 w-6" /> : null}
          {icon === 'key' ? <KeyIcon className="h-6 w-6" /> : null}
          {icon === 'calendar' ? <CalendarIcon className="h-6 w-6" /> : null}
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

function PermissionChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-bold text-ink-2">
      {label}
    </span>
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

function PlanUsageBar({
  label,
  used,
  max,
  unit,
}: {
  label: string;
  used: number;
  max: number;
  unit?: string;
}) {
  const ratio = max > 0 ? Math.min(used / max, 1) : 0;
  const isFull = max > 0 && used >= max;
  const isNearLimit = !isFull && ratio >= 0.8;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <span
          className={[
            'font-semibold',
            isFull
              ? 'text-danger'
              : isNearLimit
                ? 'text-warning'
                : 'text-ink-2',
          ].join(' ')}
        >
          {used}
          {unit ?? ''} / {max}
          {unit ?? ''}
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={[
            'h-full rounded-full transition-all',
            isFull ? 'bg-danger' : isNearLimit ? 'bg-warning' : 'bg-accent',
          ].join(' ')}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
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

export default function TeamUsersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const [state, setState] = useState<Load<CompanyUser[]>>({
    status: 'loading',
  });

  const [planUsageState, setPlanUsageState] = useState<Load<PlanUsage>>({
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

  useEffect(() => {
    if (!mounted || !session || !isAdminSession(session)) return;

    let cancelled = false;

    async function loadPlanUsage() {
      try {
        setPlanUsageState({ status: 'loading' });

        const response = await tcGet(session, '/companies/current/usage');

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setPlanUsageState({
            status: 'error',
            error: getServerMessage(response.json, `HTTP ${response.code}`),
          });
          return;
        }

        const parsed = parsePlanUsage(response.json);

        if (!parsed) {
          setPlanUsageState({
            status: 'error',
            error: 'Respuesta de uso de plan inválida.',
          });
          return;
        }

        setPlanUsageState({ status: 'ok', data: parsed });
      } catch (error) {
        if (!cancelled) {
          setPlanUsageState({ status: 'error', error: errMsg(error) });
        }
      }
    }

    void loadPlanUsage();

    return () => {
      cancelled = true;
    };
  }, [mounted, refreshKey, session]);

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
          <h1 className="text-2xl font-semibold text-ink">Usuarios</h1>

          <p className="mt-2 text-sm leading-6 text-warning">
            No hay sesión activa. Entra otra vez para ver usuarios, roles y
            permisos.
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
                Usuarios
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-ink-2">
                Controla los trabajadores de la empresa, sus roles, estado de
                acceso, mes de alta y permisos operativos dentro del sistema.
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

        {planUsageState.status === 'ok' ? (
          <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Uso del plan
              </h2>
              <span className="w-fit rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                Plan {planUsageState.data.plan}
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              <PlanUsageBar
                label="Técnicos"
                used={planUsageState.data.usage.technicians}
                max={planUsageState.data.limits.maxTechnicians}
              />
              <PlanUsageBar
                label="Administradores"
                used={planUsageState.data.usage.admins}
                max={planUsageState.data.limits.maxAdmins}
              />
              <PlanUsageBar
                label="Sitios"
                used={planUsageState.data.usage.sites}
                max={planUsageState.data.limits.maxSites}
              />
              <PlanUsageBar
                label="Activos"
                used={planUsageState.data.usage.assets}
                max={planUsageState.data.limits.maxAssets}
              />
              <PlanUsageBar
                label="Almacenamiento"
                used={planUsageState.data.usage.storageMb}
                max={planUsageState.data.limits.maxStorageMb}
                unit="MB"
              />
            </div>
          </section>
        ) : null}

        {message ? (
          <div className="rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm font-bold text-accent">
            {message}
          </div>
        ) : null}

        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Listado de trabajadores
              </h2>

              <p className="mt-1 text-sm text-muted">
                Consulta usuarios, rol asignado, estado, mes de alta y permisos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario…"
                className="h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent/30 focus:ring-2 focus:ring-accent/25"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-11 rounded-lg border border-line bg-surface-2 px-4 text-sm text-ink outline-none transition focus:border-accent/30 focus:ring-2 focus:ring-accent/25"
              >
                <option value="">Todos los roles</option>
                <option value="SUPER_ADMIN">Súper administrador</option>
                <option value="ADMIN">Administrador</option>
                <option value="TECHNICIAN">Técnico</option>
              </select>

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
                Alta de usuario
              </Link>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="py-12 text-center text-sm text-muted">
              Cargando usuarios…
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
              {state.error}
            </div>
          ) : null}

          {state.status === 'ok' && users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-ink">
                No hay usuarios para mostrar.
              </p>

              <p className="mt-2 text-sm text-muted">
                Puedes crear un usuario desde el botón superior.
              </p>
            </div>
          ) : null}

          {state.status === 'ok' && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
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
                        className="rounded-lg bg-surface-2 text-sm text-ink-2"
                      >
                        <td className="rounded-l-lg border-y border-l border-line px-4 py-4">
                          <div className="flex items-center gap-3">
                            <UserInitials name={user.name} />

                            <div>
                              <p className="font-semibold text-ink">
                                {user.name}
                              </p>

                              <p className="mt-1 text-xs text-subtle">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          <span
                            className={[
                              'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                              roleBadgeClass(role),
                            ].join(' ')}
                          >
                            {formatRole(role)}
                          </span>
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          {resolveUserArea(role)}
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          <StatusBadge active={active} />
                        </td>

                        <td className="border-y border-line px-4 py-4 capitalize">
                          {formatMonth(user.createdAt)}
                        </td>

                        <td className="border-y border-line px-4 py-4">
                          <div className="flex max-w-lg flex-wrap gap-2">
                            {permissionsForRole(role).map((permission) => (
                              <PermissionChip
                                key={`${user.id}-${permission}`}
                                label={permission}
                              />
                            ))}
                          </div>
                        </td>

                        <td className="border-y border-line px-4 py-4 text-muted">
                          {formatDate(user.updatedAt)}
                        </td>

                        <td className="rounded-r-lg border-y border-r border-line px-4 py-4 text-right">
                          <button
                            type="button"
                            disabled={actionLoadingId === user.id}
                            onClick={() => void toggleActive(user)}
                            className={[
                              'inline-flex rounded-lg px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-subtle',
                              active
                                ? 'border border-line bg-surface-2 text-ink hover:bg-surface-3'
                                : 'bg-accent text-white hover:bg-accent-hover',
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

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
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