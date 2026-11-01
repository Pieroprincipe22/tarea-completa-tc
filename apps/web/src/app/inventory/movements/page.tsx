import Link from 'next/link';
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type MetricTone = 'blue' | 'violet' | 'amber' | 'cyan' | 'emerald' | 'rose';

type MovementRow = {
  date: string;
  type: 'Entrada' | 'Salida' | 'Devolución' | 'Ajuste';
  material: string;
  code: string;
  quantity: string;
  user: string;
  order: string;
  observation: string;
  tone: MetricTone;
};

type MovementType = {
  title: string;
  description: string;
  example: string;
  tone: MetricTone;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function MovementIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M7 4v16" />
      <path d="m3.5 16.5 3.5 3.5 3.5-3.5" />
      <path d="M17 20V4" />
      <path d="m13.5 7.5 3.5-3.5 3.5 3.5" />
    </svg>
  );
}

function CubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function OutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M4 12h13" />
      <path d="m12 7 5 5-5 5" />
      <path d="M4 5h4" />
      <path d="M4 19h4" />
    </svg>
  );
}

function ReturnIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M9 7H5v4" />
      <path d="M5 11c2-4 6.5-6 10.5-4A7 7 0 0 1 19 17" />
      <path d="M19 17h-4" />
    </svg>
  );
}

function AdjustIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <path d="M14 5v4" />
      <path d="M10 15v4" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="m21 21-4.3-4.3" />
      <path d="M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z" />
    </svg>
  );
}

function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.9"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function getToneClasses(tone: MetricTone) {
  if (tone === 'violet') {
    return 'border-special/30 bg-special-soft text-special';
  }

  if (tone === 'amber') {
    return 'border-warning/30 bg-warning-soft text-warning';
  }

  if (tone === 'cyan') {
    return 'border-accent/30 bg-accent-soft text-accent';
  }

  if (tone === 'emerald') {
    return 'border-success/30 bg-success-soft text-success';
  }

  if (tone === 'rose') {
    return 'border-danger/30 bg-danger-soft text-danger';
  }

  return 'border-accent/30 bg-accent-soft text-accent';
}

const movementRows: MovementRow[] = [
  {
    date: '10/05/2026',
    type: 'Entrada',
    material: 'Filtro de aire MERV 13',
    code: 'FIL-MERV13',
    quantity: '+100 unidades',
    user: 'Admin almacén',
    order: 'COMP-2026-0087',
    observation: 'Entrada por compra a proveedor.',
    tone: 'emerald',
  },
  {
    date: '10/05/2026',
    type: 'Salida',
    material: 'Correa 4PK 1230',
    code: 'COR-4PK1230',
    quantity: '-2 unidades',
    user: 'Técnico asignado',
    order: 'OT-1256',
    observation: 'Salida para mantenimiento correctivo.',
    tone: 'blue',
  },
  {
    date: '09/05/2026',
    type: 'Devolución',
    material: 'Termostato digital',
    code: 'THERM-DIG',
    quantity: '+1 unidad',
    user: 'Técnico asignado',
    order: 'OT-1249',
    observation: 'Material no utilizado.',
    tone: 'violet',
  },
  {
    date: '08/05/2026',
    type: 'Ajuste',
    material: 'Gas refrigerante R-410A',
    code: 'GAS-R410A',
    quantity: '-1 unidad',
    user: 'Supervisor',
    order: 'Inventario físico',
    observation: 'Ajuste por revisión física de almacén.',
    tone: 'amber',
  },
];

const movementTypes: MovementType[] = [
  {
    title: 'Entrada de almacén',
    description:
      'Registro de material recibido por compra, reposición, devolución de proveedor o entrada manual.',
    example: 'Ejemplo: llegan 10 filtros fan coil al almacén.',
    tone: 'emerald',
  },
  {
    title: 'Salida a técnico',
    description:
      'Material retirado del almacén para que un técnico realice una orden de trabajo.',
    example: 'Ejemplo: técnico retira 2 filtros para habitación 201.',
    tone: 'blue',
  },
  {
    title: 'Asignación a orden',
    description:
      'Material vinculado directamente a una orden de trabajo o parte técnico.',
    example: 'Ejemplo: válvula asignada a OT de reparación de fan coil.',
    tone: 'cyan',
  },
  {
    title: 'Devolución',
    description:
      'Material que el técnico devuelve porque no se usó o estaba incorrecto.',
    example: 'Ejemplo: repuesto no compatible vuelve al almacén.',
    tone: 'violet',
  },
  {
    title: 'Ajuste de stock',
    description:
      'Corrección manual por inventario físico, error de conteo o pérdida de material.',
    example: 'Ejemplo: stock real 4 unidades, sistema marcaba 5.',
    tone: 'amber',
  },
  {
    title: 'Material dañado',
    description:
      'Registro de piezas defectuosas, rotas o no utilizables.',
    example: 'Ejemplo: termostato recibido con pantalla dañada.',
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
    <div className="rounded-lg border border-line bg-surface-2 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border',
            getToneClasses(tone),
          )}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-ink-2">{title}</p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            {value}
          </p>

          <p className="mt-2 text-sm leading-6 text-subtle">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function MovementTypeCard({ item }: { item: MovementType }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={cx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border',
            getToneClasses(item.tone),
          )}
        >
          <MovementIcon className="h-6 w-6" />
        </div>

        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            {item.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted">
            {item.description}
          </p>

          <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-xs leading-5 text-subtle">
            {item.example}
          </p>
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type, tone }: { type: MovementRow['type']; tone: MetricTone }) {
  return (
    <span
      className={cx(
        'inline-flex rounded-lg px-3 py-1 text-xs font-semibold',
        getToneClasses(tone),
      )}
    >
      {type}
    </span>
  );
}

export default function InventoryMovementsPage() {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-surface px-6 py-6 text-ink">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent ">
              <MovementIcon className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-ink">
                Movimientos de almacén
              </h1>

              <p className="mt-2 text-base text-muted">
                Controla entradas, salidas, devoluciones, ajustes y trazabilidad.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent/30 hover:bg-accent-soft"
            >
              Volver a inventario
            </Link>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              <PlusIcon className="h-4 w-4" />
              Nuevo movimiento
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Entradas registradas"
            value="128"
            description="Material que entra por compra o reposición."
            icon={<CubeIcon className="h-7 w-7" />}
            tone="emerald"
          />

          <MetricCard
            title="Salidas registradas"
            value="94"
            description="Material entregado a técnicos u órdenes."
            icon={<OutIcon className="h-7 w-7" />}
            tone="blue"
          />

          <MetricCard
            title="Devoluciones"
            value="11"
            description="Material devuelto porque no se usó."
            icon={<ReturnIcon className="h-7 w-7" />}
            tone="violet"
          />

          <MetricCard
            title="Ajustes pendientes"
            value="3"
            description="Correcciones manuales por revisar."
            icon={<AdjustIcon className="h-7 w-7" />}
            tone="amber"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-line bg-surface-2 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">
                  Historial de movimientos
                </h2>

                <p className="mt-1 text-sm text-subtle">
                  Entradas, salidas, devoluciones y ajustes de stock.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <input
                    placeholder="Buscar movimiento..."
                    className="h-11 w-full rounded-lg border border-line bg-surface pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-bold text-ink-2 transition hover:border-accent/30 hover:text-ink"
                >
                  <FilterIcon className="h-4 w-4" />
                  Filtros
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1100px] text-left">
                <thead className="bg-surface-3 text-sm text-ink-2">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Fecha</th>
                    <th className="px-5 py-4 font-semibold">Tipo</th>
                    <th className="px-5 py-4 font-semibold">Material</th>
                    <th className="px-5 py-4 font-semibold">Cantidad</th>
                    <th className="px-5 py-4 font-semibold">Usuario</th>
                    <th className="px-5 py-4 font-semibold">Orden relacionada</th>
                    <th className="px-5 py-4 font-semibold">Observación</th>
                    <th className="px-5 py-4 font-semibold">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {movementRows.map((row) => (
                    <tr
                      key={`${row.date}-${row.code}-${row.type}`}
                      className="border-t border-line text-sm text-ink-2"
                    >
                      <td className="px-5 py-4 font-semibold text-ink">
                        {row.date}
                      </td>

                      <td className="px-5 py-4">
                        <TypeBadge type={row.type} tone={row.tone} />
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{row.material}</p>
                        <p className="mt-1 text-xs text-subtle">
                          {row.code}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold text-ink">
                        {row.quantity}
                      </td>

                      <td className="px-5 py-4">{row.user}</td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                          {row.order}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-muted">
                        {row.observation}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition hover:border-accent/30 hover:text-accent"
                          aria-label={`Ver movimiento de ${row.material}`}
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
            <div className="rounded-lg border border-line bg-surface-2 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">
                Acciones rápidas
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/inventory/warehouse"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:text-accent"
                >
                  Ver almacén
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/orders"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:text-accent"
                >
                  Ver pedidos
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/purchases"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:text-accent"
                >
                  Ver compras
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface-2 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">
                Tipos de movimiento
              </h2>

              <div className="mt-5 space-y-3 text-sm text-muted">
                <p>Entrada: aumenta stock.</p>
                <p>Salida: descuenta stock.</p>
                <p>Devolución: retorna material.</p>
                <p>Ajuste: corrige diferencias.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {movementTypes.map((item) => (
            <MovementTypeCard key={item.title} item={item} />
          ))}
        </section>
      </div>
    </main>
  );
}