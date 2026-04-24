import Link from 'next/link';

export type ModuleLandingItem = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
  badgeLabel?: string;
};

export type ModuleLandingProps = {
  eyebrow?: string;
  title: string;
  description: string;
  focusTitle?: string;
  focusText?: string;
  items: ModuleLandingItem[];
};

function ModuleBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
      {label}
    </span>
  );
}

function ModuleLandingCard({
  title,
  description,
  href,
  comingSoon,
  badgeLabel,
}: ModuleLandingItem) {
  const content = (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:bg-slate-800/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {comingSoon ? (
          <ModuleBadge label={badgeLabel ?? 'Próximo'} />
        ) : null}
      </div>
    </div>
  );

  if (!href || comingSoon) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default function ModuleLanding({
  eyebrow = 'Módulo',
  title,
  description,
  focusTitle = 'Foco del módulo',
  focusText,
  items,
}: ModuleLandingProps) {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </div>

            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              {title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              {description}
            </p>
          </div>

          {(focusTitle || focusText) && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              {focusTitle ? (
                <div className="font-medium text-slate-100">{focusTitle}</div>
              ) : null}

              {focusText ? (
                <div className="mt-1 text-slate-400">{focusText}</div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <ModuleLandingCard key={`${item.title}-${item.href ?? 'static'}`} {...item} />
        ))}
      </section>
    </main>
  );
}