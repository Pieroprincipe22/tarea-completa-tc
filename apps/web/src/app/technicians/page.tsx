import ModuleLanding from '@/components/modules/ModuleLanding';

export default function TechniciansPage() {
  return (
    <ModuleLanding
      eyebrow="Submódulo"
      title="Técnicos"
      description="Este bloque organiza el equipo técnico como unidad operativa: especialidades, asignaciones, disponibilidad, carga de trabajo, rendimiento y trazabilidad del servicio. Está pensado para crecer junto con work orders, partes de trabajo y planificación."
      focusText="especialidades · asignación · disponibilidad · rendimiento"
      items={[
        {
          title: 'Listado de técnicos',
          description:
            'Vista futura para consultar técnicos activos, estado operativo, especialidad y carga actual.',
          href: '/technicians/list',
          comingSoon: true,
        },
        {
          title: 'Alta de técnico',
          description:
            'Creación futura de perfiles técnicos con datos operativos, especialidades y ámbito de trabajo.',
          href: '/technicians/new',
          comingSoon: true,
        },
        {
          title: 'Especialidades',
          description:
            'Clasificación futura por climatización, electricidad, fontanería, calderas, instalaciones y otros perfiles.',
          href: '/technicians/specialties',
          comingSoon: true,
        },
        {
          title: 'Disponibilidad',
          description:
            'Control futuro de turnos, guardias, vacaciones, ausencias y disponibilidad real para asignación.',
          href: '/technicians/availability',
          comingSoon: true,
        },
        {
          title: 'Carga de trabajo',
          description:
            'Visión futura del volumen de órdenes, partes y capacidad disponible por técnico.',
          href: '/technicians/workload',
          comingSoon: true,
        },
        {
          title: 'Rendimiento',
          description:
            'Base futura para medir tiempos, cierres, incidencias recurrentes y calidad operativa por técnico.',
          href: '/technicians/performance',
          comingSoon: true,
        },
      ]}
    />
  );
}