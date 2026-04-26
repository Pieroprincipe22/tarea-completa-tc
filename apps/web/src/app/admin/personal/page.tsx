'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  isAdminSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type PersonalCard = {
  title: string;
  description: string;
  href: string;
  badge: string;
};

const personalCards: PersonalCard[] = [
  {
    title: 'Resumen de personal',
    description:
      'Vista general del equipo interno, técnicos activos, administradores y usuarios inactivos.',
    href: '/admin/personal',
    badge: 'Resumen',
  },
  {
    title: 'Técnicos',
    description:
      'Consulta el equipo técnico disponible para asignar órdenes de trabajo.',
    href: '/admin/personal/users?role=TECHNICIAN&active=true',
    badge: 'Técnicos',
  },
  {
    title: 'Usuarios',
    description:
      'Gestiona usuarios internos, roles, permisos, activación y desactivación.',
    href: '/admin/personal/users',
    badge: 'Usuarios',
  },
  {
    title: 'Dar de alta a nuevo usuario',
    description:
      'Crea técnicos o administradores para tu empresa según el plan contratado.',
    href: '/admin/personal/users/new',
    badge: 'Nuevo',
  },
];

export default function AdminPersonalPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const homePath = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          Cargando sesión...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-slate-400">Personal</p>
          <h1 className="mt-2 text-2xl font-bold">Sesión no encontrada</h1>
          <p className="mt-3 text-slate-300">
            Para acceder al módulo de personal necesitas iniciar sesión como
            administrador.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
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
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
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
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Sección activa
            </p>
            <h1 className="mt-2 text-3xl font-bold">Personal</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Gestiona usuarios internos, técnicos, administradores y permisos
              de la empresa.
            </p>
          </div>

          <Link
            href="/admin/personal/users/new"
            className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500"
          >
            Dar de alta a nuevo usuario
          </Link>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {personalCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:border-sky-500 hover:bg-slate-900/80"
            >
              <div className="mb-5 inline-flex rounded-full border border-sky-800 bg-sky-950/60 px-3 py-1 text-xs font-bold text-sky-300">
                {card.badge}
              </div>

              <h2 className="text-lg font-bold text-white transition group-hover:text-sky-300">
                {card.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Flujo recomendado</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-sky-300">1. Crear usuario</p>
              <p className="mt-2 text-sm text-slate-400">
                Dar de alta técnico o administrador.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-sky-300">2. Asignar rol</p>
              <p className="mt-2 text-sm text-slate-400">
                Técnico para campo, administrador para gestión.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-sky-300">3. Crear orden</p>
              <p className="mt-2 text-sm text-slate-400">
                Seleccionar técnico real en la orden de trabajo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-bold text-sky-300">4. Ejecutar</p>
              <p className="mt-2 text-sm text-slate-400">
                El técnico recibe, inicia y finaliza la orden.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}