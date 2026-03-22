'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readTcSession } from '@/lib/tc/session';

type TcSession = ReturnType<typeof readTcSession>;

export default function AuthGate({ children }: { children: ReactNode }) {
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

  if (!mounted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
          <h1 className="text-xl font-semibold">Cargando sesión...</h1>
          <p className="text-sm text-slate-300">
            Esperando la sesión del navegador.
          </p>
        </div>
      </div>
    );
  }

  if (!session && pathname !== '/login') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
          <h1 className="text-xl font-semibold">Sesión requerida</h1>
          <p className="text-sm text-slate-300">
            Inicia sesión primero desde <code>/login</code>.
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