import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type SummaryCard = {
  label: string;
  value: string;
  description: string;
};

type FutureFeature = {
  title: string;
  description: string;
};

const warehouseSummary: SummaryCard[] = [
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
  {
    label: 'Facturas asociadas',
    value: '0',
    description: 'Facturas subidas cuando el pedido llegue al almacén.',
  },
];

const futureFeatures: FutureFeature[] = [
  {
    title: 'Stock mínimo automático',
    description:
      'Avisos cuando un material esté por debajo de la cantidad mínima definida.',
  },
  {
    title: 'Ubicación interna',
    description:
      'Zona, estantería, caja o ubicación física del material dentro del almacén.',
  },
  {
    title: 'Material crítico',
    description:
      'Identificación de piezas importantes para trabajos urgentes o clientes prioritarios.',
  },
  {
    title: 'Valoración de stock',
    description:
      'Control futuro de costes, precio medio, stock valorizado y consumo mensual.',
  },
];

function WarehouseIcon(props: IconProps) {
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
      <path d="M3.5 10.2 12 4l8.5 6.2" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M8 20v-7h8v7" />
      <path d="M10 16h4" />
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

function AlertIcon(props: IconProps) {
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
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.5 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function ClipboardIcon(props: IconProps) {
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
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
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

function PlusIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SummaryIcon({ index }: { index: number }) {
  if (index === 0) return <BoxIcon className="h-6 w-6" />;
  if (index === 1) return <AlertIcon className="h-6 w-6" />;
  if (index === 2) return <ClipboardIcon className="h-6 w-6" />;

  return <InvoiceIcon className="h-6 w-6" />;
}

function SummaryCardView({
  item,
  index,
}: {
  item: SummaryCard;
  index: number;
}) {
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

function FutureFeatureCard({ item }: { item: FutureFeature }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/40 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.20)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight text-white">
            {item.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {item.description}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
          Próximo
        </span>
      </div>
    </div>
  );
}

export default function InventoryWarehousePage() {
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

              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                Almacén
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Controla los materiales disponibles, repuestos, consumibles,
                stock mínimo, ubicación interna y piezas críticas para que los
                técnicos puedan cerrar sus trabajos sin retrasos.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <WarehouseIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del almacén
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    stock · materiales · repuestos · ubicación · pedidos
                    pendientes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {warehouseSummary.map((item, index) => (
            <SummaryCardView key={item.label} item={item} index={index} />
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Materiales de almacén
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Esta tabla queda preparada para conectar el inventario real:
                material, categoría, cantidad, stock mínimo, ubicación y estado.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inventory/orders"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                Ver pedidos
              </Link>

              <button
                type="button"
                disabled
                title="Se activará cuando creemos el backend real de almacén."
                className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-500 opacity-70"
              >
                <PlusIcon className="h-4 w-4" />
                Nuevo material
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2">Stock actual</th>
                  <th className="px-4 py-2">Stock mínimo</th>
                  <th className="px-4 py-2">Ubicación</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr className="rounded-2xl bg-slate-950/55 text-sm text-slate-300">
                  <td
                    colSpan={7}
                    className="rounded-2xl border border-slate-800 px-4 py-12 text-center"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                      <WarehouseIcon className="h-8 w-8" />
                    </div>

                    <p className="mt-5 text-lg font-black text-white">
                      Todavía no hay materiales conectados.
                    </p>

                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Primero estamos dejando limpio el diseño y la navegación.
                      Después crearemos el backend real de inventario para
                      registrar materiales, entradas, salidas, pedidos y
                      facturas.
                    </p>

                    <div className="mt-6 flex justify-center">
                      <Link
                        href="/inventory/orders"
                        className="rounded-2xl border border-sky-500/50 bg-sky-500/10 px-5 py-3 text-sm font-black text-sky-200 transition hover:bg-sky-500/20"
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

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Funciones futuras de almacén
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Estas funciones quedan separadas del flujo principal para no
              confundirlas con lo que ya está activo.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {futureFeatures.map((item) => (
              <FutureFeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}