'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearTcSession, readTcSession } from '@/lib/tc/session';

export default function TopBar() {
  const pathname = usePathname();
  const session = readTcSession();

  if (pathname === '/login') return null;

  return (
    <div className="border-b border-slate-800 bg-slate-900/30">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">
            {session?.name ?? 'Demo'}
          </span>{' '}
          — <span className="opacity-80">{session?.companyId ?? 'no-company'}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link className="hover:underline" href="/dashboard">
            Dashboard
          </Link>
          <Link className="hover:underline" href="/maintenance-reports">
            Reports
          </Link>
          <Link className="hover:underline" href="/work-orders">
            Work Orders
          </Link>

          <button
            className="rounded-lg border border-slate-700 px-3 py-1 hover:bg-slate-800"
            onClick={() => {
              clearTcSession();
              location.href = '/login';
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
