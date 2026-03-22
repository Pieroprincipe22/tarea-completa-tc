'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  clearTcSession,
  isTechnicianRole,
  readTcSession,
} from '@/lib/tc/session';

type TcSession = ReturnType<typeof readTcSession>;

type NavItem = {
  label: string;
  href: string;
};

function getNavItems(session: TcSession): NavItem[] {
  if (isTechnicianRole(session?.role)) {
    return [
      { label: 'Dashboard', href: '/technician/dashboard' },
      { label: 'Work Orders', href: '/technician/dashboard/work-orders' },
    ];
  }

  return [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reports', href: '/maintenance-reports' },
    { label: 'Work Orders', href: '/work-orders' },
  ];
}

export default function TopBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession>(null);

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
  }, [pathname]);

  const navItems = useMemo(() => getNavItems(session), [session]);

  if (pathname === '/login') return null;

  return (
    <div className="border-b border-slate-800 bg-slate-900/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">
            {mounted ? session?.email ?? session?.name ?? 'Sin sesión' : 'Cargando...'}
          </span>{' '}
          —{' '}
          <span className="opacity-80">
            {mounted
              ? `${session?.companyName ?? session?.companyId ?? 'sin-company'}${
                  session?.role ? ` · ${session.role}` : ''
                }`
              : '...'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={active ? 'underline' : 'hover:underline'}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            className="rounded-lg border border-slate-700 px-3 py-1 hover:bg-slate-800"
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
    </div>
  );
}