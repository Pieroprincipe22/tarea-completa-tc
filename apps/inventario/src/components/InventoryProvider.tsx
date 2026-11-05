'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import type { InventoryStatus } from '@/lib/inventory';
import {
  canEditInventory,
  clearSession,
  readSession,
  ROLE_LABEL,
  type InventorySession,
} from '@/lib/session';
import { Button, Card, cx, Loading } from './ui';

type InventoryContextValue = {
  session: InventorySession;
  status: InventoryStatus;
  canEdit: boolean;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventory(): InventoryContextValue {
  const value = useContext(InventoryContext);

  if (!value) {
    throw new Error('useInventory se usa dentro de <InventoryProvider>.');
  }

  return value;
}

const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/ubicaciones', label: 'Ubicaciones' },
  { href: '/categorias', label: 'Categorías' },
  { href: '/ubicaciones/etiquetas', label: 'Etiquetas' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/ubicaciones') {
    return pathname.startsWith('/ubicaciones') && !pathname.startsWith('/ubicaciones/etiquetas');
  }
  return pathname.startsWith(href);
}

/**
 * Comprueba la sesión y que la empresa tenga Inventorio activo antes de
 * mostrar cualquier pantalla. El login se muestra sin marco.
 */
export function InventoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';

  const [session, setSession] = useState<InventorySession | null>(null);
  const [status, setStatus] = useState<InventoryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLogin) return;

    const current = readSession();

    if (!current) {
      // Guarda a dónde iba (p. ej. un QR escaneado) para volver tras el login.
      router.replace(pathname === '/' ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setSession(current);

    let cancelled = false;

    apiFetch<InventoryStatus>(current, 'GET', '/inventory/status').then((result) => {
      if (cancelled) return;

      if (result.ok) {
        setStatus(result.data);
      } else {
        setError(result.message);
      }
    });

    return () => {
      cancelled = true;
    };
    // Solo al entrar o salir del login: no recargar el estado en cada navegación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="min-w-0">
            <span className="block text-lg font-bold tracking-tight text-ink">Inventorio</span>
            <span className="block truncate text-xs text-muted">{session?.companyName ?? ''}</span>
          </Link>

          <nav aria-label="Secciones" className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm font-semibold',
                  isActive(pathname, item.href) ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <span className="block text-sm font-semibold text-ink">{session?.name}</span>
              <span className="block text-xs text-muted">
                {ROLE_LABEL[session?.role ?? ''] ?? session?.role}
              </span>
            </div>
            <Button variant="ghost" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        {error ? (
          <Card>
            <p className="font-semibold text-ink">No se pudo conectar con Inventorio</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
          </Card>
        ) : !session || !status ? (
          <Loading />
        ) : !status.enabled ? (
          <Card>
            <p className="font-semibold text-ink">Inventorio no está activado para {session.companyName}</p>
            <p className="mt-1 text-sm text-muted">
              Pide a AnPi Tech que lo active para tu empresa. Mientras tanto puedes seguir usando PrinCore.
            </p>
          </Card>
        ) : (
          <InventoryContext.Provider value={{ session, status, canEdit: canEditInventory(session.role) }}>
            {children}
          </InventoryContext.Provider>
        )}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white md:hidden print:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className={cx(
              'flex min-h-14 items-center justify-center text-xs font-semibold',
              isActive(pathname, item.href) ? 'text-brand' : 'text-muted',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
