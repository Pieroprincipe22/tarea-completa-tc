import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type InventoryModuleKey = 'warehouse' | 'orders' | 'movements' | 'purchases';

type InventoryModule = {
  key: InventoryModuleKey;
  title: string;
  description: string;
  href: string;
  status: 'ACTIVO' | 'PRÓXIMO';
};

const inventoryModules: InventoryModule[] = [
  {
    key: 'warehouse',
    title: 'Almacén',
    description:
      'Control de materiales, repuestos, consumibles y stock disponible para los trabajos técnicos.',
    href: '/inventory/warehouse',
    status: 'ACTIVO',
  },
  {
    key: 'orders',
    title: 'Pedidos',
    description:
      'Solicitudes de materiales realizadas desde los partes de trabajo técnicos con cantidad, marca, modelo, referencia y observaciones.',
    href: '/inventory/orders',
    status: 'ACTIVO',
  },
  {
    key: 'movements',
    title: 'Movimientos de almacén',
    description:
      'Entradas, salidas, devoluciones y trazabilidad de materiales dentro del almacén.',
    href: '/inventory/movements',
    status: 'PRÓXIMO',
  },
  {
    key: 'purchases',
    title: 'Compras y reposición',
    description:
      'Control futuro de compras, reposición de stock, proveedores y seguimiento de materiales pendientes.',
    href: '/inventory/purchases',
    status: 'PRÓXIMO',
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

function TargetIcon(props: IconProps) {
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
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  );
}

function ModuleIcon({ type }: { type: InventoryModuleKey }) {
  if (type === 'warehouse') {
    return <WarehouseIcon className="h-8 w-8" />;
  }

  if (type === 'orders') {
    return <ClipboardIcon className="h-8 w-8" />;
  }

  if (type === 'movements') {
    return <MovementIcon className="h-8 w-8" />;
  }

  return <CartIcon className="h-8 w-8" />;
}

function StatusPill({ status }: { status: InventoryModule['status'] }) {
  const isActive = status === 'ACTIVO';

  return (
    <span
      className={
        isActive
          ? 'rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300'
          : 'rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-200'
      }
    >
      {status}
    </span>
  );
}

function ModuleCard({ item }: { item: InventoryModule }) {
  const isActive = item.status === 'ACTIVO';

  const content = (
    <div
      className={[
        'group relative h-full overflow-hidden rounded-3xl border p-6 shadow-[0_22px_70px_rgba(2,6,23,0.32)] transition duration-200',
        isActive
          ? 'border-slate-800/90 bg-slate-900/55 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/75 hover:shadow-[0_28px_90px_rgba(14,165,233,0.12)]'
          : 'border-slate-800/90 bg-slate-900/35',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_35%)] opacity-80" />

      <div className="relative flex gap-5">
        <div
          className={[
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border shadow-[0_0_35px_rgba(14,165,233,0.10)]',
            isActive
              ? 'border-sky-400/25 bg-sky-500/10 text-sky-400'
              : 'border-slate-700/80 bg-slate-950/70 text-slate-500',
          ].join(' ')}
        >
          <ModuleIcon type={item.key} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight text-white">
              {item.title}
            </h2>

            <StatusPill status={item.status} />
          </div>

          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            {item.description}
          </p>

          {isActive ? (
            <p className="mt-6 text-sm font-black text-sky-400 transition group-hover:text-sky-300">
              Abrir módulo →
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!isActive) {
    return content;
  }

  return (
    <Link href={item.href} className="block h-full">
      {content}
    </Link>
  );
}

export default function InventoryPage() {
  const activeModules = inventoryModules.filter(
    (item) => item.status === 'ACTIVO',
  );

  const comingSoonModules = inventoryModules.filter(
    (item) => item.status === 'PRÓXIMO',
  );

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/50 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.12)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.20),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.2),rgba(2,132,199,0.08))]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Módulo
              </p>

              <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-6xl">
                Inventario
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
                Centraliza el control de almacén, pedidos, movimientos y compras
                para asegurar que los técnicos cuenten con los materiales
                necesarios y que la operación sea eficiente y trazable.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <TargetIcon className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.22em] text-sky-400">
                    Foco del módulo
                  </p>

                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Almacén
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Pedidos
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Movimientos
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      Compras y reposición
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Disponibles
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Módulos activos
            </h2>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {activeModules.map((item) => (
              <ModuleCard key={item.key} item={item} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/30 p-5">
          <div className="mb-5">
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Próximamente
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Futuros módulos de inventario
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Estas funciones quedan separadas para desarrollo posterior, sin
              mezclarlas con las pantallas principales ya disponibles.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {comingSoonModules.map((item) => (
              <ModuleCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}