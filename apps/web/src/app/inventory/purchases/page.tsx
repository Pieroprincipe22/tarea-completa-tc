import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type SummaryItem = {
  label: string;
  value: string;
  description: string;
};

type PurchaseFlowStep = {
  title: string;
  description: string;
};

type PlannedFeature = {
  title: string;
  description: string;
};

const purchaseSummary: SummaryItem[] = [
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
  {
    label: 'Proveedores activos',
    value: '0',
    description: 'Proveedores conectados al módulo de compras.',
  },
];

const purchaseFlow: PurchaseFlowStep[] = [
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

const plannedFeatures: PlannedFeature[] = [
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

function CartIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 5h2l2.2 10.5a2 2 0 0 0 2 1.5h6.9a2 2 0 0 0 1.9-1.4L21 9H7.2" />
      <path d="M10 21h.01" />
      <path d="M18 21h.01" />
    </svg>
  );
}

function InvoiceIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function BoxIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function SupplierIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 21h18" />
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  );
}

function SummaryIcon({ index }: { index: number }) {
  if (index === 0) return <CartIcon className="h-6 w-6" />;
  if (index === 1) return <BoxIcon className="h-6 w-6" />;
  if (index === 2) return <InvoiceIcon className="h-6 w-6" />;

  return <SupplierIcon className="h-6 w-6" />;
}

function SummaryCard({ item, index }: { item: SummaryItem; index: number }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-400">
          <SummaryIcon index={index} />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {item.label}
          </p>

          <p className="mt-2 text-3xl font-black tracking-tight text-white">
            {item.value}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowStepCard({ item }: { item: PurchaseFlowStep }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-950/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.18)]">
      <p className="text-sm font-black text-white">{item.title}</p>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {item.description}
      </p>
    </div>
  );
}

function PlannedFeatureCard({ item }: { item: PlannedFeature }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/40 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.20)]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-black tracking-tight text-white">
          {item.title}
        </h3>

        <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
          Próximo
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-slate-400">
        {item.description}
      </p>
    </div>
  );
}

export default function InventoryPurchasesPage() {
  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/40 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%)]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.07)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Inventario
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-black tracking-tight text-white">
                  Compras y reposición
                </h1>

                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                  Próximamente
                </span>
              </div>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Controlará compras, reposiciones, proveedores, costes, facturas
                y recepción de materiales. Esta sección conectará los pedidos
                técnicos con almacén y administración.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <CartIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    compras · proveedores · costes · facturas · reposición
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {purchaseSummary.map((item, index) => (
            <SummaryCard key={item.label} item={item} index={index} />
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Compras registradas
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Esta tabla queda preparada para conectar proveedor, coste,
                factura, fecha de pedido, fecha de entrega y estado de
                recepción.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inventory/orders"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                Ver pedidos
              </Link>

              <Link
                href="/inventory/warehouse"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
              >
                Ver almacén
              </Link>

              <button
                type="button"
                disabled
                title="Se activará cuando creemos el backend de compras."
                className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-500 opacity-70"
              >
                + Nueva compra
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2">Fecha pedido</th>
                  <th className="px-4 py-2">Proveedor</th>
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2">Cantidad</th>
                  <th className="px-4 py-2">Coste</th>
                  <th className="px-4 py-2">Entrega prevista</th>
                  <th className="px-4 py-2">Entrega real</th>
                  <th className="px-4 py-2">Factura</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr className="rounded-2xl bg-slate-950/55 text-sm text-slate-300">
                  <td
                    colSpan={9}
                    className="rounded-2xl border border-slate-800 px-4 py-12 text-center"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                      <CartIcon className="h-8 w-8" />
                    </div>

                    <p className="mt-5 text-lg font-black text-white">
                      Todavía no hay compras registradas.
                    </p>

                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Cuando conectemos el backend, aquí se verá cada compra,
                      proveedor, coste, recepción y factura asociada.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Flujo de compra y reposición
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Este flujo conectará las solicitudes técnicas con el almacén, los
              proveedores, la recepción de material y la factura.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            {purchaseFlow.map((item) => (
              <FlowStepCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Funciones futuras de compras
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plannedFeatures.map((item) => (
              <PlannedFeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}