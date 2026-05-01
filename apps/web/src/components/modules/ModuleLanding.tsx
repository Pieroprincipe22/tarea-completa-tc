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

type ModuleCardProps = ModuleLandingItem & {
  variant: 'active' | 'coming-soon';
};

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

function StatusPill({ variant }: { variant: ModuleCardProps['variant'] }) {
  if (variant === 'active') {
    return (
      <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
        Activo
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
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
      className={[
        'group relative h-full overflow-hidden rounded-3xl border p-6 shadow-[0_22px_70px_rgba(2,6,23,0.30)] transition duration-200',
        disabled
          ? 'border-slate-800/90 bg-slate-900/35'
          : 'border-slate-800/90 bg-slate-900/55 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/75 hover:shadow-[0_28px_90px_rgba(14,165,233,0.12)]',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_38%)] opacity-80" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div
            className={[
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
              disabled
                ? 'border-slate-700/70 bg-slate-950/60 text-slate-500'
                : 'border-sky-400/25 bg-sky-500/10 text-sky-400',
            ].join(' ')}
          >
            {disabled ? (
              <SparkIcon className="h-7 w-7" />
            ) : (
              <CubeIcon className="h-7 w-7" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              {title}
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              {description}
            </p>
          </div>
        </div>

        <StatusPill variant={variant} />
      </div>

      {!disabled ? (
        <div className="relative mt-6 inline-flex items-center gap-2 text-sm font-black text-sky-400 transition group-hover:text-sky-300">
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
  const activeItems = items.filter((item) => !item.comingSoon);
  const comingSoonItems = items.filter((item) => item.comingSoon);

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/40 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%)]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.07)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                {eyebrow}
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                {title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                {description}
              </p>
            </div>

            {focusText ? (
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
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Disponibles
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Módulos activos
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {activeItems.map((item) => (
                <ModuleCard
                  key={`${item.title}-${item.href ?? 'active'}`}
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
          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
            <div className="mb-5">
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Próximamente
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Futuros módulos
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
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