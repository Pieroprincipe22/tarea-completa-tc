import Link from 'next/link';

const movementSummary = [
  {
    label: 'Entradas registradas',
    value: '0',
    description: 'Material que entra al almacén por compra o reposición.',
  },
  {
    label: 'Salidas registradas',
    value: '0',
    description: 'Material entregado a técnicos u órdenes de trabajo.',
  },
  {
    label: 'Ajustes pendientes',
    value: '0',
    description: 'Correcciones manuales de stock por revisar.',
  },
];

const movementTypes = [
  {
    title: 'Entrada de almacén',
    description:
      'Registro de material recibido: compra, reposición, devolución de proveedor o entrada manual.',
    example: 'Ejemplo: llegan 10 filtros fan coil al almacén.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Salida a técnico',
    description:
      'Material retirado del almacén para que un técnico realice una orden de trabajo.',
    example: 'Ejemplo: técnico retira 2 filtros para habitación 201.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Asignación a orden',
    description:
      'Material vinculado directamente a una orden de trabajo o parte técnico.',
    example: 'Ejemplo: válvula asignada a OT de reparación de fan coil.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Devolución',
    description:
      'Material que el técnico devuelve porque no se usó o estaba incorrecto.',
    example: 'Ejemplo: repuesto no compatible vuelve al almacén.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Ajuste de stock',
    description:
      'Corrección manual por inventario físico, error de conteo o pérdida de material.',
    example: 'Ejemplo: stock real 4 unidades, sistema marcaba 5.',
    status: 'PRÓXIMO',
  },
  {
    title: 'Material dañado',
    description:
      'Registro de piezas defectuosas, rotas o no utilizables.',
    example: 'Ejemplo: termostato recibido con pantalla dañada.',
    status: 'PRÓXIMO',
  },
];

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVO') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
  }

  return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
}

export default function InventoryMovementsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                Inventario
              </p>

              <h1 className="mt-4 text-3xl font-black">
                Movimientos de almacén
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Controla entradas, salidas, devoluciones y ajustes de stock.
                Esta pantalla será la trazabilidad completa de cada material:
                quién lo pidió, quién lo retiró, para qué orden se usó y cuándo
                volvió o se consumió.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/inventory/warehouse"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
              >
                Ver almacén
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
          {movementSummary.map((item) => (
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
              <h2 className="text-xl font-black">Historial de movimientos</h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Todavía no está conectado al backend. Primero estamos dejando
                lista la estructura visual del módulo. Después crearemos los
                modelos de base de datos para registrar cada entrada, salida,
                devolución y ajuste.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-500 opacity-60"
              title="Se activará cuando creemos el backend de movimientos."
            >
              + Nuevo movimiento
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Material</th>
                  <th className="px-3 py-3">Cantidad</th>
                  <th className="px-3 py-3">Técnico / usuario</th>
                  <th className="px-3 py-3">Orden relacionada</th>
                  <th className="px-3 py-3">Observación</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b border-slate-800/80 align-top last:border-0">
                  <td colSpan={8} className="px-3 py-10 text-center">
                    <p className="text-base font-black text-slate-200">
                      Todavía no hay movimientos de almacén.
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Cuando conectemos el backend, aquí se verá cada entrada,
                      salida, devolución y ajuste de stock.
                    </p>

                    <div className="mt-5 flex justify-center gap-2">
                      <Link
                        href="/inventory/orders"
                        className="rounded-2xl border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-black text-sky-200 hover:bg-sky-500/20"
                      >
                        Ver pedidos técnicos
                      </Link>

                      <Link
                        href="/inventory/warehouse"
                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-200 hover:bg-slate-800"
                      >
                        Ver almacén
                      </Link>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black">
            Tipos de movimientos que controlará el sistema
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {movementTypes.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-800 bg-slate-950 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-black text-slate-100">
                    {item.title}
                  </h3>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black ${statusBadgeClass(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {item.description}
                </p>

                <p className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs leading-6 text-slate-500">
                  {item.example}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}