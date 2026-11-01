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
    border: 'border-accent/30',
    background: 'bg-accent-soft',
    text: 'text-accent',
    icon: 'border-accent/30 bg-accent-soft text-accent',
    dot: 'bg-accent',
    glow: 'rgba(14,165,233,0.16)',
  },
  emerald: {
    border: 'border-success/30',
    background: 'bg-success-soft',
    text: 'text-success',
    icon: 'border-success/30 bg-success-soft text-success',
    dot: 'bg-success',
    glow: 'rgba(16,185,129,0.16)',
  },
  amber: {
    border: 'border-warning/30',
    background: 'bg-warning-soft',
    text: 'text-warning',
    icon: 'border-warning/30 bg-warning-soft text-warning',
    dot: 'bg-warning',
    glow: 'rgba(245,158,11,0.16)',
  },
  rose: {
    border: 'border-danger/30',
    background: 'bg-danger-soft',
    text: 'text-danger',
    icon: 'border-danger/30 bg-danger-soft text-danger',
    dot: 'bg-danger',
    glow: 'rgba(244,63,94,0.16)',
  },
  violet: {
    border: 'border-special/30',
    background: 'bg-special-soft',
    text: 'text-special',
    icon: 'border-special/30 bg-special-soft text-special',
    dot: 'bg-special',
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
        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
        isActive
          ? 'border-success/30 bg-success-soft text-success'
          : 'border-warning/30 bg-warning-soft text-warning',
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
        'relative overflow-hidden rounded-xl border bg-surface p-5 shadow-sm',
        tone.border,
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-subtle">
            {item.label}
          </p>

          <p className="mt-4 text-4xl font-semibold tracking-tight text-ink">
            {item.value}
          </p>

          <p className="mt-3 text-sm leading-6 text-muted">
            {item.helper}
          </p>
        </div>

        <div
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border',
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
        'group relative h-full overflow-hidden rounded-xl border p-6 shadow-sm transition duration-200',
        isActive
          ? 'border-line bg-surface hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface '
          : 'border-line bg-surface',
      )}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
        }}
      />

      <div className="relative flex gap-5">
        <div
          className={cx(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border ',
            isActive
              ? tone.icon
              : 'border-line bg-surface-2 text-subtle',
          )}
        >
          <ModuleIcon type={item.key} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {item.title}
            </h2>

            <StatusPill status={item.status} />
          </div>

          <p className="mt-4 max-w-xl text-sm leading-7 text-ink-2">
            {item.description}
          </p>

          {isActive ? (
            <p
              className={cx(
                'mt-6 text-sm font-semibold transition group-hover:text-accent',
                tone.text,
              )}
            >
              Abrir módulo →
            </p>
          ) : (
            <p className="mt-6 text-sm font-bold text-subtle">
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
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-surface-2 px-6 py-8 text-ink lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-xl border border-accent bg-surface p-8 ">
          <div className="absolute inset-0 " />
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-40" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
                Módulo operativo
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-ink md:text-6xl">
                Inventario
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-ink-2">
                Centraliza almacén, pedidos, movimientos, compras y reposición
                para que cada trabajo técnico tenga materiales controlados,
                trazables y listos para usar.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/inventory/warehouse"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Abrir almacén
                </Link>

                <Link
                  href="/inventory/orders"
                  className="rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm font-bold text-ink hover:bg-surface-3"
                >
                  Abrir pedidos
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-6 shadow-sm">
              <div className="flex gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent">
                  <TargetIcon className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">
                    Estructura del módulo
                  </p>

                  <ul className="mt-4 space-y-3 text-sm text-ink-2">
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
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
              Disponibles
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Módulos activos
            </h2>

            <p className="mt-2 text-sm leading-7 text-muted">
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

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-accent">
              Próximamente
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Futuros módulos de inventario
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
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