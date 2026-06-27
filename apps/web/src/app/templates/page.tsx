import ModuleLanding from '@/components/modules/ModuleLanding';

export default function TemplatesPage() {
  return (
    <ModuleLanding
      eyebrow="Módulo"
      title="Plantillas"
      description="Organiza la biblioteca reutilizable del sistema: checklists, plantillas técnicas, estructuras de mantenimiento y futuras versiones por sector, equipo, contrato o tipo de servicio."
      focusText="checklists · biblioteca · reutilización · versiones"
      items={[
        {
          title: 'Plantillas de checklist',
          description:
            'Acceso a las plantillas actuales que ya sirven como base de partes, revisiones y checklists operativos.',
          href: '/maintenance-templates',
        },
        {
          title: 'Plantillas de mantenimiento',
          description:
            'Nueva línea de crecimiento para plantillas técnicas avanzadas, familias de mantenimiento y reutilización estructurada.',
          href: '/templates/maintenance',
          comingSoon: true,
        },
        {
          title: 'Versionado de plantillas',
          description:
            'Bloque futuro para controlar cambios, histórico, borradores y evolución segura de plantillas.',
          href: '/templates/versions',
          comingSoon: true,
        },
        {
          title: 'Plantillas por sector',
          description:
            'Clasificación futura por hotelería, industria, residencial, oficinas o instalaciones especiales.',
          href: '/templates/sectors',
          comingSoon: true,
        },
        {
          title: 'Plantillas por tipo de equipo',
          description:
            'Organización futura por calderas, climatización, bombas, cuadros eléctricos y otros activos.',
          href: '/templates/assets',
          comingSoon: true,
        },
        {
          title: 'Asignación por contrato',
          description:
            'Relación futura entre plantillas, frecuencia de servicio, contrato y cobertura operativa.',
          href: '/templates/contracts',
          comingSoon: true,
        },
      ]}
    />
  );
}