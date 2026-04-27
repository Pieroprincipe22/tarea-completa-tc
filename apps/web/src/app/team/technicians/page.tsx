'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  memberships?: TechnicianMembership[];
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

const EMPTY_TECHNICIANS: Technician[] = [];

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

function resolveSpecialty(technician: Technician): string {
  return (
    technician.specialty?.trim() ||
    technician.specialization?.trim() ||
    'Sin especialidad registrada'
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
          .filter((technician) => technician.id);

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

    const endpoint = technician.isActive ? 'deactivate' : 'activate';

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
        technician.isActive
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
      <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          Cargando sesión...
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-slate-400">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Sesión no encontrada</h1>
          <p className="mt-3 text-slate-300">
            Para ver técnicos necesitas iniciar sesión como administrador.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Ir a login
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdminSession(session)) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-slate-400">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Acceso no permitido</h1>
          <p className="mt-3 text-slate-300">
            Esta sección solo está disponible para administradores.
          </p>
          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Volver al panel
          </Link>
        </div>
      </section>
    );
  }

  const technicians = state.status === 'ok' ? state.data : EMPTY_TECHNICIANS;

  const activeTechnicians = technicians.filter((technician) => {
    const membership = currentMembership(technician, session);
    return technician.isActive && membership?.active !== false;
  });

  const inactiveTechnicians = technicians.filter((technician) => {
    const membership = currentMembership(technician, session);
    return !technician.isActive || membership?.active === false;
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Personal
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Técnicos
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Lista completa del equipo técnico. Aquí puedes revisar quién está
            activo, su especialidad y su disponibilidad para recibir órdenes.
          </p>
        </div>

        <Link
          href="/team/users/new"
          className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500"
        >
          Dar de alta técnico
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-semibold text-slate-400">
            Técnicos totales
          </p>
          <p className="mt-2 text-3xl font-bold">{technicians.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-semibold text-slate-400">
            Técnicos activos
          </p>
          <p className="mt-2 text-3xl font-bold">{activeTechnicians.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-semibold text-slate-400">
            Técnicos inactivos
          </p>
          <p className="mt-2 text-3xl font-bold">{inactiveTechnicians.length}</p>
        </div>
      </div>

      {message ? (
        <div className="mb-6 rounded-2xl border border-sky-800 bg-sky-950/40 p-4 text-sm font-semibold text-sky-100">
          {message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">Lista de técnicos</h2>
            <p className="mt-2 text-sm text-slate-400">
              {technicians.length} técnico
              {technicians.length === 1 ? '' : 's'} registrado
              {technicians.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[460px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o email"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
            />

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {state.status === 'loading' ? (
          <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-slate-400">
            Cargando técnicos...
          </div>
        ) : state.status === 'error' ? (
          <div className="mt-6 rounded-2xl border border-rose-800 bg-rose-950/40 p-5 text-rose-200">
            {state.error}
          </div>
        ) : technicians.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-slate-400">
            No hay técnicos registrados todavía.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {technicians.map((technician) => {
              const membership = currentMembership(technician, session);
              const active = technician.isActive && membership?.active !== false;

              return (
                <article
                  key={technician.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-sky-800"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {technician.name}
                        </h3>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            active
                              ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                              : 'border-slate-700 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {technician.email}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Especialidad
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-200">
                            {resolveSpecialty(technician)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Teléfono
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-200">
                            {technician.phone?.trim() || '—'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Alta
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-200">
                            {formatDateTime(technician.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={actionLoadingId === technician.id}
                      onClick={() => void toggleActive(technician)}
                      className={`inline-flex rounded-2xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:bg-slate-700 ${
                        active
                          ? 'border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                          : 'bg-sky-600 text-white hover:bg-sky-500'
                      }`}
                    >
                      {actionLoadingId === technician.id
                        ? 'Actualizando...'
                        : active
                          ? 'Desactivar'
                          : 'Activar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}