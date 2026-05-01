import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type SummaryItem = {
  label: string;
  value: string;
  description: string;
};

type MovementType = {
  title: string;
  description: string;
  example: string;
};

const movementSummary: SummaryItem[] = [
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
    label: 'Devoluciones',
    value: '0',
    description: 'Material devuelto al almacén porque no se usó.',
  },
  {
    label: 'Ajustes pendientes',
    value: '0',
    description: 'Correcciones manuales de stock por revisar.',
  },
];

const movementTypes: MovementType[] = [
  {
    title: 'Entrada de almacén',
    description:
      'Registro de material recibido: compra, reposición, devolución de proveedor o entrada manual.',
    example: 'Ejemplo: llegan 10 filtros fan coil al almacén.',
  },
  {
    title: 'Salida a técnico',
    description:
      'Material retirado del almacén para que un técnico realice una orden de trabajo.',
    example: 'Ejemplo: técnico retira 2 filtros para habitación 201.',
  },
  {
    title: 'Asignación a orden',
    description:
      'Material vinculado directamente a una orden de trabajo o parte técnico.',
    example: 'Ejemplo: válvula asignada a OT de reparación de fan coil.',
  },
  {
    title: 'Devolución',
    description:
      'Material que el técnico devuelve porque no se usó o estaba incorrecto.',
    example: 'Ejemplo: repuesto no compatible vuelve al almacén.',
  },
  {
    title: 'Ajuste de stock',
    description:
      'Corrección manual por inventario físico, error de conteo o pérdida de material.',
    example: 'Ejemplo: stock real 4 unidades, sistema marcaba 5.',
  },
  {
    title: 'Material dañado',
    description:
      'Registro de piezas defectuosas, rotas o no utilizables.',
    example: 'Ejemplo: termostato recibido con pantalla dañada.',
  },
];

function MovementIcon(props: IconProps) {
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
      <path d="M7 4v16" />
      <path d="m3.5 16.5 3.5 3.5 3.5-3.5" />
      <path d="M17 20V4" />
      <path d="m13.5 7.5 3.5-3.5 3.5 3.5" />
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

function OutIcon(props: IconProps) {
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
      <path d="M4 12h13" />
      <path d="m12 7 5 5-5 5" />
      <path d="M4 5h4" />
      <path d="M4 19h4" />
    </svg>
  );
}

function ReturnIcon(props: IconProps) {
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
      <path d="M9 7H5v4" />
      <path d="M5 11c2-4 6.5-6 10.5-4A7 7 0 0 1 19 17" />
      <path d="M19 17h-4" />
    </svg>
  );
}

function AdjustIcon(props: IconProps) {
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
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M14 5v4" />
      <path d="M10 15v4" />
    </svg>
  );
}

function SummaryIcon({ index }: { index: number }) {
  if (index === 0) return <BoxIcon className="h-6 w-6" />;
  if (index === 1) return <OutIcon className="h-6 w-6" />;
  if (index === 2) return <ReturnIcon className="h-6 w-6" />;

  return <AdjustIcon className="h-6 w-6" />;
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

function MovementTypeCard({ item }: { item: MovementType }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-950/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.20)]">
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

      <p className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs leading-6 text-slate-500">
        {item.example}
      </p>
    </div>
  );
}

export default function InventoryMovementsPage() {
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
                  Movimientos de almacén
                </h1>

                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
                  Próximamente
                </span>
              </div>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                Controlará entradas, salidas, devoluciones y ajustes de stock.
                Será la trazabilidad completa de cada material: quién lo pidió,
                quién lo retiró, para qué orden se usó y cuándo volvió o se
                consumió.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <MovementIcon className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Foco del módulo
                  </p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    entradas · salidas · devoluciones · ajustes · trazabilidad
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {movementSummary.map((item, index) => (
            <SummaryCard key={item.label} item={item} index={index} />
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Historial de movimientos
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Esta tabla queda preparada para conectar el backend real de
                entradas, salidas, devoluciones y ajustes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inventory/warehouse"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-500/25"
              >
                Ver almacén
              </Link>

              <Link
                href="/inventory/orders"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
              >
                Ver pedidos
              </Link>

              <button
                type="button"
                disabled
                title="Se activará cuando creemos el backend de movimientos."
                className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 px-4 text-sm font-black text-slate-500 opacity-70"
              >
                + Nuevo movimiento
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Material</th>
                  <th className="px-4 py-2">Cantidad</th>
                  <th className="px-4 py-2">Técnico / usuario</th>
                  <th className="px-4 py-2">Orden relacionada</th>
                  <th className="px-4 py-2">Observación</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                <tr className="rounded-2xl bg-slate-950/55 text-sm text-slate-300">
                  <td
                    colSpan={8}
                    className="rounded-2xl border border-slate-800 px-4 py-12 text-center"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                      <MovementIcon className="h-8 w-8" />
                    </div>

                    <p className="mt-5 text-lg font-black text-white">
                      Todavía no hay movimientos de almacén.
                    </p>

                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Cuando conectemos el backend, aquí se verá cada entrada,
                      salida, devolución y ajuste de stock con su técnico,
                      usuario, orden relacionada y observación.
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
              Tipos de movimientos que controlará el sistema
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Estos movimientos se conectarán al backend real de inventario
              cuando creemos el modelo de almacén.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {movementTypes.map((item) => (
              <MovementTypeCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}