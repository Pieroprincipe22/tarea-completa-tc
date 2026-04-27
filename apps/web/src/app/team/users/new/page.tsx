'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { errMsg, isRecord, tcPost } from '@/lib/tc/api';
import {
  isAdminSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  role: 'TECHNICIAN' | 'ADMIN';
  isActive: boolean;
};

function getServerMessage(json: unknown, fallback: string): string {
  if (!isRecord(json)) return fallback;

  const message = json.message;

  if (typeof message === 'string') return message;

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(', ');
  }

  return fallback;
}

function roleDescription(role: CreateUserForm['role']): string {
  if (role === 'TECHNICIAN') {
    return 'El usuario podrá iniciar sesión como técnico, recibir órdenes asignadas, abrir detalles del trabajo, iniciar y finalizar órdenes.';
  }

  return 'El usuario podrá entrar al panel de administración, gestionar clientes, activos, órdenes y personal según los permisos disponibles.';
}

export default function NewTeamUserPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const [form, setForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
    isActive: true,
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const homePath = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

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
    } catch (error) {
      setMessage(`No se pudo crear el usuario: ${errMsg(error)}`);
    } finally {
      setSubmitLoading(false);
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
            Para dar de alta usuarios necesitas iniciar sesión como
            administrador.
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

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Personal
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Dar de alta a nuevo usuario
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Crea un usuario para tu empresa. Puede ser técnico de campo o
            administrador interno, según el rol asignado.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/team/technicians"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
          >
            Ver técnicos
          </Link>

          <Link
            href="/team/users"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
          >
            Ver usuarios
          </Link>
        </div>
      </div>

      {message ? (
        <div className="mb-6 rounded-2xl border border-sky-800 bg-sky-950/40 p-4 text-sm font-semibold text-sky-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 border-b border-slate-800 pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-400">
              Alta de usuario
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Datos del nuevo usuario
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Define nombre, email, contraseña inicial y rol. El usuario podrá
              iniciar sesión con estos datos cuando esté activo.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="grid gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-200">
                Nombre completo
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
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200">
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
                placeholder="usuario@empresa.com"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200">
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
                placeholder="Mínimo 6 caracteres"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200">
                Rol del usuario
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as 'TECHNICIAN' | 'ADMIN',
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
              >
                <option value="TECHNICIAN">Técnico</option>
                <option value="ADMIN">Administrador / Oficina</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200">
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
              Crear usuario activo
            </label>

            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {submitLoading ? 'Creando usuario...' : 'Crear usuario'}
            </button>
          </form>
        </section>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Rol seleccionado
          </p>

          <div className="mt-4 rounded-2xl border border-sky-800 bg-sky-950/40 p-4">
            <p className="text-lg font-bold">
              {form.role === 'TECHNICIAN'
                ? 'Técnico'
                : 'Administrador / Oficina'}
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-300">
              {roleDescription(form.role)}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-slate-200">
                Técnico
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ideal para personal de campo, mantenimiento, instalaciones,
                revisiones y partes de trabajo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-slate-200">
                Administrador / Oficina
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ideal para encargados, administración, planificación, clientes,
                activos y gestión operativa.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}