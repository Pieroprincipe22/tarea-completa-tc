import Link from 'next/link';

const purchaseSummary = [
  {
    label: 'Compras pendientes',
    value: '0',
    description: 'Pedidos aprobados que todavía no se han comprado.',
  },
  {
    label: 'Reposiciones necesarias',
    value: '0',
    description: 'Materiales que deberán reponerse por stock bajo.',
  },
  {
    label: 'Facturas pendientes',
    value: '0',
    description: 'Compras recibidas sin factura adjunta.',
  },
];

const purchaseFlow = [
  {
    title: '1. Solicitud técnica',
    description:
      'El técnico indica desde el parte qué material necesita, con cantidad, marca/modelo, referencia y observación.',
  },
  {
    title: '2. Validación administrativa',
    description:
      'Administración revisa la solicitud, comprueba stock, decide si se compra y define prioridad.',
  },
  {
    title: '3. Compra al proveedor',
    description:
      'Se registra proveedor, coste, fecha de pedido, número de factura o albarán si aplica.',
  },
  {
    title: '4. Recepción en almacén',
    description:
      'Cuando llega el material, se registra fecha de entrega y se actualiza el stock disponible.',
  },
  {
    title: '5. Factura adjunta',
    description:
      'La factura se sube al sistema para dejar trazabilidad contable y operativa.',
  },
];

const plannedFeatures = [
  {
    title: 'Proveedor',
    description:
      'Nombre del proveedor, contacto, correo, teléfono y condiciones de compra.',
  },
  {
    title: 'Coste',
    description:
      'Precio unitario, precio total, impuestos, moneda y coste final de compra.',
  },
  {
    title: 'Factura',
    description:
      'Subida de factura o albarán relacionado con el pedido recibido.',
  },
  {
    title: 'Reposición automática',
    description:
      'Aviso cuando el stock quede por debajo del mínimo definido.',
  },
];

export default function InventoryPurchasesPage() {
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
                Compras y reposiciones
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Control de compras, reposiciones, proveedores, costes, facturas
                y recepción de materiales. Esta sección conectará los pedidos
                técnicos con el almacén y la administración.
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
          {purchaseSummary.map((item) => (
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
              <h2 className="text-xl font-black">Compras registradas</h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Todavía no está conectado al backend. Luego crearemos el modelo
                de compras para registrar proveedor, coste, factura, fecha de
                pedido, fecha de entrega y estado de recepción.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-500 opacity-60"
              title="Se activará cuando creemos el backend de compras."
            >
              + Nueva compra
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Fecha pedido</th>
                  <th className="px-3 py-3">Proveedor</th>
                  <th className="px-3 py-3">Material</th>
                  <th className="px-3 py-3">Cantidad</th>
                  <th className="px-3 py-3">Coste</th>
                  <th className="px-3 py-3">Entrega prevista</th>
                  <th className="px-3 py-3">Entrega real</th>
                  <th className="px-3 py-3">Factura</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b border-slate-800/80 align-top last:border-0">
                  <td colSpan={9} className="px-3 py-10 text-center">
                    <p className="text-base font-black text-slate-200">
                      Todavía no hay compras registradas.
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Cuando conectemos el backend, aquí se verá cada compra,
                      proveedor, coste, recepción y factura.
                    </p>

                    <div className="mt-5 flex justify-center gap-2">
                      <Link
                        href="/inventory/orders"
                        className="rounded-2xl border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-black text-sky-200 hover:bg-sky-500/20"
                      >
                        Revisar pedidos técnicos
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
          <h2 className="text-xl font-black">Flujo de compra y reposición</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {purchaseFlow.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <p className="text-sm font-black text-slate-100">
                  {item.title}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plannedFeatures.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
            >
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-300">
                PRÓXIMO
              </span>

              <h3 className="mt-4 text-lg font-black text-slate-100">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}