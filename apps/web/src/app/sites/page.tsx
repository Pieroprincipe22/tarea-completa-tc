import Link from 'next/link';

type SiteCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function SiteCard({ title, description, href, comingSoon }: SiteCardProps) {
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

export default function SitesPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Submódulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Sites / ubicaciones
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Este bloque organiza las ubicaciones operativas donde se presta el
              servicio: hoteles, edificios, plantas, salas técnicas, locales o
              centros de trabajo. Está pensado para crecer con activos,
              contratos, contactos, planificación y trazabilidad por site.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del submódulo</div>
            <div className="mt-1 text-slate-400">
              ubicaciones · clientes · activos · operación
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SiteCard
          title="Listado de sites"
          description="Vista futura de hoteles, edificios, plantas, salas técnicas o centros vinculados a cada cliente."
          href="/sites/list"
          comingSoon
        />

        <SiteCard
          title="Alta de site"
          description="Creación futura de ubicaciones con dirección, datos operativos, cliente y observaciones."
          href="/sites/new"
          comingSoon
        />

        <SiteCard
          title="Contactos por site"
          description="Base futura para responsables, recepción, mantenimiento interno y contactos operativos del cliente."
          href="/sites/contacts"
          comingSoon
        />

        <SiteCard
          title="Activos del site"
          description="Relación futura de equipos y máquinas instaladas en cada ubicación para trazabilidad completa."
          href="/sites/assets"
          comingSoon
        />

        <SiteCard
          title="Cobertura contractual"
          description="Visión futura del alcance contractual, periodicidad y servicios cubiertos en cada site."
          href="/sites/contracts"
          comingSoon
        />

        <SiteCard
          title="Historial operativo"
          description="Seguimiento futuro de órdenes, partes, incidencias y actividad acumulada por ubicación."
          href="/sites/history"
          comingSoon
        />
      </section>
    </main>
  );
}