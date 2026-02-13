import { Container } from '@/components/Container';
import { PricingCards } from '@/components/PricingCards';

export const metadata = { title: 'Precios' };

export default function PricingPage() {
  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Precios</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Estructura simple: prueba 7 días y luego eliges el plan que encaje con
          tu operación.
        </p>

        <div className="mt-8">
          <PricingCards />
        </div>
      </div>
    </Container>
  );
}
