import Link from 'next/link';

type TemplateCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function TemplateCard({
  title,
  description,
  href,
  comingSoon,
}: TemplateCardProps) {
  const content = (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:bg-slate-800/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {comingSoon ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
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

export default function MaintenanceTemplatesFuturePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Submódulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Plantillas de mantenimiento
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Este bloque está pensado para evolucionar desde las plantillas de
              checklist actuales hacia una biblioteca técnica más potente:
              familias de plantillas, versiones, sectores, tipos de equipo y
              reutilización operativa por contrato, cliente o site.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del submódulo</div>
            <div className="mt-1 text-slate-400">
              biblioteca · versiones · sectores · reutilización
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TemplateCard
          title="Biblioteca de plantillas"
          description="Catálogo futuro de plantillas clasificadas por tipo de mantenimiento, equipo y operación."
          href="/templates/maintenance/library"
          comingSoon
        />

        <TemplateCard
          title="Versionado"
          description="Gestión futura de versiones, cambios, histórico y evolución segura de plantillas técnicas."
          href="/templates/maintenance/versions"
          comingSoon
        />

        <TemplateCard
          title="Plantillas por sector"
          description="Base futura para separar hotelería, industria, oficinas, residencial o instalaciones especiales."
          href="/templates/maintenance/sectors"
          comingSoon
        />

        <TemplateCard
          title="Plantillas por equipo"
          description="Modelos futuros para fan coils, calderas, bombas, climatización, cuadros eléctricos y más."
          href="/templates/maintenance/assets"
          comingSoon
        />

        <TemplateCard
          title="Asignación por contrato"
          description="Uso futuro de plantillas ligadas al alcance contractual y frecuencia de servicio."
          href="/templates/maintenance/contracts"
          comingSoon
        />

        <TemplateCard
          title="Plantillas reutilizables"
          description="Estructura futura para duplicar, adaptar y reutilizar plantillas entre clientes y sites."
          href="/templates/maintenance/reusable"
          comingSoon
        />
      </section>
    </main>
  );
}