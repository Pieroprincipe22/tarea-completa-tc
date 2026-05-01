import Link from 'next/link';

const inventoryModules = [
  {
    title: 'Almacén',
    description:
      'Control de materiales, repuestos, consumibles y stock disponible para los trabajos técnicos.',
    href: '/inventory/warehouse',
    status: 'ACTIVO',
  },
  {
    title: 'Pedidos',
    description:
      'Solicitudes de materiales realizadas desde los partes de trabajo técnicos: cantidad, marca, modelo, referencia, observaciones, fechas y factura.',
    href: '/inventory/orders',
    status: 'ACTIVO',
  },
  {
    title: 'Movimientos de almacén',
    description:
      'Entradas, salidas, devoluciones, asignaciones a órdenes de trabajo y trazabilidad del material.',
    href: '/inventory/movements',
    status: 'PRÓXIMO',
  },
  {
    title: 'Compras y reposiciones',
    description:
      'Control futuro de compras, reposición automática, proveedores, costes y previsión de consumo operativo.',
    href: '/inventory/purchases',
    status: 'PRÓXIMO',
  },
];

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVO') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

export default function InventoryPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
            Sección activa
          </p>

          <h2 className="mt-4 text-xl font-black">Inventario</h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Almacén, pedidos, movimientos y compras para la operación técnica.
          </p>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
              Menú
            </p>

            <nav className="mt-4 space-y-2">
              <Link
                href="/inventory/warehouse"
                className="block rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 hover:bg-sky-500/15"
              >
                <p className="text-sm font-black text-slate-100">Almacén</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Stock disponible y materiales registrados.
                </p>
              </Link>

              <Link
                href="/inventory/orders"
                className="block rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-800"
              >
                <p className="text-sm font-black text-slate-100">Pedidos</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Material solicitado por técnicos.
                </p>
              </Link>

              <Link
                href="/inventory/movements"
                className="block rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-800"
              >
                <p className="text-sm font-black text-slate-100">
                  Movimientos de almacén
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Entradas, salidas y devoluciones.
                </p>
              </Link>

              <Link
                href="/inventory/purchases"
                className="block rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 hover:bg-slate-800"
              >
                <p className="text-sm font-black text-slate-100">
                  Compras y reposiciones
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Compras futuras y reposición.
                </p>
              </Link>
            </nav>
          </div>
        </aside>

        <section className="space-y-6">
          <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                  Módulo
                </p>

                <h1 className="mt-4 text-3xl font-black">
                  Inventario y pedidos
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                  Controla lo que tienes en almacén y lo que necesitas pedir
                  para que el técnico pueda terminar su trabajo sin perder
                  información entre partes, órdenes y compras.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-black text-slate-100">
                  Foco del módulo
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  almacén · pedidos · compras · trazabilidad
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {inventoryModules.map((module) => (
              <Link
                key={module.title}
                href={module.href}
                className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-800/70"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-black text-slate-100">
                    {module.title}
                  </h2>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusBadgeClass(
                      module.status,
                    )}`}
                  >
                    {module.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {module.description}
                </p>

                <span className="mt-5 inline-flex text-sm font-black text-sky-300 group-hover:underline">
                  Abrir módulo →
                </span>
              </Link>
            ))}
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Flujo correcto de pedidos</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-black text-slate-100">
                  1. Técnico informa
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Desde el parte de trabajo indica material exacto, cantidad,
                  marca/modelo, referencia y observación.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-black text-slate-100">
                  2. Admin revisa pedido
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Administración valida qué comprar, fecha de pedido, proveedor
                  y prioridad.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-black text-slate-100">
                  3. Recepción y factura
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Cuando llega el material, se registra fecha de entrega y se
                  adjunta la factura.
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}