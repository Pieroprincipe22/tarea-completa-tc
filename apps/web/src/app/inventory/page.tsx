import Link from 'next/link';

type AssetCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function AssetCard({
  title,
  description,
  href,
  comingSoon,
}: AssetCardProps) {
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

export default function InventoryPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Módulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Activos e inventario
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Centraliza la gestión de equipos, inventario, ubicaciones y stock
              operativo. Esta estructura está pensada para crecer sin mezclar
              datos técnicos, materiales y sites en un único módulo desordenado.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del módulo</div>
            <div className="mt-1 text-slate-400">
              Equipos · repuestos · stock · ubicaciones
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <AssetCard
          title="Inventario"
          description="Control futuro de materiales, repuestos, consumibles, entradas, salidas y stock mínimo."
          href="/inventory"
        />

        <AssetCard
          title="Equipos / activos"
          description="Registro de máquinas, fan coils, calderas, bombas, climatización y otros activos instalados."
          href="/assets"
          comingSoon
        />

        <AssetCard
          title="Sites / ubicaciones"
          description="Gestión de edificios, hoteles, plantas, salas técnicas y ubicaciones operativas del cliente."
          href="/sites"
          comingSoon
        />

        <AssetCard
          title="Movimientos de almacén"
          description="Historial futuro de entradas, salidas, asignación a work orders y trazabilidad de material."
          href="/inventory/movements"
          comingSoon
        />

        <AssetCard
          title="Stock por técnico"
          description="Control futuro de material asignado a cada técnico para intervención y mantenimiento."
          href="/inventory/technician-stock"
          comingSoon
        />

        <AssetCard
          title="Compras y reposición"
          description="Base futura para compras, reposición automática y previsión de consumo por operación."
          href="/inventory/purchasing"
          comingSoon
        />
      </section>
    </main>
  );
}