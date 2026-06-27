import ModuleLanding from '@/components/modules/ModuleLanding';

export default function ContractsPage() {
  return (
    <ModuleLanding
      eyebrow="Clientes"
      title="Contratos"
      description="Organiza la relación contractual con cada cliente: alcance del servicio, periodicidad, cobertura, renovaciones, documentación, condiciones operativas y trazabilidad administrativa."
      focusText="cliente · contrato · cobertura · renovación · documentación"
      items={[
        {
          title: 'Listado de contratos',
          description:
            'Consulta contratos activos, vencidos, borradores y estados administrativos vinculados a cada cliente.',
          href: '/contracts/list',
          comingSoon: true,
        },
        {
          title: 'Alta de contrato',
          description:
            'Creación de contratos ligados a cliente, site, frecuencia de servicio, condiciones comerciales y cobertura operativa.',
          href: '/contracts/new',
          comingSoon: true,
        },
        {
          title: 'Planes de servicio',
          description:
            'Define modalidades como mantenimiento mensual, semanal, preventivo, correctivo o cobertura integral.',
          href: '/contracts/plans',
          comingSoon: true,
        },
        {
          title: 'Renovaciones',
          description:
            'Control de vencimientos, renovaciones automáticas, avisos internos y seguimiento comercial.',
          href: '/contracts/renewals',
          comingSoon: true,
        },
        {
          title: 'Cobertura y alcance',
          description:
            'Detalle de qué equipos, sites, tareas, horarios y frecuencias quedan cubiertos por cada contrato.',
          href: '/contracts/scope',
          comingSoon: true,
        },
        {
          title: 'Documentación contractual',
          description:
            'Base futura para anexos, PDFs, condiciones firmadas, facturas, presupuestos y documentación asociada al servicio.',
          href: '/contracts/documents',
          comingSoon: true,
        },
      ]}
    />
  );
}