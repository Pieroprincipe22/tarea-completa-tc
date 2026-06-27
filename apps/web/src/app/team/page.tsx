import ModuleLanding from '@/components/modules/ModuleLanding';

export default function TeamPage() {
  return (
    <ModuleLanding
      eyebrow="Módulo"
      title="Personal"
      description="Desde aquí puedes revisar técnicos, usuarios internos y dar de alta nuevos trabajadores según el rol que necesites asignar en la empresa."
      focusText="técnicos · usuarios · roles · permisos · altas"
      items={[
        {
          title: 'Técnicos',
          description:
            'Consulta la lista completa de técnicos, su estado, disponibilidad, especialidad y carga operativa.',
          href: '/team/technicians',
        },
        {
          title: 'Usuarios',
          description:
            'Gestiona trabajadores, encargados, administración, roles, permisos y activación de usuarios internos.',
          href: '/team/users',
        },
        {
          title: 'Dar de alta usuario',
          description:
            'Crea técnicos o administradores para tu empresa según el rol asignado y las necesidades operativas.',
          href: '/team/users/new',
        },
        {
          title: 'Permisos por módulo',
          description:
            'Control granular para decidir qué usuario puede ver, crear, editar, aprobar o eliminar.',
          href: '/team/permissions',
          comingSoon: true,
        },
        {
          title: 'Turnos y disponibilidad',
          description:
            'Planificación de técnicos por guardias, vacaciones, ausencias y disponibilidad real.',
          href: '/team/schedule',
          comingSoon: true,
        },
        {
          title: 'Auditoría de cambios',
          description:
            'Historial de altas, bajas, cambios de rol, activaciones y acciones críticas.',
          href: '/team/audit',
          comingSoon: true,
        },
        {
          title: 'Perfiles completos',
          description:
            'Ficha ampliada con teléfono, departamento, responsable, firma, documentación y preferencias.',
          href: '/team/profiles',
          comingSoon: true,
        },
      ]}
    />
  );
}