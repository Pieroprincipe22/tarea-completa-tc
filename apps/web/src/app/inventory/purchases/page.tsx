import Link from 'next/link';
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type MetricTone = 'blue' | 'violet' | 'amber' | 'cyan' | 'emerald' | 'rose';

type PurchaseRow = {
  date: string;
  supplier: string;
  material: string;
  code: string;
  quantity: string;
  cost: string;
  expectedDelivery: string;
  deliveredAt: string;
  invoice: 'Pendiente' | 'Subida';
  status: 'Pendiente' | 'En tránsito' | 'Recibida';
  tone: MetricTone;
};

type FlowStep = {
  title: string;
  description: string;
  tone: MetricTone;
};

type PlannedFeature = {
  title: string;
  description: string;
  tone: MetricTone;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function CartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 5h2l2.2 10.5a2 2 0 0 0 2 1.5h6.9a2 2 0 0 0 1.9-1.4L21 9H7.2" />
      <path d="M10 21h.01" />
      <path d="M18 21h.01" />
    </svg>
  );
}

function InvoiceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function BoxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function SupplierIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  );
}

function TruckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 6h11v10H3V6Z" />
      <path d="M14 10h4l3 3v3h-7v-6Z" />
      <path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m21 21-4.3-4.3" />
      <path d="M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z" />
    </svg>
  );
}

function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function getToneClasses(tone: MetricTone) {
  if (tone === 'violet') {
    return 'border-violet-400/30 bg-violet-500/15 text-violet-300';
  }

  if (tone === 'amber') {
    return 'border-amber-400/30 bg-amber-500/15 text-amber-300';
  }

  if (tone === 'cyan') {
    return 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300';
  }

  if (tone === 'emerald') {
    return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300';
  }

  if (tone === 'rose') {
    return 'border-rose-400/30 bg-rose-500/15 text-rose-300';
  }

  return 'border-blue-400/30 bg-blue-600/20 text-blue-300';
}

const purchases: PurchaseRow[] = [
  {
    date: '10/05/2026',
    supplier: 'ClimaParts Madrid',
    material: 'Filtro de aire MERV 13',
    code: 'FIL-MERV13',
    quantity: '100 unidades',
    cost: '$ 3,000.00',
    expectedDelivery: '12/05/2026',
    deliveredAt: 'Pendiente',
    invoice: 'Pendiente',
    status: 'En tránsito',
    tone: 'blue',
  },
  {
    date: '09/05/2026',
    supplier: 'Repuestos HVAC Pro',
    material: 'Correa 4PK 1230',
    code: 'COR-4PK1230',
    quantity: '25 unidades',
    cost: '$ 750.00',
    expectedDelivery: '11/05/2026',
    deliveredAt: '10/05/2026',
    invoice: 'Subida',
    status: 'Recibida',
    tone: 'emerald',
  },
  {
    date: '08/05/2026',
    supplier: 'Frío Industrial SL',
    material: 'Gas refrigerante R-410A',
    code: 'GAS-R410A',
    quantity: '10 unidades',
    cost: '$ 900.00',
    expectedDelivery: '13/05/2026',
    deliveredAt: 'Pendiente',
    invoice: 'Pendiente',
    status: 'Pendiente',
    tone: 'amber',
  },
];

const purchaseFlow: FlowStep[] = [
  {
    title: '1. Solicitud técnica',
    description:
      'El técnico indica desde el parte qué material necesita, con cantidad, marca/modelo, referencia y observación.',
    tone: 'blue',
  },
  {
    title: '2. Validación administrativa',
    description:
      'Administración revisa la solicitud, comprueba stock y define prioridad.',
    tone: 'violet',
  },
  {
    title: '3. Compra al proveedor',
    description:
      'Se registra proveedor, coste, fecha de pedido, factura o albarán si aplica.',
    tone: 'amber',
  },
  {
    title: '4. Recepción en almacén',
    description:
      'Cuando llega el material, se registra fecha de entrega y se actualiza el stock.',
    tone: 'cyan',
  },
  {
    title: '5. Factura adjunta',
    description:
      'La factura se sube al sistema para dejar trazabilidad contable y operativa.',
    tone: 'emerald',
  },
];

const plannedFeatures: PlannedFeature[] = [
  {
    title: 'Proveedor',
    description:
      'Nombre del proveedor, contacto, correo, teléfono y condiciones de compra.',
    tone: 'blue',
  },
  {
    title: 'Coste',
    description:
      'Precio unitario, precio total, impuestos, moneda y coste final de compra.',
    tone: 'emerald',
  },
  {
    title: 'Factura',
    description:
      'Subida de factura o albarán relacionado con el pedido recibido.',
    tone: 'amber',
  },
  {
    title: 'Reposición automática',
    description:
      'Aviso cuando el stock quede por debajo del mínimo definido.',
    tone: 'rose',
  },
];

function MetricCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone: MetricTone;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
      <div className="flex items-start gap-4">
        <div
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
            getToneClasses(tone),
          )}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-300">{title}</p>

          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {value}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowStepCard({ item }: { item: FlowStep }) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
      <div
        className={cx(
          'mb-4 flex h-11 w-11 items-center justify-center rounded-xl border',
          getToneClasses(item.tone),
        )}
      >
        <CartIcon className="h-5 w-5" />
      </div>

      <p className="text-sm font-black text-white">{item.title}</p>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {item.description}
      </p>
    </div>
  );
}

function PlannedFeatureCard({ item }: { item: PlannedFeature }) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
      <div className="flex items-start gap-4">
        <div
          className={cx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
            getToneClasses(item.tone),
          )}
        >
          <BoxIcon className="h-6 w-6" />
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-black tracking-tight text-white">
              {item.title}
            </h3>

            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
              Próximo
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, tone }: { status: PurchaseRow['status']; tone: MetricTone }) {
  return (
    <span
      className={cx(
        'inline-flex rounded-lg px-3 py-1 text-xs font-black',
        getToneClasses(tone),
      )}
    >
      {status}
    </span>
  );
}

function InvoiceBadge({ invoice }: { invoice: PurchaseRow['invoice'] }) {
  return (
    <span
      className={cx(
        'inline-flex rounded-lg px-3 py-1 text-xs font-black',
        invoice === 'Subida'
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'bg-amber-500/15 text-amber-300',
      )}
    >
      {invoice}
    </span>
  );
}

export default function InventoryPurchasesPage() {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#080f1d] px-6 py-6 text-slate-100">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-600/20 text-blue-300 shadow-[0_0_35px_rgba(37,99,235,0.20)]">
              <CartIcon className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                Compras
              </h1>

              <p className="mt-2 text-base text-slate-400">
                Controla proveedores, costes, facturas, recepción y reposición.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0c1728] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-blue-400/50 hover:bg-blue-600/10"
            >
              Volver a inventario
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_35px_rgba(37,99,235,0.32)] transition hover:bg-blue-500"
            >
              <PlusIcon className="h-4 w-4" />
              Nueva compra
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Compras pendientes"
            value="7"
            description="Pedidos aprobados todavía no comprados."
            icon={<CartIcon className="h-7 w-7" />}
            tone="blue"
          />

          <MetricCard
            title="Reposiciones necesarias"
            value="18"
            description="Materiales por debajo del stock mínimo."
            icon={<BoxIcon className="h-7 w-7" />}
            tone="rose"
          />

          <MetricCard
            title="Facturas pendientes"
            value="4"
            description="Compras recibidas sin factura adjunta."
            icon={<InvoiceIcon className="h-7 w-7" />}
            tone="amber"
          />

          <MetricCard
            title="Proveedores activos"
            value="12"
            description="Proveedores conectados al módulo."
            icon={<SupplierIcon className="h-7 w-7" />}
            tone="cyan"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
            <div className="flex flex-col gap-4 border-b border-slate-800/90 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Compras registradas
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Proveedor, material, coste, entrega, recepción y factura.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    placeholder="Buscar compra..."
                    className="h-11 w-full rounded-xl border border-slate-700 bg-[#080f1d] pl-11 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#080f1d] px-4 text-sm font-bold text-slate-300 transition hover:border-blue-400/50 hover:text-white"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filtros
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1180px] text-left">
                <thead className="bg-[#101c30] text-sm text-slate-300">
                  <tr>
                    <th className="px-5 py-4 font-black">Fecha pedido</th>
                    <th className="px-5 py-4 font-black">Proveedor</th>
                    <th className="px-5 py-4 font-black">Material</th>
                    <th className="px-5 py-4 font-black">Cantidad</th>
                    <th className="px-5 py-4 font-black">Coste</th>
                    <th className="px-5 py-4 font-black">Entrega prevista</th>
                    <th className="px-5 py-4 font-black">Entrega real</th>
                    <th className="px-5 py-4 font-black">Estado</th>
                    <th className="px-5 py-4 font-black">Factura</th>
                    <th className="px-5 py-4 font-black">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {purchases.map((row) => (
                    <tr
                      key={`${row.date}-${row.code}`}
                      className="border-t border-slate-800/80 text-sm text-slate-300"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-200">
                        {row.date}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-white">{row.supplier}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Proveedor activo
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-white">{row.material}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.code}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-black text-white">
                        {row.quantity}
                      </td>

                      <td className="px-5 py-4 font-black text-white">
                        {row.cost}
                      </td>

                      <td className="px-5 py-4">{row.expectedDelivery}</td>

                      <td className="px-5 py-4">{row.deliveredAt}</td>

                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} tone={row.tone} />
                      </td>

                      <td className="px-5 py-4">
                        <InvoiceBadge invoice={row.invoice} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-[#080f1d] text-slate-300 transition hover:border-blue-400/50 hover:text-blue-300"
                          aria-label={`Ver compra de ${row.material}`}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
              <h2 className="text-lg font-black text-white">
                Acciones rápidas
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/inventory/orders"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver pedidos
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/warehouse"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver almacén
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/movements"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver movimientos
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
              <h2 className="text-lg font-black text-white">
                Recepción
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-[#080f1d] p-3">
                  <TruckIcon className="h-5 w-5 text-blue-300" />
                  <div>
                    <p className="text-sm font-black text-white">En tránsito</p>
                    <p className="text-xs text-slate-500">1 compra abierta</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[#080f1d] p-3">
                  <InvoiceIcon className="h-5 w-5 text-amber-300" />
                  <div>
                    <p className="text-sm font-black text-white">Facturas</p>
                    <p className="text-xs text-slate-500">4 pendientes</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
          <div className="mb-5">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Flujo de compra y reposición
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Este flujo conecta solicitudes técnicas con almacén, proveedores,
              recepción de material y facturas.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {purchaseFlow.map((item) => (
              <FlowStepCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plannedFeatures.map((item) => (
            <PlannedFeatureCard key={item.title} item={item} />
          ))}
        </section>
      </div>
    </main>
  );
}