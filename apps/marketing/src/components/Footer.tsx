import Link from 'next/link';
import { Container } from './Container';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <Container>
        <div className="flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">TC Mantenimiento</div>
            <div className="text-xs text-neutral-500">
              Multi-tenant · Checklists · Órdenes de trabajo · Evidencias
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-neutral-700 hover:text-black">
              Privacidad
            </Link>
            <Link href="/terms" className="text-neutral-700 hover:text-black">
              Términos
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
