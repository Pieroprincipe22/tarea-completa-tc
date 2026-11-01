import Link from 'next/link';
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type MetricTone = 'blue' | 'violet' | 'amber' | 'cyan' | 'emerald' | 'rose';

type StockItem = {
  item: string;
  code: string;
  category: string;
  location: string;
  stock: string;
  min: string;
  status: 'En stock' | 'Bajo stock' | 'Crítico';
  value: string;
};

type ActivityItem = {
  title: string;
  description: string;
  time: string;
  tone: MetricTone;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
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

function WarehouseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M3.5 10.2 12 4l8.5 6.2" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M8 20v-7h8v7" />
      <path d="M10 16h4" />
    </svg>
  );
}

function WarningIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ClipboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function InvoiceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
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

function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.8"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function DotsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.4"strokeLinecap="round"strokeLinejoin="round"aria-hidden="true" {...props}>
      <path d="M12 6h.01" />
      <path d="M12 12h.01" />
      <path d="M12 18h.01" />
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

const stockItems: StockItem[] = [
  {
    item: 'Filtro de aire MERV 13',
    code: 'FIL-MERV13',
    category: 'Filtros',
    location: 'Almacén Principal',
    stock: '45 unidades',
    min: 'Min: 20',
    status: 'En stock',
    value: '$ 1,350.00',
  },
  {
    item: 'Correa 4PK 1230',
    code: 'COR-4PK1230',
    category: 'Repuestos',
    location: 'Almacén Principal',
    stock: '8 unidades',
    min: 'Min: 15',
    status: 'Bajo stock',
    value: '$ 240.00',
  },
  {
    item: 'Gas refrigerante R-410A',
    code: 'GAS-R410A',
    category: 'Refrigeración',
    location: 'Almacén Secundario',
    stock: '2 unidades',
    min: 'Min: 10',
    status: 'Crítico',
    value: '$ 180.00',
  },
  {
    item: 'Compresor Copeland ZR57',
    code: 'COMP-ZR57',
    category: 'Compresores',
    location: 'Almacén Principal',
    stock: '5 unidades',
    min: 'Min: 5',
    status: 'Bajo stock',
    value: '$ 2,750.00',
  },
  {
    item: 'Termostato digital',
    code: 'THERM-DIG',
    category: 'Eléctrico',
    location: 'Almacén Principal',
    stock: '12 unidades',
    min: 'Min: 10',
    status: 'En stock',
    value: '$ 360.00',
  },
];

const activities: ActivityItem[] = [
  {
    title: 'Entrada registrada',
    description: '100 unidades · Filtro MERV 13',
    time: 'Hoy, 09:23',
    tone: 'emerald',
  },
  {
    title: 'Stock actualizado',
    description: 'Correa 4PK 1230 · ajuste manual',
    time: 'Hoy, 08:15',
    tone: 'blue',
  },
  {
    title: 'Material crítico',
    description: 'Gas refrigerante R-410A por debajo del mínimo',
    time: 'Ayer, 14:22',
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

function StatusBadge({ status }: { status: StockItem['status'] }) {
  const classes =
    status === 'En stock'
      ? 'bg-success-soft text-success'
      : status === 'Bajo stock'
        ? 'bg-warning-soft text-warning'
        : 'bg-danger-soft text-danger';

  return (
    <span className={cx('rounded-lg px-3 py-1 text-xs font-semibold', classes)}>
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const classes =
    category === 'Filtros'
      ? 'bg-accent-soft text-accent'
      : category === 'Repuestos'
        ? 'bg-special-soft text-special'
        : category === 'Refrigeración'
          ? 'bg-accent-soft text-accent'
          : category === 'Compresores'
            ? 'bg-accent-soft text-accent'
            : 'bg-warning-soft text-warning';

  return (
    <span className={cx('rounded-lg px-3 py-1 text-xs font-bold', classes)}>
      {category}
    </span>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
          getToneClasses(item.tone),
        )}
      >
        <WarehouseIcon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          {item.description}
        </p>
        <p className="mt-1 text-xs text-subtle">{item.time}</p>
      </div>
    </div>
  );
}

export default function InventoryWarehousePage() {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-surface px-6 py-6 text-ink">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent ">
              <WarehouseIcon className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-ink">
                Almacén
              </h1>

              <p className="mt-2 text-base text-muted">
                Controla materiales, repuestos, consumibles, ubicaciones y stock mínimo.
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
              Nuevo material
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Materiales registrados"
            value="1,248"
            description="Ítems disponibles en almacén."
            icon={<CubeIcon className="h-7 w-7" />}
            tone="blue"
          />

          <MetricCard
            title="Stock bajo"
            value="18"
            description="Materiales por debajo del mínimo."
            icon={<WarningIcon className="h-7 w-7" />}
            tone="amber"
          />

          <MetricCard
            title="Pendiente de pedir"
            value="7"
            description="Solicitudes técnicas abiertas."
            icon={<ClipboardIcon className="h-7 w-7" />}
            tone="violet"
          />

          <MetricCard
            title="Facturas asociadas"
            value="24"
            description="Documentos vinculados a compras."
            icon={<InvoiceIcon className="h-7 w-7" />}
            tone="cyan"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="rounded-lg border border-line bg-surface-2 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-ink">
                  Materiales de almacén
                </h2>

                <p className="mt-1 text-sm text-subtle">
                  Stock actual, mínimos, ubicaciones, categorías y estado operativo.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <input
                    placeholder="Buscar material..."
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
              <table className="min-w-full text-left">
                <thead className="bg-surface-3 text-sm text-ink-2">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Material</th>
                    <th className="px-5 py-4 font-semibold">Categoría</th>
                    <th className="px-5 py-4 font-semibold">Ubicación</th>
                    <th className="px-5 py-4 font-semibold">Stock actual</th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                    <th className="px-5 py-4 font-semibold">Valor total</th>
                    <th className="px-5 py-4 font-semibold">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {stockItems.map((item) => (
                    <tr
                      key={item.code}
                      className="border-t border-line text-sm text-ink-2"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-ink-2">
                            <CubeIcon className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold text-ink">{item.item}</p>
                            <p className="mt-1 text-xs text-subtle">
                              {item.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <CategoryBadge category={item.category} />
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">
                          {item.location}
                        </p>
                        <p className="mt-1 text-xs text-subtle">
                          Estante {item.code.slice(-2)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{item.stock}</p>
                        <p className="mt-1 text-xs text-subtle">{item.min}</p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-5 py-4 font-semibold text-ink">
                        {item.value}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition hover:border-accent/30 hover:text-accent"
                            aria-label={`Ver ${item.item}`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition hover:border-accent/30 hover:text-accent"
                            aria-label={`Opciones de ${item.item}`}
                          >
                            <DotsIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-line bg-surface-2 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">
                  Actividad reciente
                </h2>

                <Link
                  href="/inventory/movements"
                  className="text-sm font-semibold text-accent hover:text-accent"
                >
                  Ver todo
                </Link>
              </div>

              <div className="mt-6 space-y-5">
                {activities.map((item) => (
                  <ActivityRow key={`${item.title}-${item.time}`} item={item} />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface-2 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">
                Acciones rápidas
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/inventory/orders"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:text-accent"
                >
                  Crear pedido
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/movements"
                  className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-2 transition hover:border-accent/30 hover:text-accent"
                >
                  Ver movimientos
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
          </aside>
        </section>
      </div>
    </main>
  );
}