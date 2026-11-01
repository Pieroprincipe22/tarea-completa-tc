'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isPublicRoute } from '@/lib/tc/public-routes';
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
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 space-y-3">
          <h1 className="text-xl font-semibold">Cargando sesión...</h1>
          <p className="text-sm text-ink-2">
            Esperando la sesión del navegador.
          </p>
        </div>
      </div>
    );
  }

  if (!session && !isPublicRoute(pathname)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 space-y-3">
          <h1 className="text-xl font-semibold">Sesión requerida</h1>
          <p className="text-sm text-ink-2">
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