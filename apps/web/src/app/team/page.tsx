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
    title: 'Técnicos',
    description:
      'Consulta la lista completa de técnicos, estado, disponibilidad y especialidad de cada uno.',
    href: '/team/technicians',
    badge: 'Técnicos',
  },
  {
    title: 'Usuarios',
    description:
      'Gestiona usuarios internos, encargados, administración, roles, permisos y activación.',
    href: '/team/users',
    badge: 'Usuarios',
  },
  {
    title: 'Dar de alta a nuevo usuario',
    description:
      'Crea técnicos o administradores para tu empresa según el rol asignado y el plan contratado.',
    href: '/team/users/new',
    badge: 'Nuevo',
  },
];

function SidebarItem({
  title,
  description,
  href,
  active = false,
}: {
  title: string;
  description: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border px-4 py-4 transition ${
        active
          ? 'border-sky-600 bg-sky-950/50 text-white'
          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-sky-700 hover:bg-slate-900'
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

export default function TeamPage() {
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
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          Cargando sesión...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
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
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
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
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Sección activa
          </p>

          <h1 className="mt-4 text-xl font-bold">Personal</h1>

          <p className="mt-4 text-sm leading-7 text-slate-400">
            Usuarios internos, técnicos y estructura del equipo.
          </p>

          <div className="my-6 h-px bg-slate-800" />

          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Personal
          </p>

          <div className="mt-4 space-y-2">
            <SidebarItem
              title="Resumen de personal"
              description="Entrada principal del módulo de personal."
              href="/team"
              active
            />

            <SidebarItem
              title="Técnicos"
              description="Lista completa del equipo técnico."
              href="/team/technicians"
            />

            <SidebarItem
              title="Usuarios"
              description="Usuarios internos y permisos."
              href="/team/users"
            />

            <SidebarItem
              title="Dar de alta usuario"
              description="Crear técnico o administrador."
              href="/team/users/new"
            />
          </div>
        </aside>

        <section>
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Resumen
            </p>

            <h2 className="mt-2 text-3xl font-bold">Personal de empresa</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Desde aquí puedes revisar técnicos, usuarios internos y dar de
              alta nuevos usuarios según el rol que necesites asignar.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {personalCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition hover:border-sky-600 hover:bg-slate-900/80"
              >
                <div className="mb-8 inline-flex rounded-full border border-sky-700 bg-sky-950/60 px-4 py-1 text-xs font-bold text-sky-300">
                  {card.badge}
                </div>

                <h3 className="text-xl font-bold text-white transition group-hover:text-sky-300">
                  {card.title}
                </h3>

                <p className="mt-5 text-sm leading-7 text-slate-400">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}