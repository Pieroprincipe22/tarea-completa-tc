import Link from 'next/link';

type StockCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function StockCard({
  title,
  description,
  href,
  comingSoon,
}: StockCardProps) {
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

export default function InventoryStockPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Submódulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Inventario y stock
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Este bloque está pensado para gestionar materiales, repuestos,
              consumibles y stock operativo. Separa claramente el inventario de
              almacén de los activos instalados en cliente, y prepara el terreno
              para movimientos, mínimos, asignación a técnicos y compras.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del submódulo</div>
            <div className="mt-1 text-slate-400">
              stock · repuestos · consumibles · trazabilidad
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <StockCard
          title="Listado de stock"
          description="Vista futura de materiales, repuestos y consumibles con cantidad disponible, ubicación y estado."
          href="/inventory/stock/list"
          comingSoon
        />

        <StockCard
          title="Movimientos"
          description="Seguimiento futuro de entradas, salidas, ajustes, consumos y trazabilidad por operación."
          href="/inventory/movements"
          comingSoon
        />

        <StockCard
          title="Stock mínimo"
          description="Control futuro de niveles mínimos, alertas de reposición y prevención de rotura de stock."
          href="/inventory/stock/minimums"
          comingSoon
        />

        <StockCard
          title="Asignación a técnicos"
          description="Relación futura del material entregado a cada técnico para intervención y mantenimiento."
          href="/inventory/technician-stock"
          comingSoon
        />

        <StockCard
          title="Compras y reposición"
          description="Base futura para solicitudes de compra, reposición operativa y previsión de consumo."
          href="/inventory/purchasing"
          comingSoon
        />

        <StockCard
          title="Ubicaciones de almacén"
          description="Estructura futura para organizar el stock por almacén, vehículo, site o zona técnica."
          href="/inventory/locations"
          comingSoon
        />
      </section>
    </main>
  );
}