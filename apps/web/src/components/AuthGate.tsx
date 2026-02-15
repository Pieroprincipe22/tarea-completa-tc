'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { readTcSession } from '@/lib/tc/session';

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // En client component, esto se evalúa en runtime del navegador
  const session = readTcSession();

  if (!session && pathname !== '/login') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
          <h1 className="text-xl font-semibold">Sesión requerida</h1>
          <p className="text-sm text-slate-300">
            Configura <code>companyId</code> y <code>userId</code> en /login.
          </p>
          <Link className="underline" href="/login">
            Ir a /login
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
