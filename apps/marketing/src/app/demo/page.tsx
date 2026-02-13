import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/ButtonLink';

export const metadata = { title: 'Demo' };

export default function DemoPage() {
  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Demo</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Aquí mostraremos un recorrido: plantillas → reportes → órdenes de trabajo.
          Por ahora dejamos un placeholder y luego agregamos capturas.
        </p>

        <div className="mt-10 flex gap-3">
          <ButtonLink href="/trial">Probar 7 días</ButtonLink>
          <ButtonLink href="/pricing" variant="secondary">
            Ver precios
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
