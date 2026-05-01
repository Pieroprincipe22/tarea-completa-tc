import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type PersonalCard = {
  title: string;
  description: string;
  href: string;
  badge: 'ACTIVO' | 'ALTA';
  icon: 'technicians' | 'users' | 'new';
};

type FutureFeature = {
  title: string;
  description: string;
};

const personalCards: PersonalCard[] = [
  {
    title: 'Técnicos',
    description:
      'Consulta la lista completa de técnicos, su estado, disponibilidad, especialidad y carga operativa.',
    href: '/team/technicians',
    badge: 'ACTIVO',
    icon: 'technicians',
  },
  {
    title: 'Usuarios',
    description:
      'Gestiona trabajadores, encargados, administración, roles, permisos y activación de usuarios internos.',
    href: '/team/users',
    badge: 'ACTIVO',
    icon: 'users',
  },
  {
    title: 'Dar de alta usuario',
    description:
      'Crea técnicos o administradores para tu empresa según el rol asignado y las necesidades operativas.',
    href: '/team/users/new',
    badge: 'ALTA',
    icon: 'new',
  },
];

const futureFeatures: FutureFeature[] = [
  {
    title: 'Permisos por módulo',
    description:
      'Control granular para decidir qué usuario puede ver, crear, editar, aprobar o eliminar.',
  },
  {
    title: 'Turnos y disponibilidad',
    description:
      'Planificación de técnicos por guardias, vacaciones, ausencias y disponibilidad real.',
  },
  {
    title: 'Auditoría de cambios',
    description:
      'Historial de altas, bajas, cambios de rol, activaciones y acciones críticas.',
  },
  {
    title: 'Perfiles completos',
    description:
      'Ficha ampliada con teléfono, departamento, responsable, firma, documentación y preferencias.',
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

function UserIcon(props: IconProps) {
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
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
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

function TargetIcon(props: IconProps) {
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
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  );
}

function CardIcon({ icon }: { icon: PersonalCard['icon'] }) {
  if (icon === 'technicians') return <UsersIcon className="h-8 w-8" />;
  if (icon === 'users') return <UserIcon className="h-8 w-8" />;

  return <PlusIcon className="h-8 w-8" />;
}

function Badge({ label }: { label: PersonalCard['badge'] }) {
  const active = label === 'ACTIVO';

  return (
    <span
      className={
        active
          ? 'rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300'
          : 'rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-sky-200'
      }
    >
      {label}
    </span>
  );
}

function PersonalModuleCard({ card }: { card: PersonalCard }) {
  return (
    <Link
      href={card.href}
      className="group relative h-full overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/55 p-6 shadow-[0_22px_70px_rgba(2,6,23,0.32)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/75 hover:shadow-[0_28px_90px_rgba(14,165,233,0.12)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%)] opacity-80" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-400 shadow-[0_0_35px_rgba(14,165,233,0.10)]">
          <CardIcon icon={card.icon} />
        </div>

        <Badge label={card.badge} />
      </div>

      <div className="relative mt-6">
        <h2 className="text-2xl font-black tracking-tight text-white">
          {card.title}
        </h2>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          {card.description}
        </p>

        <p className="mt-6 text-sm font-black text-sky-400 transition group-hover:text-sky-300">
          Abrir módulo →
        </p>
      </div>
    </Link>
  );
}

function FutureFeatureCard({ item }: { item: FutureFeature }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/40 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.20)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight text-white">
            {item.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {item.description}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
          Próximo
        </span>
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/40 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%)]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.07)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Módulo
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                Personal
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Desde aquí puedes revisar técnicos, usuarios internos y dar de
                alta nuevos trabajadores según el rol que necesites asignar en
                la empresa.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <TargetIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    técnicos · usuarios · roles · permisos · altas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Disponibles
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Módulos activos
            </h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {personalCards.map((card) => (
              <PersonalModuleCard key={card.href} card={card} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Futuras funciones de personal
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {futureFeatures.map((item) => (
              <FutureFeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}