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

export default function NewCompanyUserPage() {
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
        const serverMessage =
          isRecord(response.json) && typeof response.json.message === 'string'
            ? response.json.message
            : `HTTP ${response.code}`;

        setMessage(`No se pudo crear el usuario. ${serverMessage}`);
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
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          Cargando sesión...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-slate-400">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Sesión no encontrada</h1>
          <p className="mt-3 text-slate-300">
            Para dar de alta usuarios necesitas iniciar sesión como administrador.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdminSession(session)) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-slate-400">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Acceso no permitido</h1>
          <p className="mt-3 text-slate-300">
            Esta sección solo está disponible para administradores.
          </p>
          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Personal
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Dar de alta a nuevo usuario
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Crea técnicos para recibir órdenes de trabajo o administradores
              para gestionar la empresa.
            </p>
          </div>

          <Link
            href="/admin/dashboard/personal/users"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Ver usuarios
          </Link>
        </div>

        {message ? (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm font-semibold text-slate-200">
            {message}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-200">
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
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
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
                placeholder="tecnico@empresa.com"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
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
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200">
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
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
              >
                <option value="TECHNICIAN">Técnico</option>
                <option value="ADMIN">Administrador</option>
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
              Usuario activo
            </label>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {submitLoading ? 'Creando usuario...' : 'Dar de alta usuario'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
