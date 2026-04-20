import Link from 'next/link';

type ReportCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function ReportCard({
  title,
  description,
  href,
  comingSoon,
}: ReportCardProps) {
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

export default function OperationsReportsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Módulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Informes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Centraliza los informes finales de operación, explotación técnica y
              análisis administrativo. Este bloque está pensado para crecer desde
              los partes de trabajo hacia informes por cliente, activo,
              contrato, período y rendimiento.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del módulo</div>
            <div className="mt-1 text-slate-400">
              análisis · cierre · reporting · explotación
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ReportCard
          title="Informes por cliente"
          description="Vista futura de informes agregados por cliente, contrato y período de servicio."
          href="/operations/reports/by-customer"
          comingSoon
        />

        <ReportCard
          title="Informes por activo"
          description="Base futura para analizar incidencias, mantenimiento y rendimiento por equipo."
          href="/operations/reports/by-asset"
          comingSoon
        />

        <ReportCard
          title="Informes por técnico"
          description="Seguimiento futuro del trabajo realizado, tiempos, cierres y productividad por técnico."
          href="/operations/reports/by-technician"
          comingSoon
        />

        <ReportCard
          title="Cierres operativos"
          description="Bloque futuro para cierres mensuales, resúmenes ejecutivos y validación administrativa."
          href="/operations/reports/closures"
          comingSoon
        />

        <ReportCard
          title="KPIs y tendencias"
          description="Evolución futura de indicadores, incidencias recurrentes, tiempos de respuesta y carga operativa."
          href="/operations/reports/kpis"
          comingSoon
        />

        <ReportCard
          title="Exportaciones"
          description="Salida futura a PDF, Excel o entregables para cliente y administración."
          href="/operations/reports/exports"
          comingSoon
        />
      </section>
    </main>
  );
}