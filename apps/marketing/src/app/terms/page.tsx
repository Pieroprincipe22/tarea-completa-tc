import { Container } from '@/components/Container';

export const metadata = { title: 'Términos' };

export default function TermsPage() {
  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Términos</h1>
        <p className="mt-4 text-sm text-neutral-700">
          Placeholder MVP. Aquí irán condiciones de uso, responsabilidades y limitaciones.
        </p>
      </div>
    </Container>
  );
}
