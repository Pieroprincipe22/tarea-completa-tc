import Link from 'next/link';

type PlanningCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function PlanningCard({
  title,
  description,
  href,
  comingSoon,
}: PlanningCardProps) {
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

export default function OperationsPlanningPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Módulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Planificación
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Organiza la operación futura por agenda, asignación, rutas,
              cargas de trabajo y frecuencia de servicio. Este bloque está
              pensado para unir contratos, técnicos, work orders y capacidad
              operativa en una planificación escalable.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del módulo</div>
            <div className="mt-1 text-slate-400">
              agenda · asignación · carga · calendario
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <PlanningCard
          title="Agenda operativa"
          description="Vista futura del calendario general de intervenciones, mantenimientos y visitas programadas."
          href="/operations/planning/calendar"
          comingSoon
        />

        <PlanningCard
          title="Asignación de técnicos"
          description="Bloque futuro para asignar técnicos por zona, especialidad, carga y disponibilidad."
          href="/operations/planning/assignments"
          comingSoon
        />

        <PlanningCard
          title="Rutas y desplazamientos"
          description="Planificación futura de rutas, desplazamientos y agrupación de servicios por ubicación."
          href="/operations/planning/routes"
          comingSoon
        />

        <PlanningCard
          title="Frecuencias de servicio"
          description="Gestión futura de mantenimientos semanales, mensuales, preventivos o por contrato."
          href="/operations/planning/frequencies"
          comingSoon
        />

        <PlanningCard
          title="Carga de trabajo"
          description="Visión futura de saturación operativa, capacidad del equipo y equilibrio de asignaciones."
          href="/operations/planning/workload"
          comingSoon
        />

        <PlanningCard
          title="Alertas de planificación"
          description="Avisos futuros de conflictos de agenda, sobrecarga, retrasos o mantenimientos pendientes."
          href="/operations/planning/alerts"
          comingSoon
        />
      </section>
    </main>
  );
}