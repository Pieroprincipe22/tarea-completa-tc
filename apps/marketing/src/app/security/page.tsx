import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/ButtonLink';

export const metadata = { title: 'Seguridad' };

export default function SecurityPage() {
  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Seguridad</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          El sistema está diseñado como multi-tenant. Cada empresa opera aislada y el backend
          aplica filtros tenant-aware para minimizar riesgos de fuga de datos.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { t: 'Aislamiento por empresa', d: 'Todas las consultas aplican companyId como condición obligatoria.' },
            { t: 'Control de acceso', d: 'Base lista para roles/membership (UserCompany). RBAC simple en roadmap.' },
            { t: 'Auditoría y trazabilidad', d: 'Estados y timestamps consistentes: createdAt/updatedAt; historiales por entidad.' },
            { t: 'Evidencias y archivos', d: 'En roadmap: almacenamiento S3-compatible (MinIO local) para fotos/firmas/PDF.' },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold">{x.t}</div>
              <div className="mt-2 text-sm text-neutral-600">{x.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/contact">Contacto</ButtonLink>
          <ButtonLink href="/trial" variant="secondary">Probar 7 días</ButtonLink>
        </div>
      </div>
    </Container>
  );
}
