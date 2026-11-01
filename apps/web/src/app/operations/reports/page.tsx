import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type ReportCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
  icon:
    | 'customer'
    | 'asset'
    | 'technician'
    | 'closure'
    | 'kpi'
    | 'export';
};

const reportCards: ReportCardProps[] = [
  {
    title: 'Informes por cliente',
    description:
      'Vista futura de informes agregados por cliente, contrato, período de servicio y actividad operativa.',
    href: '/operations/reports/by-customer',
    comingSoon: true,
    icon: 'customer',
  },
  {
    title: 'Informes por activo',
    description:
      'Base futura para analizar incidencias, mantenimiento, rendimiento y recurrencia por equipo.',
    href: '/operations/reports/by-asset',
    comingSoon: true,
    icon: 'asset',
  },
  {
    title: 'Informes por técnico',
    description:
      'Seguimiento futuro del trabajo realizado, tiempos, cierres y productividad por técnico.',
    href: '/operations/reports/by-technician',
    comingSoon: true,
    icon: 'technician',
  },
  {
    title: 'Cierres operativos',
    description:
      'Bloque futuro para cierres mensuales, resúmenes ejecutivos y validación administrativa.',
    href: '/operations/reports/closures',
    comingSoon: true,
    icon: 'closure',
  },
  {
    title: 'KPIs y tendencias',
    description:
      'Evolución futura de indicadores, incidencias recurrentes, tiempos de respuesta y carga operativa.',
    href: '/operations/reports/kpis',
    comingSoon: true,
    icon: 'kpi',
  },
  {
    title: 'Exportaciones',
    description:
      'Salida futura a PDF, Excel o entregables para cliente, administración y dirección.',
    href: '/operations/reports/exports',
    comingSoon: true,
    icon: 'export',
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

function TechnicianIcon(props: IconProps) {
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

function ClosureIcon(props: IconProps) {
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
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function KpiIcon(props: IconProps) {
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
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </svg>
  );
}

function ExportIcon(props: IconProps) {
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
      <path d="M12 12v6" />
      <path d="m9 15 3 3 3-3" />
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

function ReportIcon({ icon }: { icon: ReportCardProps['icon'] }) {
  if (icon === 'customer') return <UsersIcon className="h-8 w-8" />;
  if (icon === 'asset') return <AssetIcon className="h-8 w-8" />;
  if (icon === 'technician') return <TechnicianIcon className="h-8 w-8" />;
  if (icon === 'closure') return <ClosureIcon className="h-8 w-8" />;
  if (icon === 'kpi') return <KpiIcon className="h-8 w-8" />;

  return <ExportIcon className="h-8 w-8" />;
}

function ReportCard({
  title,
  description,
  href,
  comingSoon,
  icon,
}: ReportCardProps) {
  const content = (
    <div
      className={[
        'group relative h-full overflow-hidden rounded-xl border p-6 shadow-sm transition duration-200',
        comingSoon
          ? 'border-line bg-surface'
          : 'border-line bg-surface hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface ',
      ].join(' ')}
    >
      <div className="absolute inset-0 opacity-80" />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={[
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border ',
            comingSoon
              ? 'border-line bg-surface-2 text-subtle'
              : 'border-accent/30 bg-accent-soft text-accent',
          ].join(' ')}
        >
          <ReportIcon icon={icon} />
        </div>

        <span className="rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning">
          Próximo
        </span>
      </div>

      <div className="relative mt-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h2>

        <p className="mt-4 text-sm leading-7 text-ink-2">
          {description}
        </p>

        {!comingSoon && href ? (
          <p className="mt-6 text-sm font-semibold text-accent transition group-hover:text-accent">
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

export default function OperationsReportsPage() {
  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-accent/30 bg-surface p-8 ">
          <div className="absolute inset-0 " />
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                Operaciones
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-ink">
                Informes
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-ink-2">
                Centraliza los informes finales de operación, explotación
                técnica y análisis administrativo. Este bloque crecerá desde los
                partes de trabajo hacia informes por cliente, activo, contrato,
                período y rendimiento.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
                  <TargetIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
                    análisis · cierre · reporting · explotación
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Futuros informes operativos
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              Estos informes quedan identificados para desarrollo posterior y no
              se mezclan con los módulos operativos ya disponibles.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {reportCards.map((card) => (
              <ReportCard key={card.title} {...card} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}