import Link from 'next/link';
import { Container } from '@/components/Container';

export const metadata = { title: 'Gracias' };

export default function ThanksPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const from = searchParams?.from ?? 'trial';

  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">¡Gracias!</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Recibimos tu solicitud ({from}). Te contactaremos pronto.
        </p>

        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/" className="text-neutral-700 hover:text-black">
            ← Volver al inicio
          </Link>
          <Link href="/demo" className="text-neutral-700 hover:text-black">
            Ver demo →
          </Link>
        </div>
      </div>
    </Container>
  );
}
