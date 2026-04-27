'use client';

import Link from 'next/link';

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
      'Consulta la lista completa de técnicos, su estado, disponibilidad y especialidad.',
    href: '/team/technicians',
    badge: 'Técnicos',
  },
  {
    title: 'Usuarios',
    description:
      'Gestiona encargados, personal de oficina, administración, roles, permisos y activación.',
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

export default function TeamPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
          Resumen
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Personal de empresa
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Desde aquí puedes revisar técnicos, usuarios internos y dar de alta
          nuevos usuarios según el rol que necesites asignar.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {personalCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group min-h-[260px] rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition hover:border-sky-600 hover:bg-slate-900/80"
          >
            <div className="mb-8 inline-flex rounded-full border border-sky-700 bg-sky-950/60 px-4 py-1 text-xs font-bold text-sky-300">
              {card.badge}
            </div>

            <h2 className="max-w-[180px] text-xl font-bold leading-tight text-white transition group-hover:text-sky-300">
              {card.title}
            </h2>

            <p className="mt-5 max-w-[230px] text-sm leading-7 text-slate-400">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}