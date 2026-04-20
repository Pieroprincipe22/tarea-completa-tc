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
  getPrimaryNavItems,
} from '@/lib/tc/navigation';

function formatSessionLabel(session: TcSession | null, mounted: boolean) {
  if (!mounted) return 'Cargando...';
  return session?.email ?? session?.name ?? 'Sin sesión';
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

  if (pathname === '/login') return null;

  return (
    <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">
                {formatSessionLabel(session, mounted)}
              </span>{' '}
              —{' '}
              <span className="opacity-80">
                {formatSessionMeta(session, mounted)}
              </span>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Navegación estructurada por módulos para crecer sin mezclar áreas.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
              onClick={() => {
                clearTcSession();
                window.location.href = '/login';
              }}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
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
                    : 'border border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}