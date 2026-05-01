import Link from 'next/link';

const warehouseSummary = [
  {
    label: 'Materiales registrados',
    value: '0',
    description: 'Pendiente de conectar con el modelo real de almacén.',
  },
  {
    label: 'Stock bajo',
    value: '0',
    description: 'Aquí aparecerán materiales por debajo del mínimo.',
  },
  {
    label: 'Pendiente de pedir',
    value: '0',
    description: 'Solicitudes técnicas aún no convertidas en compra.',
  },
];

const warehouseSections = [
  {
    title: 'Stock disponible',
    description:
      'Listado de materiales, repuestos, consumibles y piezas disponibles en almacén.',
    status: 'BASE LISTA',
  },
  {
    title: 'Stock mínimo',
    description:
      'Control de cantidades mínimas para avisar cuándo hay que reponer material.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Ubicación interna',
    description:
      'Estantería, zona, caja o ubicación física del material dentro del almacén.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Material crítico',
    description:
      'Piezas importantes para trabajos urgentes que no deberían quedarse sin stock.',
    status: 'PRÓXIMO',
  },
];

function statusBadgeClass(status: string): string {
  if (status === 'BASE LISTA') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

export default function InventoryWarehousePage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                Inventario
              </p>

              <h1 className="mt-4 text-3xl font-black">Almacén</h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Control de materiales disponibles, stock mínimo, ubicación
                interna y piezas críticas para que los técnicos puedan completar
                sus trabajos sin retrasos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/inventory/orders"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
              >
                Ver pedidos
              </Link>

              <Link
                href="/inventory"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Volver a inventario
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {warehouseSummary.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                {item.label}
              </p>

              <p className="mt-3 text-3xl font-black text-slate-100">
                {item.value}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black">Vista de almacén</h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Esta pantalla queda preparada para el inventario real. El
                siguiente paso será crear el modelo de base de datos para
                materiales de almacén y conectarlo con entradas, salidas y
                pedidos técnicos.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-500 opacity-60"
              title="Se activará cuando creemos el backend de almacén."
            >
              + Nuevo material
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Material</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Stock actual</th>
                  <th className="px-3 py-3">Stock mínimo</th>
                  <th className="px-3 py-3">Ubicación</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b border-slate-800/80 align-top last:border-0">
                  <td colSpan={7} className="px-3 py-10 text-center">
                    <p className="text-base font-black text-slate-200">
                      Todavía no hay materiales de almacén conectados.
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Primero dejaremos listo el menú de inventario. Luego
                      crearemos el backend de almacén, pedidos, movimientos y
                      facturas.
                    </p>

                    <div className="mt-5 flex justify-center gap-2">
                      <Link
                        href="/inventory/orders"
                        className="rounded-2xl border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-black text-sky-200 hover:bg-sky-500/20"
                      >
                        Revisar pedidos técnicos
                      </Link>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {warehouseSections.map((section) => (
            <div
              key={section.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-black text-slate-100">
                  {section.title}
                </h3>

                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusBadgeClass(
                    section.status,
                  )}`}
                >
                  {section.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                {section.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}