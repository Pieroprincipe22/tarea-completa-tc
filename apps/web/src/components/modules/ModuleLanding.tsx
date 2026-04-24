import Link from 'next/link';

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

type ModuleCardProps = ModuleLandingItem;

function ModuleCard({ title, description, href, comingSoon }: ModuleCardProps) {
  const content = (
    <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:bg-slate-800/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {comingSoon ? (
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
            Próximo
          </span>
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
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              {description}
            </p>
          </div>

          {focusText ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              <div className="font-medium text-slate-100">Foco del módulo</div>
              <div className="mt-1 text-slate-400">{focusText}</div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <ModuleCard
            key={`${item.title}-${item.href ?? 'static'}`}
            title={item.title}
            description={item.description}
            href={item.href}
            comingSoon={item.comingSoon}
          />
        ))}
      </section>
    </main>
  );
}
