import ModuleLanding from '@/components/modules/ModuleLanding';

export default function UsersPage() {
  return (
    <ModuleLanding
      eyebrow="Submódulo"
      title="Usuarios"
      description="Este bloque centraliza la gestión de usuarios internos de la empresa: accesos, permisos, estado, rol operativo y trazabilidad. Está pensado para crecer luego hacia control de permisos por módulo, perfiles mixtos y seguridad por empresa."
      focusText="acceso · roles · seguridad · usuarios internos"
      items={[
        {
          title: 'Listado de usuarios',
          description:
            'Vista futura para consultar usuarios activos, inactivos, rol, empresa y estado de acceso.',
          href: '/users/list',
          comingSoon: true,
        },
        {
          title: 'Alta de usuario',
          description:
            'Creación futura de usuarios administrativos, técnicos, supervisores o perfiles mixtos.',
          href: '/users/new',
          comingSoon: true,
        },
        {
          title: 'Roles y permisos',
          description:
            'Base futura para definir permisos por módulo, acciones críticas y alcance por tenant.',
          href: '/users/roles',
          comingSoon: true,
        },
        {
          title: 'Estado y activación',
          description:
            'Control futuro de activación, desactivación, bloqueo de acceso y ciclo de vida del usuario.',
          href: '/users/status',
          comingSoon: true,
        },
        {
          title: 'Historial de acceso',
          description:
            'Trazabilidad futura de accesos, actividad y auditoría administrativa.',
          href: '/users/audit',
          comingSoon: true,
        },
        {
          title: 'Perfiles operativos',
          description:
            'Estructura futura para separar administrativos, técnicos, responsables y coordinadores.',
          href: '/users/profiles',
          comingSoon: true,
        },
      ]}
    />
  );
}