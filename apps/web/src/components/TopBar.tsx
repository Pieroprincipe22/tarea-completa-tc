'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type SVGProps } from 'react';

import {
  clearTcSession,
  readTcSession,
  type TcSession,
} from '@/lib/tc/session';
import {
  getCurrentSectionKey,
  getNavigationSections,
  getPrimaryNavItems,
} from '@/lib/tc/navigation';

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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 3 7.5 4.25v9.5L12 21l-7.5-4.25v-9.5L12 3Z" />
      <path d="M4.8 7.45 12 11.5l7.2-4.05" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function GridIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 4h6v6H4V4Z" />
      <path d="M14 4h6v6h-6V4Z" />
      <path d="M4 14h6v6H4v-6Z" />
      <path d="M14 14h6v6h-6v-6Z" />
    </svg>
  );
}

function PulseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 12h4l2.2-5 4 10 2.4-5H21" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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

function UserIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function DocumentIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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

function BellIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

function LogOutIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M21 4v16" />
    </svg>
  );
}

function NavIcon({ sectionKey }: { sectionKey: string }) {
  if (sectionKey === 'panel') {
    return <GridIcon className="h-5 w-5" />;
  }

  if (sectionKey === 'operaciones') {
    return <PulseIcon className="h-5 w-5" />;
  }

  if (sectionKey === 'clientes') {
    return <UsersIcon className="h-5 w-5" />;
  }

  if (sectionKey === 'activos') {
    return <CubeIcon className="h-5 w-5" />;
  }

  if (sectionKey === 'personal') {
    return <UserIcon className="h-5 w-5" />;
  }

  if (sectionKey === 'plantillas') {
    return <DocumentIcon className="h-5 w-5" />;
  }

  return <CubeIcon className="h-5 w-5" />;
}

function formatSessionLabel(session: TcSession | null, mounted: boolean) {
  if (!mounted) return 'Cargando...';

  return session?.name ?? session?.email ?? 'Sin sesión';
}

function formatSessionMeta(session: TcSession | null, mounted: boolean) {
  if (!mounted) return '...';

  const company = session?.companyName ?? session?.companyId ?? 'Mi empresa';
  const role = session?.role ? ` · ${session.role}` : '';

  return `${company}${role}`;
}

function getUserInitials(session: TcSession | null): string {
  const source = session?.name ?? session?.email ?? 'U';

  const parts = source
    .replace('@', ' ')
    .replace('.', ' ')
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return parts || 'U';
}

function isNavItemActive(
  pathname: string,
  sectionKey: string,
  currentSectionKey: string | null,
) {
  return sectionKey === currentSectionKey || pathname === '/login';
}

export default function TopBar() {
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

  const primaryNavItems = useMemo(
    () => getPrimaryNavItems(session?.role),
    [session?.role],
  );

  const currentSectionKey = useMemo(
    () => getCurrentSectionKey(pathname, session?.role),
    [pathname, session?.role],
  );

  const currentSection = useMemo(() => {
    const sections = getNavigationSections(session?.role);

    return sections.find((section) => section.key === currentSectionKey) ?? null;
  }, [currentSectionKey, session?.role]);

  const homeHref =
    session?.role === 'TECHNICIAN' ? '/technician/dashboard' : '/dashboard';

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/88 shadow-[0_20px_70px_rgba(2,6,23,0.35)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href={homeHref}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-400 shadow-[0_0_35px_rgba(14,165,233,0.16)] transition hover:border-sky-300/50 hover:bg-sky-500/15"
                aria-label="Ir al panel"
              >
                <CubeIcon className="h-8 w-8" />
              </Link>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={homeHref}
                    className="text-lg font-black tracking-tight text-white transition hover:text-sky-200"
                  >
                    Administrador
                  </Link>

                  <span className="text-slate-600">—</span>

                  <span className="truncate text-sm font-medium text-slate-400">
                    {formatSessionMeta(session, mounted)}
                  </span>

                  {currentSection ? (
                    <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-200">
                      {currentSection.title}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 truncate text-sm text-slate-500">
                  <span className="font-bold text-slate-300">
                    {formatSessionLabel(session, mounted)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
                aria-label="Notificaciones"
              >
                <BellIcon className="h-5 w-5" />
              </button>

              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 text-slate-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-xs font-black text-sky-200">
                  {getUserInitials(session)}
                </span>

                <span className="hidden max-w-[180px] truncate text-sm font-bold text-slate-200 sm:block">
                  {formatSessionLabel(session, mounted)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearTcSession();
                  window.location.href = '/login';
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 text-sm font-black text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
            {primaryNavItems.map((item) => {
              const active = isNavItemActive(
                pathname,
                item.sectionKey,
                currentSectionKey,
              );

              return (
                <Link
                  key={item.key}
                  href={item.path}
                  className={cx(
                    'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition duration-200',
                    active
                      ? 'border-sky-400/40 bg-sky-500 text-white shadow-[0_0_35px_rgba(14,165,233,0.20)]'
                      : 'border-slate-800 bg-slate-950/55 text-slate-300 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-white',
                  )}
                >
                  <NavIcon sectionKey={item.sectionKey} />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}