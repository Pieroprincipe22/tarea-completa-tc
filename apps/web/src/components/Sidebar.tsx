'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import {
  getCurrentSectionKey,
  getNavigationSections,
  getSidebarGroupsForPath,
  isPathActive,
} from '@/lib/tc/navigation';

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
      {label}
    </span>
  );
}

type SidebarItemCardProps = {
  title: string;
  description?: string;
  active: boolean;
  href: string;
  comingSoon?: boolean;
};

function SidebarItemCard({
  title,
  description,
  active,
  href,
  comingSoon,
}: SidebarItemCardProps) {
  const className = [
    'block rounded-xl border px-3 py-3 transition',
    comingSoon
      ? 'cursor-default border-slate-800 bg-slate-950/30 text-slate-400'
      : active
        ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ');

  const body = (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>

          {description ? (
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </div>
          ) : null}
        </div>

        {comingSoon ? <Badge label="Próximo" /> : null}
      </div>
    </div>
  );

  if (comingSoon) {
    return body;
  }

  return <Link href={href}>{body}</Link>;
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

  const currentSection = useMemo(() => {
    const sections = getNavigationSections(session?.role);
    return sections.find((section) => section.key === currentSectionKey) ?? null;
  }, [currentSectionKey, session?.role]);

  const currentSectionTitle = currentSection?.title ?? 'Navegación';
  const currentSectionDescription =
    currentSectionKey === 'panel'
      ? 'Resumen ejecutivo y acceso rápido a la operación.'
      : currentSectionKey === 'operaciones'
        ? 'Trabajo diario, partes, informes y planificación.'
        : currentSectionKey === 'clientes'
          ? 'Gestión de clientes, contratos y relación comercial.'
          : currentSectionKey === 'activos'
            ? 'Equipos, inventario y ubicaciones operativas.'
            : currentSectionKey === 'personal'
              ? 'Usuarios internos, técnicos y estructura del equipo.'
              : currentSectionKey === 'plantillas'
                ? 'Plantillas reutilizables para checklists y mantenimiento.'
                : 'Accesos del módulo actual.';

  if (!mounted) return null;
  if (pathname === '/login') return null;
  if (!groups.length) return null;

  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="sticky top-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-5 border-b border-slate-800 pb-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Sección activa
          </div>

          <div className="mt-2 text-lg font-semibold text-slate-100">
            {currentSectionTitle}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {currentSectionDescription}
          </p>
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {group.shortTitle ?? group.title}
              </div>

              <nav className="space-y-1">
                {group.items.map((item) => {
                  const active = isPathActive(pathname, item.path);

                  return (
                    <SidebarItemCard
                      key={item.key}
                      title={item.title}
                      description={item.description}
                      href={item.path}
                      active={active}
                      comingSoon={item.comingSoon}
                    />
                  );
                })}
              </nav>
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}