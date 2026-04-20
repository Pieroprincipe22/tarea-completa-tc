import Link from 'next/link';

type ContractCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function ContractCard({
  title,
  description,
  href,
  comingSoon,
}: ContractCardProps) {
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

export default function ContractsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Módulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Contratos
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Organiza la relación contractual con cada cliente: alcance del
              servicio, periodicidad, cobertura, renovaciones, documentación y
              condiciones operativas. Está planteado como una base sólida para
              crecer luego hacia facturación, planificación y SLA.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del módulo</div>
            <div className="mt-1 text-slate-400">
              Alcance · periodicidad · cobertura · renovación
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ContractCard
          title="Listado de contratos"
          description="Base futura para consultar contratos activos, vencidos, borradores y estados administrativos."
          href="/contracts/list"
          comingSoon
        />

        <ContractCard
          title="Alta de contrato"
          description="Creación futura de contratos ligados a cliente, site, frecuencia de servicio y condiciones comerciales."
          href="/contracts/new"
          comingSoon
        />

        <ContractCard
          title="Planes de servicio"
          description="Definición futura de modalidades como mantenimiento mensual, semanal, preventivo o cobertura integral."
          href="/contracts/plans"
          comingSoon
        />

        <ContractCard
          title="Renovaciones"
          description="Gestión futura de vencimientos, renovaciones automáticas, avisos y seguimiento comercial."
          href="/contracts/renewals"
          comingSoon
        />

        <ContractCard
          title="Cobertura y alcance"
          description="Detalle futuro de qué equipos, sites, tareas y frecuencias quedan cubiertos por cada contrato."
          href="/contracts/scope"
          comingSoon
        />

        <ContractCard
          title="Documentación contractual"
          description="Base futura para anexos, PDFs, condiciones firmadas y documentación asociada al servicio."
          href="/contracts/documents"
          comingSoon
        />
      </section>
    </main>
  );
}