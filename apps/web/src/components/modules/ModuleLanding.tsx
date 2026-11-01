import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type ModuleLandingItem = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

type ModuleLandingProps = {
  eyebrow?: string;
  title: string;
  description: string;
  focusText?: string;
  items: ModuleLandingItem[];
};

type ModuleCardVariant = 'active' | 'coming-soon';

type ModuleCardProps = ModuleLandingItem & {
  variant: ModuleCardVariant;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function ArrowIcon(props: IconProps) {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CubeIcon(props: IconProps) {
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

function SparkIcon(props: IconProps) {
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
      <path d="M12 2v5" />
      <path d="M12 17v5" />
      <path d="M4.2 4.2 7.7 7.7" />
      <path d="m16.3 16.3 3.5 3.5" />
      <path d="M2 12h5" />
      <path d="M17 12h5" />
      <path d="m4.2 19.8 3.5-3.5" />
      <path d="m16.3 7.7 3.5-3.5" />
    </svg>
  );
}

function StatusPill({ variant }: { variant: ModuleCardVariant }) {
  if (variant === 'active') {
    return (
      <span className="rounded-full border border-success/30 bg-success-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
        Activo
      </span>
    );
  }

  return (
    <span className="rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">
      Próximo
    </span>
  );
}

function ModuleCard({
  title,
  description,
  href,
  variant,
}: ModuleCardProps) {
  const disabled = variant === 'coming-soon' || !href;

  const content = (
    <div
      className={cx(
        'group relative h-full overflow-hidden rounded-xl border p-6 shadow-sm transition duration-200',
        disabled
          ? 'border-line bg-surface'
          : 'border-line bg-surface hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface ',
      )}
    >
      <div className="absolute inset-0 opacity-80" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div
            className={cx(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border',
              disabled
                ? 'border-line bg-surface-2 text-subtle'
                : 'border-accent/30 bg-accent-soft text-accent',
            )}
          >
            {disabled ? (
              <SparkIcon className="h-7 w-7" />
            ) : (
              <CubeIcon className="h-7 w-7" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              {title}
            </h2>

            <p className="mt-3 text-sm leading-7 text-muted">
              {description}
            </p>
          </div>
        </div>

        <StatusPill variant={variant} />
      </div>

      {!disabled ? (
        <div className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent transition group-hover:text-accent">
          Abrir módulo
          <ArrowIcon className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

export default function ModuleLanding({
  eyebrow = 'Módulo',
  title,
  description,
  focusText,
  items,
}: ModuleLandingProps) {
  const activeItems = items.filter((item) => !item.comingSoon && item.href);
  const comingSoonItems = items.filter((item) => item.comingSoon || !item.href);

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-accent/30 bg-surface p-8 ">
          <div className="absolute inset-0 " />
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                {eyebrow}
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-ink">
                {title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-ink-2">
                {description}
              </p>
            </div>

            {focusText ? (
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
                      {focusText}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {activeItems.length > 0 ? (
          <section className="space-y-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                Disponibles
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Módulos activos
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {activeItems.map((item) => (
                <ModuleCard
                  key={`${item.title}-${item.href}`}
                  title={item.title}
                  description={item.description}
                  href={item.href}
                  comingSoon={item.comingSoon}
                  variant="active"
                />
              ))}
            </div>
          </section>
        ) : null}

        {comingSoonItems.length > 0 ? (
          <section className="rounded-xl border border-line bg-surface p-5">
            <div className="mb-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                Próximamente
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Futuros módulos
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Estas funciones quedan identificadas para desarrollo posterior,
                sin mezclarlas con las pantallas principales ya disponibles.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {comingSoonItems.map((item) => (
                <ModuleCard
                  key={`${item.title}-${item.href ?? 'coming-soon'}`}
                  title={item.title}
                  description={item.description}
                  href={item.href}
                  comingSoon={item.comingSoon}
                  variant="coming-soon"
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}