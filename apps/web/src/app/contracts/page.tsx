import ModuleLanding from '@/components/modules/ModuleLanding';

export default function ContractsPage() {
  return (
    <ModuleLanding
      title="Contratos"
      description="Organiza la relación contractual con cada cliente: alcance del servicio, periodicidad, cobertura, renovaciones, documentación y condiciones operativas. Está planteado como una base sólida para crecer luego hacia facturación, planificación y SLA."
      focusText="alcance · periodicidad · cobertura · renovación"
      items={[
        {
          title: 'Listado de contratos',
          description:
            'Base futura para consultar contratos activos, vencidos, borradores y estados administrativos.',
          href: '/contracts/list',
          comingSoon: true,
        },
        {
          title: 'Alta de contrato',
          description:
            'Creación futura de contratos ligados a cliente, site, frecuencia de servicio y condiciones comerciales.',
          href: '/contracts/new',
          comingSoon: true,
        },
        {
          title: 'Planes de servicio',
          description:
            'Definición futura de modalidades como mantenimiento mensual, semanal, preventivo o cobertura integral.',
          href: '/contracts/plans',
          comingSoon: true,
        },
        {
          title: 'Renovaciones',
          description:
            'Gestión futura de vencimientos, renovaciones automáticas, avisos y seguimiento comercial.',
          href: '/contracts/renewals',
          comingSoon: true,
        },
        {
          title: 'Cobertura y alcance',
          description:
            'Detalle futuro de qué equipos, sites, tareas y frecuencias quedan cubiertos por cada contrato.',
          href: '/contracts/scope',
          comingSoon: true,
        },
        {
          title: 'Documentación contractual',
          description:
            'Base futura para anexos, PDFs, condiciones firmadas y documentación asociada al servicio.',
          href: '/contracts/documents',
          comingSoon: true,
        },
      ]}
    />
  );
}