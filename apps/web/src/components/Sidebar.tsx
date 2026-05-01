'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type SVGProps } from 'react';

import {
  getCurrentSectionKey,
  getSidebarGroupsForPath,
  isPathActive,
  type TcNavGroup,
  type TcNavLeaf,
} from '@/lib/tc/navigation';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type IconProps = SVGProps<SVGSVGElement>;

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function CubeIcon(props: IconProps) {
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

function UsersIcon(props: IconProps) {
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
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      <path d="M18 8.5a3 3 0 0 1 2.5 3" />
      <path d="M20.5 19a5 5 0 0 0-3-4.5" />
    </svg>
  );
}

function DocumentIcon(props: IconProps) {
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

function LocationIcon(props: IconProps) {
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
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <path d="M12 10.5h.01" />
    </svg>
  );
}

function ChartIcon(props: IconProps) {
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
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-3" />
    </svg>
  );
}

function ChevronIcon(props: IconProps) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

type SidebarItemIconProps = {
  item: TcNavLeaf;
  className?: string;
};

function SidebarItemIcon({ item, className }: SidebarItemIconProps) {
  const key = item.key.toLowerCase();
  const title = item.title.toLowerCase();

  if (key.includes('warehouse') || title.includes('almacén')) {
    return <WarehouseIcon className={className} />;
  }

  if (key.includes('order') || title.includes('pedido')) {
    return <ClipboardIcon className={className} />;
  }

  if (key.includes('movement') || title.includes('movimiento')) {
    return <MovementIcon className={className} />;
  }

  if (
    key.includes('purchase') ||
    title.includes('compra') ||
    title.includes('reposición')
  ) {
    return <CartIcon className={className} />;
  }

  if (
    key.includes('site') ||
    title.includes('ubicacion') ||
    title.includes('ubicación')
  ) {
    return <LocationIcon className={className} />;
  }

  if (
    key.includes('customer') ||
    key.includes('contract') ||
    title.includes('cliente') ||
    title.includes('contrato')
  ) {
    return <UsersIcon className={className} />;
  }

  if (
    key.includes('template') ||
    key.includes('report') ||
    title.includes('plantilla') ||
    title.includes('parte') ||
    title.includes('informe')
  ) {
    return <DocumentIcon className={className} />;
  }

  if (key.includes('dashboard') || title.includes('resumen')) {
    return <ChartIcon className={className} />;
  }

  return <CubeIcon className={className} />;
}

function getActiveGroup(
  groups: TcNavGroup[],
  pathname: string,
): TcNavGroup | null {
  return (
    groups.find((group) =>
      group.items.some((item) => isPathActive(pathname, item.path)),
    ) ??
    groups[0] ??
    null
  );
}

function getModuleDescription(
  sectionKey: string | null,
  moduleTitle: string,
): string {
  if (moduleTitle.toLowerCase() === 'inventario') {
    return 'Almacén, pedidos y movimientos operativos.';
  }

  if (sectionKey === 'panel') {
    return 'Resumen ejecutivo y acceso rápido a la operación.';
  }

  if (sectionKey === 'operaciones') {
    return 'Trabajo diario, partes, informes y planificación.';
  }

  if (sectionKey === 'clientes') {
    return 'Clientes, contratos y ubicaciones de servicio.';
  }

  if (sectionKey === 'personal') {
    return 'Usuarios internos, técnicos y estructura del equipo.';
  }

  if (sectionKey === 'plantillas') {
    return 'Plantillas reutilizables para checklists y mantenimiento.';
  }

  return 'Accesos del módulo actual.';
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200">
      {label}
    </span>
  );
}

type SidebarItemCardProps = {
  item: TcNavLeaf;
  active: boolean;
};

function SidebarItemCard({ item, active }: SidebarItemCardProps) {
  const cardClassName = cx(
    'group relative flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition duration-200',
    item.comingSoon &&
      'cursor-default border-slate-800/90 bg-slate-950/45 text-slate-400',
    !item.comingSoon &&
      active &&
      'border-sky-400/70 bg-sky-500/15 text-white shadow-[0_0_35px_rgba(14,165,233,0.16)]',
    !item.comingSoon &&
      !active &&
      'border-slate-800/90 bg-slate-950/45 text-slate-300 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-white',
  );

  const iconClassName = cx(
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition',
    active
      ? 'border-sky-400/40 bg-sky-400/15 text-sky-300'
      : 'border-slate-700/80 bg-slate-900/80 text-sky-400 group-hover:border-sky-500/40 group-hover:text-sky-300',
  );

  const chevronClassName = cx(
    'h-5 w-5 transition',
    active ? 'text-sky-200' : 'text-slate-500 group-hover:text-sky-300',
  );

  const content = (
    <>
      <span className={iconClassName}>
        <SidebarItemIcon item={item} className="h-6 w-6" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black leading-5 text-slate-100">
          {item.title}
        </span>

        {item.description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            {item.description}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {item.comingSoon ? <StatusBadge label="Próximo" /> : null}

        {!item.comingSoon ? <ChevronIcon className={chevronClassName} /> : null}
      </span>
    </>
  );

  if (item.comingSoon) {
    return <div className={cardClassName}>{content}</div>;
  }

  return (
    <Link href={item.path} className={cardClassName}>
      {content}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  useEffect(() => {
    setMounted(true);

    const syncSession = () => {
      setSession(readTcSession());
    };

    syncSession();

    window.addEventListener('focus', syncSession);
    document.addEventListener('visibilitychange', syncSession);

    return () => {
      window.removeEventListener('focus', syncSession);
      document.removeEventListener('visibilitychange', syncSession);
    };
  }, []);

  useEffect(() => {
    setSession(readTcSession());
  }, [pathname]);

  const groups = useMemo(
    () => getSidebarGroupsForPath(pathname, session?.role),
    [pathname, session?.role],
  );

  const currentSectionKey = useMemo(
    () => getCurrentSectionKey(pathname, session?.role),
    [pathname, session?.role],
  );

  const activeGroup = useMemo(
    () => getActiveGroup(groups, pathname),
    [groups, pathname],
  );

  const moduleTitle =
    activeGroup?.shortTitle ?? activeGroup?.title ?? 'Navegación';

  const moduleDescription = getModuleDescription(
    currentSectionKey,
    moduleTitle,
  );

  if (!mounted) return null;
  if (pathname === '/login') return null;
  if (!groups.length) return null;

  return (
    <aside className="hidden min-h-[calc(100vh-86px)] w-[330px] shrink-0 border-r border-slate-800/80 bg-slate-950/70 px-6 py-8 shadow-[25px_0_70px_rgba(2,6,23,0.45)] backdrop-blur xl:block">
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-5 shadow-[0_0_50px_rgba(2,132,199,0.08)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.12)]">
            <CubeIcon className="h-8 w-8" />
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-400/80">
              Sección activa
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
              {moduleTitle}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {moduleDescription}
            </p>
          </div>
        </div>

        <div className="my-6 h-px bg-slate-800" />

        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-sky-400/80">
          Menú
        </p>

        <div className="space-y-2">
          {groups.flatMap((group) =>
            group.items.map((item) => {
              const active = isPathActive(pathname, item.path);

              return (
                <SidebarItemCard
                  key={item.key}
                  item={item}
                  active={active}
                />
              );
            }),
          )}
        </div>
      </div>
    </aside>
  );
}