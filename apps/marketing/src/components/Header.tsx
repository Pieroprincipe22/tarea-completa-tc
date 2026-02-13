import Link from 'next/link';
import { Container } from './Container';
import { ButtonLink } from './ButtonLink';
import { APP_URL } from '@/lib/env';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-black text-white">
              TC
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">TC Mantenimiento</div>
              <div className="text-xs text-neutral-500">
                Gestión de mantenimiento para pymes
              </div>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/features"
              className="text-sm text-neutral-700 hover:text-black"
            >
              Funcionalidades
            </Link>
            <Link
              href="/security"
              className="text-sm text-neutral-700 hover:text-black"
            >
              Seguridad
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-neutral-700 hover:text-black"
            >
              Precios
            </Link>
            <Link
              href="/demo"
              className="text-sm text-neutral-700 hover:text-black"
            >
              Demo
            </Link>
            <Link
              href="/contact"
              className="text-sm text-neutral-700 hover:text-black"
            >
              Contacto
            </Link>
            <Link
              href="/trial"
              className="text-sm text-neutral-700 hover:text-black"
            >
              Prueba 7 días
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <a
              href={APP_URL}
              className="hidden text-sm text-neutral-700 hover:text-black md:inline"
            >
              Ir a la app
            </a>
            <ButtonLink href="/trial">Probar 7 días</ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}
