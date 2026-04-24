'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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

function formatSessionLabel(session: TcSession | null, mounted: boolean) {
  if (!mounted) return 'Cargando...';
  return session?.name ?? session?.email ?? 'Sin sesión';
}

function formatSessionMeta(session: TcSession | null, mounted: boolean) {
  if (!mounted) return '...';

  const company = session?.companyName ?? session?.companyId ?? 'sin-company';
  const role = session?.role ? ` · ${session.role}` : '';

  return `${company}${role}`;
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

  if (pathname === '/login') return null;

  return (
    <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={session?.role === 'TECHNICIAN' ? '/technician/dashboard' : '/dashboard'}
                  className="text-lg font-semibold tracking-tight text-slate-100"
                >
                  TC Mantenimiento
                </Link>

                {currentSection ? (
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                    {currentSection.title}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-sm text-slate-300">
                <span className="font-medium text-slate-100">
                  {formatSessionLabel(session, mounted)}
                </span>{' '}
                —{' '}
                <span className="text-slate-400">
                  {formatSessionMeta(session, mounted)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  clearTcSession();
                  window.location.href = '/login';
                }}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {primaryNavItems.map((item) => {
              const active = item.sectionKey === currentSectionKey;

              return (
                <Link
                  key={item.key}
                  href={item.path}
                  className={[
                    'rounded-xl px-3 py-2 text-sm font-medium transition',
                    active
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
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