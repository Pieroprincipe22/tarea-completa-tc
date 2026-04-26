'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  tcGet,
  tcPatch,
  tcPost,
} from '@/lib/tc/api';
import {
  isAdminSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type CompanyUserRole = 'ADMIN' | 'TECHNICIAN' | string;

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

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: 'TECHNICIAN' | 'ADMIN';
  isActive: boolean;
};

const EMPTY_USERS: CompanyUser[] = [];

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
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
    name: asStr(value.name, 'Usuario sin nombre'),
    email: asStr(value.email),
    role: asStr(value.role, 'TECHNICIAN'),
    companyId: asStr(value.companyId) || null,
    isActive: asBool(value.isActive, false),
    createdAt: asStr(value.createdAt) || null,
    updatedAt: asStr(value.updatedAt) || null,
    memberships: memberships as CompanyUserMembership[],
  };
}

function formatRole(role?: CompanyUserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'TECHNICIAN':
      return 'Técnico';
    case 'SUPER_ADMIN':
      return 'Súper admin';
    default:
      return role || '—';
  }
}

function roleBadgeClass(role?: CompanyUserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'TECHNICIAN':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'SUPER_ADMIN':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
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

function currentMembership(user: CompanyUser, session: TcSession | null) {
  return user.memberships?.find((item) => item.companyId === session?.companyId);
}

export default function TeamUsersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const [state, setState] = useState<Load<CompanyUser[]>>({
    status: 'loading',
  });

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [form, setForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
    isActive: true,
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
        if (roleFilter) query.set('role', roleFilter);
        if (activeFilter) query.set('active', activeFilter);

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
        const users = items.map(parseCompanyUser).filter((user) => user.id);

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

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessage('Sesión no encontrada.');
      return;
    }

    if (!form.name.trim()) {
      setMessage('El nombre es obligatorio.');
      return;
    }

    if (!form.email.trim()) {
      setMessage('El email es obligatorio.');
      return;
    }

    if (form.password.trim().length < 6) {
      setMessage('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    try {
      setSubmitLoading(true);
      setMessage(null);

      const response = await tcPost(session, '/company-users', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        isActive: form.isActive,
      });

      if (response.code < 200 || response.code >= 300) {
        setMessage(
          `No se pudo crear el usuario. ${getServerMessage(
            response.json,
            `HTTP ${response.code}`,
          )}`,
        );
        return;
      }

      setForm({
        name: '',
        email: '',
        password: '',
        role: 'TECHNICIAN',
        isActive: true,
      });

      setMessage('Usuario creado correctamente.');
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setMessage(`No se pudo crear el usuario: ${errMsg(error)}`);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function toggleActive(user: CompanyUser) {
    if (!session) {
      setMessage('Sesión no encontrada.');
      return;
    }

    const endpoint = user.isActive ? 'deactivate' : 'activate';

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
        user.isActive
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
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          Cargando sesión...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Sesión no encontrada</h1>
          <p className="mt-3 text-slate-600">
            Para gestionar usuarios necesitas iniciar sesión como administrador.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdminSession(session)) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Acceso no permitido</h1>
          <p className="mt-3 text-slate-600">
            Esta sección solo está disponible para usuarios administradores.
          </p>
          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  const users = state.status === 'ok' ? state.data : EMPTY_USERS;

  const techniciansCount = users.filter(
    (user) =>
      currentMembership(user, session)?.role === 'TECHNICIAN' &&
      user.isActive,
  ).length;

  const adminsCount = users.filter(
    (user) =>
      currentMembership(user, session)?.role === 'ADMIN' && user.isActive,
  ).length;

  const inactiveCount = users.filter((user) => !user.isActive).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Personal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Usuarios de empresa
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Gestiona técnicos y administradores de tu empresa. Primero puedes
              dar de alta un usuario y debajo revisar la lista completa del
              personal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#alta-usuario"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              Asignar usuario
            </a>

            <a
              href="#lista-personal"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Lista de personal
            </a>

            <Link
              href="/team"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Volver
            </Link>
          </div>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Técnicos activos
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {techniciansCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Administradores activos
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {adminsCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Usuarios inactivos
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {inactiveCount}
            </p>
          </div>
        </section>

        {message ? (
          <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-800 shadow-sm">
            {message}
          </div>
        ) : null}

        <section
          id="alta-usuario"
          className="mb-6 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 border-b border-slate-100 pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Alta de usuario
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Asignar usuario nuevo
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Crea un técnico para recibir órdenes de trabajo o un administrador
              para gestionar la empresa.
            </p>
          </div>

          <form
            onSubmit={handleCreateUser}
            className="grid gap-4 lg:grid-cols-12"
          >
            <div className="lg:col-span-3">
              <label className="text-sm font-semibold text-slate-700">
                Nombre
              </label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ejemplo: Juan Técnico"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="tecnico@empresa.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Contraseña inicial
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Mín. 6 caracteres"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Rol
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as 'TECHNICIAN' | 'ADMIN',
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              >
                <option value="TECHNICIAN">Técnico</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Estado
              </label>

              <label className="flex h-[46px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                Activo
              </label>
            </div>

            <div className="lg:col-span-12">
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 lg:w-auto"
              >
                {submitLoading ? 'Creando usuario...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </section>

        <section
          id="lista-personal"
          className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Listado
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Lista de personal
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {users.length} usuario{users.length === 1 ? '' : 's'} en la
                empresa.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[680px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o email"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500"
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              >
                <option value="">Todos los roles</option>
                <option value="TECHNICIAN">Técnicos</option>
                <option value="ADMIN">Administradores</option>
              </select>

              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-600">
              Cargando usuarios...
            </div>
          ) : state.status === 'error' ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
              {state.error}
            </div>
          ) : users.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-600">
              No hay usuarios para mostrar.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                <div>Usuario</div>
                <div>Rol</div>
                <div>Estado</div>
                <div>Creado</div>
                <div>Acción</div>
              </div>

              <div className="divide-y divide-slate-100">
                {users.map((user) => {
                  const membership = currentMembership(user, session);
                  const role = membership?.role ?? user.role;
                  const active = user.isActive && membership?.active !== false;

                  return (
                    <div
                      key={user.id}
                      className="grid gap-4 bg-white px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-950">{user.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {user.email}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${roleBadgeClass(
                            role,
                          )}`}
                        >
                          {formatRole(role)}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600">
                        {formatDateTime(user.createdAt)}
                      </div>

                      <div>
                        <button
                          type="button"
                          disabled={actionLoadingId === user.id}
                          onClick={() => void toggleActive(user)}
                          className={`inline-flex rounded-2xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                            active
                              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              : 'bg-slate-950 text-white hover:bg-slate-800'
                          }`}
                        >
                          {actionLoadingId === user.id
                            ? 'Actualizando...'
                            : active
                              ? 'Desactivar'
                              : 'Activar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}