import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/ButtonLink';

export const metadata = { title: 'Funcionalidades' };

export default function FeaturesPage() {
  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Funcionalidades</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Módulos pensados para operación diaria de mantenimiento en pymes.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              t: 'Plantillas de mantenimiento',
              d: 'Checklists reutilizables con items (CHECK/NUMBER/TEXT/CHOICE).',
            },
            {
              t: 'Reportes',
              d: 'Snapshot de plantilla + estados DRAFT/FINAL para trazabilidad.',
            },
            {
              t: 'Órdenes de trabajo',
              d: 'Numeración por empresa y estados (OPEN/IN_PROGRESS/DONE...).',
            },
            {
              t: 'Entidades base',
              d: 'Clientes, sedes, contactos y activos con relaciones opcionales.',
            },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold">{x.t}</div>
              <div className="mt-2 text-sm text-neutral-600">{x.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/trial">Probar 7 días</ButtonLink>
          <ButtonLink href="/demo" variant="secondary">Ver demo</ButtonLink>
        </div>
      </div>
    </Container>
  );
}
