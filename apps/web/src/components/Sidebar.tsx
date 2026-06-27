'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type SVGProps } from 'react';

import {
  getCurrentSectionKey,
  getNavigationSections,
  isPathActive,
  type TcNavLeaf,
  type TcNavSection,
} from '@/lib/tc/navigation';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type IconProps = SVGProps<SVGSVGElement>;

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function LogoMark() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute text-[38px] font-black tracking-tighter text-blue-500">
          T
        </span>
        <span className="absolute left-5 text-[38px] font-black tracking-tighter text-sky-400">
          C
        </span>
      </div>

      <div className="leading-none">
        <p className="text-lg font-black tracking-wide text-white">
          TECHNICAL
        </p>
        <p className="text-lg font-black tracking-wide text-sky-300">
          COMMAND
        </p>
      </div>
    </Link>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkOrderIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5M8 13h8M8 17h6"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReportIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M6 3h9l3 3v15H6V3Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 16h6M15 3v4h4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M16 11a4 4 0 1 0-8 0M4.5 20a7.5 7.5 0 0 1 15 0M18 8.5a3 3 0 0 1 2.5 3M20.5 19a5 5 0 0 0-3-4.5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="m12 3 7.5 4.25v9.5L12 21l-7.5-4.25v-9.5L12 3Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.8 7.45 12 11.5l7.2-4.05M12 11.5V21"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TechnicianIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 5.5 20 3M18.5 8.5H22"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContractIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M7 3h10v18H7V3Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 8h5M9.5 12h5M9.5 16h3"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TemplateIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M4 4h16v16H4V4Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8h8M8 12h8M8 16h5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 12a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-2-1.1L14.2 3h-4.4l-.4 2.7a7.2 7.2 0 0 0-2 1.1l-2.4-1-2 3.5 2 1.5A7.6 7.6 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7.2 7.2 0 0 0 2 1.1l.4 2.7h4.4l.4-2.7a7.2 7.2 0 0 0 2-1.1l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiamondIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M6 3h12l4 6-10 12L2 9l4-6Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 9h20M8 3l-2 6 6 12 6-12-2-6"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="m6 9 6 6 6-6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="m9 18 6-6-6-6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionIcon({ sectionKey, className }: { sectionKey: string; className?: string }) {
  if (sectionKey === 'panel') return <HomeIcon className={className} />;
  if (sectionKey === 'ordenes') return <WorkOrderIcon className={className} />;
  if (sectionKey === 'partes') return <ReportIcon className={className} />;
  if (sectionKey === 'calendario') return <CalendarIcon className={className} />;
  if (sectionKey === 'clientes') return <UsersIcon className={className} />;
  if (sectionKey === 'inventario') return <CubeIcon className={className} />;
  if (sectionKey === 'tecnicos') return <TechnicianIcon className={className} />;
  if (sectionKey === 'contratos') return <ContractIcon className={className} />;
  if (sectionKey === 'plantillas') return <TemplateIcon className={className} />;
  if (sectionKey === 'reportes') return <ChartIcon className={className} />;
  if (sectionKey === 'configuracion') return <SettingsIcon className={className} />;

  return <CubeIcon className={className} />;
}

function getSectionHref(section: TcNavSection): string {
  const firstAvailableItem = section.groups
    .flatMap((group) => group.items)
    .find((item) => !item.comingSoon);

  return section.sectionPath ?? firstAvailableItem?.path ?? '/dashboard';
}

function isSectionActive(
  pathname: string,
  section: TcNavSection,
  currentSectionKey: string | null,
): boolean {
  if (section.key === currentSectionKey) return true;

  if (section.sectionPath && isPathActive(pathname, section.sectionPath)) {
    return true;
  }

  return section.groups.some((group) =>
    group.items.some((item) => isPathActive(pathname, item.path)),
  );
}

function shouldShowDivider(sectionKey: string): boolean {
  return ['calendario', 'inventario', 'plantillas', 'configuracion'].includes(
    sectionKey,
  );
}

function shouldShowSubmenu(section: TcNavSection, active: boolean): boolean {
  if (!active) return false;

  const items = section.groups.flatMap((group) => group.items);
  const visibleSubItems = items.filter(
    (item) => item.path !== section.sectionPath && item.title !== section.title,
  );

  return visibleSubItems.length > 0;
}

function getSubmenuItems(section: TcNavSection): TcNavLeaf[] {
  const seen = new Set<string>();

  return section.groups
    .flatMap((group) => group.items)
    .filter((item) => {
      if (item.path === section.sectionPath && item.title === section.title) {
        return false;
      }

      if (seen.has(item.key)) return false;

      seen.add(item.key);
      return true;
    });
}

function StatusDot() {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950">
      <span className="h-2 w-2 rounded-full bg-blue-500" />
    </span>
  );
}

function SidebarSubItem({
  item,
  pathname,
}: {
  item: TcNavLeaf;
  pathname: string;
}) {
  const active = isPathActive(pathname, item.path);

  const content = (
    <span
      className={cx(
        'relative flex min-h-8 items-center gap-3 rounded-xl py-1.5 pl-8 pr-3 text-sm transition',
        active
          ? 'font-black text-blue-300'
          : 'font-medium text-slate-400 hover:text-slate-100',
        item.comingSoon && 'cursor-default opacity-60 hover:text-slate-400',
      )}
    >
      <span
        className={cx(
          'absolute left-2 h-2 w-2 rounded-full',
          active ? 'bg-blue-500' : 'bg-slate-700',
        )}
      />
      <span className="truncate">{item.title}</span>

      {item.comingSoon ? (
        <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">
          Próx
        </span>
      ) : null}
    </span>
  );

  if (item.comingSoon) {
    return <div>{content}</div>;
  }

  return <Link href={item.path}>{content}</Link>;
}

function SidebarSectionItem({
  section,
  pathname,
  currentSectionKey,
}: {
  section: TcNavSection;
  pathname: string;
  currentSectionKey: string | null;
}) {
  const active = isSectionActive(pathname, section, currentSectionKey);
  const href = getSectionHref(section);
  const showSubmenu = shouldShowSubmenu(section, active);
  const subItems = getSubmenuItems(section);

  return (
    <div>
      <Link
        href={href}
        className={cx(
          'group flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition duration-200',
          active
            ? 'bg-blue-600/75 text-blue-100 shadow-[0_12px_32px_rgba(37,99,235,0.22)]'
            : 'text-slate-300 hover:bg-slate-900/80 hover:text-white',
        )}
      >
        <span
          className={cx(
            'relative flex h-6 w-6 shrink-0 items-center justify-center',
            active ? 'text-sky-200' : 'text-slate-400 group-hover:text-sky-300',
          )}
        >
          <SectionIcon sectionKey={section.key} className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1 truncate font-medium">
          {section.title}
        </span>

        {subItems.length > 1 ? (
          active ? (
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-sky-200" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-300" />
          )
        ) : null}
      </Link>

      {showSubmenu ? (
        <div className="ml-5 mt-2 space-y-1 border-l border-slate-800/90 pl-2">
          {subItems.map((item) => (
            <SidebarSubItem key={item.key} item={item} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlanCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300">
          <DiamondIcon className="h-6 w-6" />
        </div>

        <div>
          <p className="font-black text-blue-300">Plan PRO</p>
          <p className="mt-1 text-xs text-slate-500">Máximo rendimiento</p>
        </div>
      </div>

      <Link
        href="/settings/billing"
        className="mt-4 flex items-center justify-between rounded-xl bg-blue-600/20 px-4 py-3 text-sm font-black text-blue-300 transition hover:bg-blue-600/30 hover:text-blue-200"
      >
        Ver mi plan
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
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

  const sections = useMemo(
    () => getNavigationSections(session?.role),
    [session?.role],
  );

  const currentSectionKey = useMemo(
    () => getCurrentSectionKey(pathname, session?.role),
    [pathname, session?.role],
  );

  if (!mounted) return null;
  if (pathname === '/login') return null;

  return (
    <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 border-r border-slate-800/80 bg-slate-950/92 xl:flex xl:flex-col">
      <div className="flex h-[86px] shrink-0 items-center border-b border-slate-800/80 px-7">
        <LogoMark />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-6">
        <p className="px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          Navegación
        </p>

        <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.key}>
              <SidebarSectionItem
                section={section}
                pathname={pathname}
                currentSectionKey={currentSectionKey}
              />

              {shouldShowDivider(section.key) ? (
                <div className="my-4 h-px bg-slate-800/90" />
              ) : null}
            </div>
          ))}
        </nav>

        <div className="mt-6 shrink-0">
          <PlanCard />
        </div>
      </div>

      <div className="absolute bottom-5 left-5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-black text-xs font-black text-slate-200">
          N
          <StatusDot />
        </div>
      </div>
    </aside>
  );
}