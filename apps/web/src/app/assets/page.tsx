import Link from 'next/link';

type AssetModuleCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function AssetModuleCard({
  title,
  description,
  href,
  comingSoon,
}: AssetModuleCardProps) {
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

export default function AssetsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Submódulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Equipos / activos
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Este bloque agrupa las máquinas, equipos y activos instalados en
              cliente, site o ubicación técnica. Está preparado para crecer con
              historial, mantenimiento asociado, incidencias, documentación y
              trazabilidad completa del ciclo de vida del equipo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del submódulo</div>
            <div className="mt-1 text-slate-400">
              máquinas · historial · trazabilidad · documentación
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <AssetModuleCard
          title="Listado de activos"
          description="Vista futura de equipos registrados, estado, site, cliente, marca, modelo y código interno."
          href="/assets/list"
          comingSoon
        />

        <AssetModuleCard
          title="Alta de activo"
          description="Creación futura de máquinas, equipos e instalaciones vinculadas a cliente y ubicación."
          href="/assets/new"
          comingSoon
        />

        <AssetModuleCard
          title="Ficha técnica"
          description="Base futura para datos de marca, modelo, serie, ubicación, instalación y observaciones."
          href="/assets/specs"
          comingSoon
        />

        <AssetModuleCard
          title="Historial del equipo"
          description="Seguimiento futuro de work orders, partes, incidencias y mantenimiento por activo."
          href="/assets/history"
          comingSoon
        />

        <AssetModuleCard
          title="Documentación"
          description="Bloque futuro para manuales, fichas técnicas, garantías, anexos y archivos asociados."
          href="/assets/documents"
          comingSoon
        />

        <AssetModuleCard
          title="Estado operativo"
          description="Gestión futura de activo en uso, mantenimiento, retirado, averiado o fuera de servicio."
          href="/assets/status"
          comingSoon
        />
      </section>
    </main>
  );
}