import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type TemplateModuleCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
  icon: 'checklist' | 'maintenance' | 'versions' | 'sector' | 'assets' | 'contracts';
};

const templateModules: TemplateModuleCardProps[] = [
  {
    title: 'Plantillas de checklist',
    description:
      'Acceso a las plantillas actuales que ya sirven como base de partes, revisiones y checklists operativos.',
    href: '/maintenance-templates',
    icon: 'checklist',
  },
  {
    title: 'Plantillas de mantenimiento',
    description:
      'Nueva línea de crecimiento para plantillas técnicas avanzadas, familias de mantenimiento y reutilización estructurada.',
    href: '/templates/maintenance',
    icon: 'maintenance',
  },
  {
    title: 'Versionado de plantillas',
    description:
      'Bloque futuro para controlar cambios, histórico, borradores y evolución segura de plantillas.',
    href: '/templates/versions',
    comingSoon: true,
    icon: 'versions',
  },
  {
    title: 'Plantillas por sector',
    description:
      'Clasificación futura por hotelería, industria, residencial, oficinas o instalaciones especiales.',
    href: '/templates/sectors',
    comingSoon: true,
    icon: 'sector',
  },
  {
    title: 'Plantillas por tipo de equipo',
    description:
      'Organización futura por calderas, climatización, bombas, cuadros eléctricos y otros activos.',
    href: '/templates/assets',
    comingSoon: true,
    icon: 'assets',
  },
  {
    title: 'Asignación por contrato',
    description:
      'Relación futura entre plantillas, frecuencia de servicio, contrato y cobertura operativa.',
    href: '/templates/contracts',
    comingSoon: true,
    icon: 'contracts',
  },
];

function ClipboardIcon(props: IconProps) {
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
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="m8 13 1.5 1.5L12 12" />
      <path d="M14 13h2" />
      <path d="M8 17h8" />
    </svg>
  );
}

function WrenchIcon(props: IconProps) {
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
      <path d="M14.7 6.3a4 4 0 0 0 5 5L11 20l-5-5 8.7-8.7Z" />
      <path d="M6 15l3 3" />
    </svg>
  );
}

function VersionsIcon(props: IconProps) {
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
      <path d="M7 7h12v12H7V7Z" />
      <path d="M5 17H4a2 2 0 0 1-2-2V4h11a2 2 0 0 1 2 2v1" />
      <path d="M10 11h6" />
      <path d="M10 15h4" />
    </svg>
  );
}

function SectorIcon(props: IconProps) {
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
      <path d="M3 21h18" />
      <path d="M5 21V7h6v14" />
      <path d="M13 21V3h6v18" />
      <path d="M7.5 10h1" />
      <path d="M7.5 14h1" />
      <path d="M15.5 7h1" />
      <path d="M15.5 11h1" />
      <path d="M15.5 15h1" />
    </svg>
  );
}

function AssetIcon(props: IconProps) {
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
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function ContractIcon(props: IconProps) {
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
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
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

function TemplateIcon({ icon }: { icon: TemplateModuleCardProps['icon'] }) {
  if (icon === 'checklist') return <ClipboardIcon className="h-8 w-8" />;
  if (icon === 'maintenance') return <WrenchIcon className="h-8 w-8" />;
  if (icon === 'versions') return <VersionsIcon className="h-8 w-8" />;
  if (icon === 'sector') return <SectorIcon className="h-8 w-8" />;
  if (icon === 'assets') return <AssetIcon className="h-8 w-8" />;

  return <ContractIcon className="h-8 w-8" />;
}

function StatusPill({ comingSoon }: { comingSoon?: boolean }) {
  if (comingSoon) {
    return (
      <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
        Próximo
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300">
      Activo
    </span>
  );
}

function TemplateModuleCard({
  title,
  description,
  href,
  comingSoon,
  icon,
}: TemplateModuleCardProps) {
  const content = (
    <div
      className={[
        'group relative h-full overflow-hidden rounded-3xl border p-6 shadow-[0_22px_70px_rgba(2,6,23,0.32)] transition duration-200',
        comingSoon
          ? 'border-slate-800/90 bg-slate-900/35'
          : 'border-slate-800/90 bg-slate-900/55 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/75 hover:shadow-[0_28px_90px_rgba(14,165,233,0.12)]',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%)] opacity-80" />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={[
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border shadow-[0_0_35px_rgba(14,165,233,0.10)]',
            comingSoon
              ? 'border-slate-700/80 bg-slate-950/70 text-slate-500'
              : 'border-sky-400/25 bg-sky-500/10 text-sky-400',
          ].join(' ')}
        >
          <TemplateIcon icon={icon} />
        </div>

        <StatusPill comingSoon={comingSoon} />
      </div>

      <div className="relative mt-6">
        <h2 className="text-2xl font-black tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          {description}
        </p>

        {!comingSoon && href ? (
          <p className="mt-6 text-sm font-black text-sky-400 transition group-hover:text-sky-300">
            Abrir módulo →
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!href || comingSoon) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export default function TemplatesPage() {
  const activeModules = templateModules.filter((item) => !item.comingSoon);
  const comingSoonModules = templateModules.filter((item) => item.comingSoon);

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
                Plantillas
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Organiza la biblioteca reutilizable del sistema: checklists,
                plantillas técnicas, estructuras de mantenimiento y versiones
                futuras por sector, equipo, contrato o tipo de servicio.
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
                    checklists · biblioteca · reutilización · versiones
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

          <div className="grid gap-6 xl:grid-cols-2">
            {activeModules.map((module) => (
              <TemplateModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Futuras funciones de plantillas
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Estas funciones quedan separadas para desarrollo posterior, sin
              mezclarlas con las plantillas principales ya disponibles.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {comingSoonModules.map((module) => (
              <TemplateModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}