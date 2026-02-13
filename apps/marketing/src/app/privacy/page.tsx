import { Container } from '@/components/Container';

export const metadata = { title: 'Privacidad' };

export default function PrivacyPage() {
  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">
          Política de Privacidad
        </h1>
        <p className="mt-4 text-sm text-neutral-700">
          Placeholder MVP. Aquí describiremos cómo se almacenan y protegen los datos.
        </p>
      </div>
    </Container>
  );
}
