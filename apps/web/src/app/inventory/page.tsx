import Link from 'next/link';
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

type MetricTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

type InventoryModuleKey =
  | 'warehouse'
  | 'orders'
  | 'movements'
  | 'purchases';

type InventoryModuleStatus = 'ACTIVO' | 'PRÓXIMO';

type InventoryModule = {
  key: InventoryModuleKey;
  title: string;
  description: string;
  href: string;
  status: InventoryModuleStatus;
  tone: MetricTone;
};

type InventoryShortcut = {
  label: string;
  value: string;
  helper: string;
  tone: MetricTone;
  icon: ReactNode;
};

const metricToneClasses: Record<
  MetricTone,
  {
    border: string;
    background: string;
    text: string;
    icon: string;
    dot: string;
    glow: string;
  }
> = {
  sky: {
    border: 'border-sky-400/40',
    background: 'bg-sky-500/10',
    text: 'text-sky-300',
    icon: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
    dot: 'bg-sky-400',
    glow: 'rgba(14,165,233,0.16)',
  },
  emerald: {
    border: 'border-emerald-400/40',
    background: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    icon: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
    glow: 'rgba(16,185,129,0.16)',
  },
  amber: {
    border: 'border-amber-400/40',
    background: 'bg-amber-500/10',
    text: 'text-amber-300',
    icon: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
    glow: 'rgba(245,158,11,0.16)',
  },
  rose: {
    border: 'border-rose-400/40',
    background: 'bg-rose-500/10',
    text: 'text-rose-300',
    icon: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    dot: 'bg-rose-400',
    glow: 'rgba(244,63,94,0.16)',
  },
  violet: {
    border: 'border-violet-400/40',
    background: 'bg-violet-500/10',
    text: 'text-violet-300',
    icon: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
    dot: 'bg-violet-400',
    glow: 'rgba(139,92,246,0.16)',
  },
};

const inventoryModules: InventoryModule[] = [
  {
    key: 'warehouse',
    title: 'Almacén',
    description:
      'Control de materiales, repuestos, consumibles, stock mínimo, stock disponible y referencias usadas por los técnicos.',
    href: '/inventory/warehouse',
    status: 'ACTIVO',
    tone: 'sky',
  },
  {
    key: 'orders',
    title: 'Pedidos',
    description:
      'Solicitudes de materiales con cantidad, marca, modelo, referencia, observación, fecha de pedido, fecha de entrega y factura.',
    href: '/inventory/orders',
    status: 'ACTIVO',
    tone: 'emerald',
  },
  {
    key: 'movements',
    title: 'Movimientos de almacén',
    description:
      'Registro de entradas, salidas, devoluciones, ajustes internos y trazabilidad de materiales por técnico o trabajo.',
    href: '/inventory/movements',
    status: 'PRÓXIMO',
    tone: 'amber',
  },
  {
    key: 'purchases',
    title: 'Compras y reposición',
    description:
      'Seguimiento de compras, proveedores, materiales pendientes, reposición automática y control de facturas recibidas.',
    href: '/inventory/purchases',
    status: 'PRÓXIMO',
    tone: 'rose',
  },
];

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

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
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function FileIcon(props: IconProps) {
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
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
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

function StatusPill({ status }: { status: InventoryModuleStatus }) {
  const isActive = status === 'ACTIVO';

  return (
    <span
      className={cx(
        'rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide',
        isActive
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
          : 'border-amber-400/40 bg-amber-400/10 text-amber-200',
      )}
    >
      {status}
    </span>
  );
}

function ShortcutCard({ item }: { item: InventoryShortcut }) {
  const tone = metricToneClasses[item.tone];

  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-3xl border bg-slate-900/45 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)]',
        tone.border,
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at top left, ${tone.glow}, transparent 38%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
            {item.label}
          </p>

          <p className="mt-4 text-4xl font-black tracking-tight text-white">
            {item.value}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {item.helper}
          </p>
        </div>

        <div
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
            tone.icon,
          )}
        >
          {item.icon}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ item }: { item: InventoryModule }) {
  const isActive = item.status === 'ACTIVO';
  const tone = metricToneClasses[item.tone];

  const content = (
    <div
      className={cx(
        'group relative h-full overflow-hidden rounded-3xl border p-6 shadow-[0_22px_70px_rgba(2,6,23,0.32)] transition duration-200',
        isActive
          ? 'border-slate-800/90 bg-slate-900/55 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/75 hover:shadow-[0_28px_90px_rgba(14,165,233,0.12)]'
          : 'border-slate-800/90 bg-slate-900/35',
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at top left, ${tone.glow}, transparent 35%)`,
        }}
      />

      <div className="relative flex gap-5">
        <div
          className={cx(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border shadow-[0_0_35px_rgba(14,165,233,0.10)]',
            isActive
              ? tone.icon
              : 'border-slate-700/80 bg-slate-950/70 text-slate-500',
          )}
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
            <p
              className={cx(
                'mt-6 text-sm font-black transition group-hover:text-sky-200',
                tone.text,
              )}
            >
              Abrir módulo →
            </p>
          ) : (
            <p className="mt-6 text-sm font-bold text-slate-500">
              Pendiente de implementación
            </p>
          )}
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

  const shortcuts: InventoryShortcut[] = [
    {
      label: 'Activos',
      value: String(activeModules.length),
      helper: 'Módulos listos para operar ahora.',
      tone: 'emerald',
      icon: <TargetIcon className="h-7 w-7" />,
    },
    {
      label: 'Pendientes',
      value: String(comingSoonModules.length),
      helper: 'Funciones separadas para desarrollo posterior.',
      tone: 'rose',
      icon: <AlertIcon className="h-7 w-7" />,
    },
    {
      label: 'Flujo',
      value: '4',
      helper: 'Almacén, pedidos, movimientos y compras.',
      tone: 'sky',
      icon: <BoxIcon className="h-7 w-7" />,
    },
    {
      label: 'Factura',
      value: 'PDF',
      helper: 'Preparado para adjuntar facturas en pedidos.',
      tone: 'violet',
      icon: <FileIcon className="h-7 w-7" />,
    },
  ];

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/50 bg-slate-900/70 p-8 shadow-[0_0_80px_rgba(14,165,233,0.12)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.20),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.2),rgba(2,132,199,0.08))]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Módulo operativo
              </p>

              <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-6xl">
                Inventario
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
                Centraliza almacén, pedidos, movimientos, compras y reposición
                para que cada trabajo técnico tenga materiales controlados,
                trazables y listos para usar.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/inventory/warehouse"
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
                >
                  Abrir almacén
                </Link>

                <Link
                  href="/inventory/orders"
                  className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Abrir pedidos
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
                  <TargetIcon className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.22em] text-sky-400">
                    Estructura del módulo
                  </p>

                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {inventoryModules.map((item) => {
                      const tone = metricToneClasses[item.tone];

                      return (
                        <li key={item.key} className="flex items-center gap-3">
                          <span
                            className={cx('h-1.5 w-1.5 rounded-full', tone.dot)}
                          />
                          {item.title}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((item) => (
            <ShortcutCard key={item.label} item={item} />
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
              Disponibles
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Módulos activos
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-400">
              Estas pantallas ya pueden usarse dentro del flujo operativo del
              proyecto.
            </p>
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
              mezclarlas con almacén y pedidos.
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