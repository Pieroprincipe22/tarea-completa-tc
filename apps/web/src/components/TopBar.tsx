'use client';

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
} from '@/lib/tc/navigation';

type IconProps = SVGProps<SVGSVGElement>;

function BellIcon(props: IconProps) {
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
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
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
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function HelpIcon(props: IconProps) {
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
      <path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.8-2.2 2-2.2 3.8" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
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
      <path d="m21 21-4.3-4.3" />
      <path d="M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z" />
    </svg>
  );
}

function MenuIcon(props: IconProps) {
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
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
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

function ChevronDownIcon(props: IconProps) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LogOutIcon(props: IconProps) {
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
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
      <path d="M21 4v16" />
    </svg>
  );
}

function getInitials(session: TcSession | null): string {
  const source = session?.name ?? session?.email ?? 'Admin';
  const initials = source
    .replace('@', ' ')
    .replace('.', ' ')
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'A';
}

function getCompanyName(session: TcSession | null): string {
  return session?.companyName ?? session?.companyId ?? 'Mi Empresa';
}

function getUserLabel(session: TcSession | null): string {
  return session?.name ?? session?.email ?? 'Admin';
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

  const currentSectionKey = useMemo(
    () => getCurrentSectionKey(pathname, session?.role),
    [pathname, session?.role],
  );

  const currentSection = useMemo(() => {
    const sections = getNavigationSections(session?.role);
    return sections.find((section) => section.key === currentSectionKey);
  }, [currentSectionKey, session?.role]);

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-40 h-[74px] border-b border-slate-800/80 bg-[#07111f]/95 text-slate-100 shadow-[0_12px_45px_rgba(2,6,23,0.35)] backdrop-blur-xl">
      <div className="flex h-full items-center">
        <div className="flex h-full w-[270px] shrink-0 items-center border-r border-slate-800/80 px-6 xl:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black text-white">
            TC
          </div>
        </div>

        <div className="flex h-full flex-1 items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-5">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white"
              aria-label="Abrir menú"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <div className="hidden min-w-0 xl:block">
              <p className="truncate text-sm font-black text-white">
                {currentSection?.title ?? 'Panel'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                TC Command Center
              </p>
            </div>

            <div className="relative hidden w-[380px] max-w-[42vw] lg:block">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                placeholder="Buscar en TC..."
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/55 pl-11 pr-20 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-700/80 px-2 py-1 text-[10px] font-semibold text-slate-500">
                Ctrl + K
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white"
              aria-label="Notificaciones"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                5
              </span>
            </button>

            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white sm:flex"
              aria-label="Calendario"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-white sm:flex"
              aria-label="Ayuda"
            >
              <HelpIcon className="h-5 w-5" />
            </button>

            <div className="hidden h-11 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-3 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-blue-300">
                <CubeIcon className="h-4 w-4" />
              </span>

              <span className="min-w-0">
                <span className="block max-w-[150px] truncate text-sm font-black text-white">
                  {mounted ? getCompanyName(session) : 'Cargando...'}
                </span>
                <span className="block text-xs text-slate-500">
                  {session?.role ?? 'Empresa'}
                </span>
              </span>

              <ChevronDownIcon className="h-4 w-4 text-slate-500" />
            </div>

            <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-xs font-black text-blue-200">
                {getInitials(session)}
              </span>

              <span className="hidden max-w-[120px] truncate text-sm font-black text-white lg:block">
                {mounted ? getUserLabel(session) : 'Admin'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                clearTcSession();
                window.location.href = '/login';
              }}
              className="hidden h-11 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/55 px-4 text-sm font-black text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 sm:flex"
            >
              <LogOutIcon className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}