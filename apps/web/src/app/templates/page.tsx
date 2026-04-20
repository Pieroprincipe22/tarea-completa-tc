import Link from 'next/link';

type TemplateModuleCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function TemplateModuleCard({
  title,
  description,
  href,
  comingSoon,
}: TemplateModuleCardProps) {
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

export default function TemplatesPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Módulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Plantillas
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Organiza la biblioteca reutilizable del sistema: checklists,
              plantillas técnicas, estructuras de mantenimiento y versiones
              futuras por sector, equipo, contrato o tipo de servicio. Este
              módulo está pensado para que la operación crezca sin duplicar
              formularios ni lógica de mantenimiento.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del módulo</div>
            <div className="mt-1 text-slate-400">
              checklists · biblioteca · reutilización · versiones
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TemplateModuleCard
          title="Plantillas de checklist"
          description="Acceso a las plantillas actuales que ya sirven como base de partes, revisiones y checklists operativos."
          href="/maintenance-templates"
        />

        <TemplateModuleCard
          title="Plantillas de mantenimiento"
          description="Nueva línea de crecimiento para plantillas técnicas avanzadas, familias de mantenimiento y reutilización estructurada."
          href="/templates/maintenance"
        />

        <TemplateModuleCard
          title="Versionado de plantillas"
          description="Bloque futuro para controlar cambios, histórico, borradores y evolución segura de plantillas."
          href="/templates/versions"
          comingSoon
        />

        <TemplateModuleCard
          title="Plantillas por sector"
          description="Clasificación futura por hotelería, industria, residencial, oficinas o instalaciones especiales."
          href="/templates/sectors"
          comingSoon
        />

        <TemplateModuleCard
          title="Plantillas por tipo de equipo"
          description="Organización futura por calderas, climatización, bombas, cuadros eléctricos y otros activos."
          href="/templates/assets"
          comingSoon
        />

        <TemplateModuleCard
          title="Asignación por contrato"
          description="Relación futura entre plantillas, frecuencia de servicio, contrato y cobertura operativa."
          href="/templates/contracts"
          comingSoon
        />
      </section>
    </main>
  );
}