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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function WarehouseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 10.2 12 4l8.5 6.2" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M8 20v-7h8v7" />
      <path d="M10 16h4" />
    </svg>
  );
}

function WarningIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ClipboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
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

function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function DotsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 6h.01" />
      <path d="M12 12h.01" />
      <path d="M12 18h.01" />
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

function StatusBadge({ status }: { status: StockItem['status'] }) {
  const classes =
    status === 'En stock'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'Bajo stock'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-rose-500/15 text-rose-300';

  return (
    <span className={cx('rounded-lg px-3 py-1 text-xs font-black', classes)}>
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const classes =
    category === 'Filtros'
      ? 'bg-blue-600/20 text-blue-300'
      : category === 'Repuestos'
        ? 'bg-violet-500/20 text-violet-300'
        : category === 'Refrigeración'
          ? 'bg-cyan-500/20 text-cyan-300'
          : category === 'Compresores'
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-amber-500/20 text-amber-300';

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
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          getToneClasses(item.tone),
        )}
      >
        <WarehouseIcon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm font-black text-white">{item.title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {item.description}
        </p>
        <p className="mt-1 text-xs text-slate-600">{item.time}</p>
      </div>
    </div>
  );
}

export default function InventoryWarehousePage() {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#080f1d] px-6 py-6 text-slate-100">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-600/20 text-blue-300 shadow-[0_0_35px_rgba(37,99,235,0.20)]">
              <WarehouseIcon className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                Almacén
              </h1>

              <p className="mt-2 text-base text-slate-400">
                Controla materiales, repuestos, consumibles, ubicaciones y stock mínimo.
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
          <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
            <div className="flex flex-col gap-4 border-b border-slate-800/90 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Materiales de almacén
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Stock actual, mínimos, ubicaciones, categorías y estado operativo.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    placeholder="Buscar material..."
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
              <table className="min-w-full text-left">
                <thead className="bg-[#101c30] text-sm text-slate-300">
                  <tr>
                    <th className="px-5 py-4 font-black">Material</th>
                    <th className="px-5 py-4 font-black">Categoría</th>
                    <th className="px-5 py-4 font-black">Ubicación</th>
                    <th className="px-5 py-4 font-black">Stock actual</th>
                    <th className="px-5 py-4 font-black">Estado</th>
                    <th className="px-5 py-4 font-black">Valor total</th>
                    <th className="px-5 py-4 font-black">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {stockItems.map((item) => (
                    <tr
                      key={item.code}
                      className="border-t border-slate-800/80 text-sm text-slate-300"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                            <CubeIcon className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-black text-white">{item.item}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <CategoryBadge category={item.category} />
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-200">
                          {item.location}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Estante {item.code.slice(-2)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-white">{item.stock}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.min}</p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-5 py-4 font-semibold text-white">
                        {item.value}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-[#080f1d] text-slate-300 transition hover:border-blue-400/50 hover:text-blue-300"
                            aria-label={`Ver ${item.item}`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-[#080f1d] text-slate-300 transition hover:border-blue-400/50 hover:text-blue-300"
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
            <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">
                  Actividad reciente
                </h2>

                <Link
                  href="/inventory/movements"
                  className="text-sm font-black text-blue-300 hover:text-blue-200"
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

            <div className="rounded-2xl border border-slate-800/90 bg-[#0c1728]/90 p-5 shadow-[0_18px_70px_rgba(2,6,23,0.20)]">
              <h2 className="text-lg font-black text-white">
                Acciones rápidas
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/inventory/orders"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Crear pedido
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/movements"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
                >
                  Ver movimientos
                  <ArrowIcon className="h-4 w-4" />
                </Link>

                <Link
                  href="/inventory/purchases"
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080f1d] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-blue-400/40 hover:text-blue-300"
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