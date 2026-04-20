import Link from 'next/link';

type TechnicianCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function TechnicianCard({
  title,
  description,
  href,
  comingSoon,
}: TechnicianCardProps) {
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

export default function TechniciansPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Submódulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Técnicos
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Este bloque organiza el equipo técnico como unidad operativa:
              especialidades, asignaciones, disponibilidad, carga de trabajo,
              rendimiento y trazabilidad del servicio. Está pensado para crecer
              junto con work orders, partes de trabajo y planificación.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del submódulo</div>
            <div className="mt-1 text-slate-400">
              especialidades · asignación · disponibilidad · rendimiento
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TechnicianCard
          title="Listado de técnicos"
          description="Vista futura para consultar técnicos activos, estado operativo, especialidad y carga actual."
          href="/technicians/list"
          comingSoon
        />

        <TechnicianCard
          title="Alta de técnico"
          description="Creación futura de perfiles técnicos con datos operativos, especialidades y ámbito de trabajo."
          href="/technicians/new"
          comingSoon
        />

        <TechnicianCard
          title="Especialidades"
          description="Clasificación futura por climatización, electricidad, fontanería, calderas, instalaciones y otros perfiles."
          href="/technicians/specialties"
          comingSoon
        />

        <TechnicianCard
          title="Disponibilidad"
          description="Control futuro de turnos, guardias, vacaciones, ausencias y disponibilidad real para asignación."
          href="/technicians/availability"
          comingSoon
        />

        <TechnicianCard
          title="Carga de trabajo"
          description="Visión futura del volumen de órdenes, partes y capacidad disponible por técnico."
          href="/technicians/workload"
          comingSoon
        />

        <TechnicianCard
          title="Rendimiento"
          description="Base futura para medir tiempos, cierres, incidencias recurrentes y calidad operativa por técnico."
          href="/technicians/performance"
          comingSoon
        />
      </section>
    </main>
  );
}