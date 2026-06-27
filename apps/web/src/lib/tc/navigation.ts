export type TcNavRole = 'ADMIN' | 'SUPER_ADMIN' | 'TECHNICIAN';

export type TcNavLeaf = {
  key: string;
  title: string;
  path: string;
  description?: string;
  roles?: TcNavRole[];
  comingSoon?: boolean;
};

export type TcNavGroup = {
  key: string;
  title: string;
  shortTitle?: string;
  roles?: TcNavRole[];
  items: TcNavLeaf[];
};

export type TcNavSection = {
  key: string;
  title: string;
  sectionPath?: string;
  roles?: TcNavRole[];
  groups: TcNavGroup[];
};

export type TcPrimaryNavItem = {
  key: string;
  title: string;
  path: string;
  sectionKey: string;
  activeMatchers: string[];
  hasVisibleItems: boolean;
};

function normalizeRole(role?: string | null): TcNavRole | null {
  const normalized = String(role ?? '').trim().toUpperCase();

  if (
    normalized === 'ADMIN' ||
    normalized === 'SUPER_ADMIN' ||
    normalized === 'TECHNICIAN'
  ) {
    return normalized;
  }

  return null;
}

function isAllowedForRole(
  role: TcNavRole | null,
  roles?: TcNavRole[],
): boolean {
  if (!roles || roles.length === 0) return true;
  if (!role) return false;

  return roles.includes(role);
}

function leaf(
  key: string,
  title: string,
  path: string,
  options?: Omit<TcNavLeaf, 'key' | 'title' | 'path'>,
): TcNavLeaf {
  return {
    key,
    title,
    path,
    ...options,
  };
}

const ADMIN_SECTIONS: TcNavSection[] = [
  {
    key: 'panel',
    title: 'Panel principal',
    sectionPath: '/dashboard',
    groups: [
      {
        key: 'panel-main',
        title: 'Panel principal',
        shortTitle: 'Panel',
        items: [
          leaf('dashboard', 'Panel principal', '/dashboard', {
            description: 'Resumen general de la operación.',
          }),
        ],
      },
    ],
  },
  {
    key: 'ordenes',
    title: 'Órdenes de trabajo',
    sectionPath: '/work-orders',
    groups: [
      {
        key: 'ordenes-main',
        title: 'Órdenes de trabajo',
        shortTitle: 'Órdenes',
        items: [
          leaf('work-orders', 'Órdenes de trabajo', '/work-orders', {
            description: 'Asignación, seguimiento y cierre de trabajos.',
          }),
        ],
      },
    ],
  },
  {
    key: 'partes',
    title: 'Partes técnicos',
    sectionPath: '/maintenance-reports',
    groups: [
      {
        key: 'partes-main',
        title: 'Partes técnicos',
        shortTitle: 'Partes',
        items: [
          leaf('maintenance-reports', 'Partes técnicos', '/maintenance-reports', {
            description: 'Partes rellenados por técnicos.',
          }),
          leaf('new-report', 'Nueva revisión', '/new', {
            description: 'Crear un nuevo parte técnico.',
          }),
          leaf(
            'admin-maintenance-reports',
            'Revisión administrativa',
            '/admin/dashboard/maintenance-reports',
            {
              description: 'Revisión de partes enviados al administrador.',
            },
          ),
        ],
      },
    ],
  },
  {
    key: 'calendario',
    title: 'Calendario',
    sectionPath: '/calendar',
    groups: [
      {
        key: 'calendario-main',
        title: 'Calendario',
        shortTitle: 'Calendario',
        items: [
          leaf('calendar', 'Calendario', '/calendar', {
            description: 'Agenda, planificación y trabajos programados.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
  {
    key: 'clientes',
    title: 'Clientes',
    sectionPath: '/customers',
    groups: [
      {
        key: 'clientes-main',
        title: 'Clientes',
        shortTitle: 'Clientes',
        items: [
          leaf('customers', 'Clientes', '/customers', {
            description: 'Empresas cliente y datos principales.',
          }),
          leaf('sites', 'Sites / ubicaciones', '/sites', {
            description: 'Hoteles, edificios, plantas, zonas y ubicaciones.',
          }),
          leaf('customer-assets', 'Equipos del cliente', '/assets', {
            description: 'Equipos asociados a clientes y ubicaciones.',
          }),
        ],
      },
    ],
  },
  {
    key: 'inventario',
    title: 'Inventario',
    sectionPath: '/inventory',
    groups: [
      {
        key: 'inventario-main',
        title: 'Inventario',
        shortTitle: 'Inventario',
        items: [
          leaf('inventory-home', 'Inventario', '/inventory', {
            description: 'Resumen de almacén, stock y pedidos.',
          }),
          leaf('inventory-warehouse', 'Almacén', '/inventory/warehouse', {
            description: 'Stock, materiales y ubicaciones.',
          }),
          leaf('inventory-orders', 'Pedidos', '/inventory/orders', {
            description: 'Solicitudes de materiales.',
          }),
          leaf(
            'inventory-movements',
            'Movimientos de almacén',
            '/inventory/movements',
            {
              description: 'Entradas y salidas de almacén.',
              comingSoon: true,
            },
          ),
          leaf('inventory-purchases', 'Compras', '/inventory/purchases', {
            description: 'Órdenes de compra a proveedores.',
            comingSoon: true,
          }),
          leaf(
            'inventory-replenishment',
            'Reposición',
            '/inventory/replenishment',
            {
              description: 'Sugerencias y mínimos de reposición.',
              comingSoon: true,
            },
          ),
        ],
      },
    ],
  },
  {
    key: 'tecnicos',
    title: 'Técnicos',
    sectionPath: '/technicians',
    groups: [
      {
        key: 'tecnicos-main',
        title: 'Técnicos',
        shortTitle: 'Técnicos',
        items: [
          leaf('technicians', 'Técnicos', '/technicians', {
            description: 'Equipo técnico y asignaciones.',
          }),
          leaf('team', 'Equipo interno', '/team', {
            description: 'Estructura interna del equipo.',
            comingSoon: true,
          }),
          leaf('team-users', 'Usuarios', '/team/users', {
            description: 'Usuarios, roles y permisos.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
  {
    key: 'contratos',
    title: 'Contratos',
    sectionPath: '/contracts',
    groups: [
      {
        key: 'contratos-main',
        title: 'Contratos',
        shortTitle: 'Contratos',
        items: [
          leaf('contracts', 'Contratos', '/contracts', {
            description: 'Contratos, condiciones, renovaciones y alcance.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
  {
    key: 'plantillas',
    title: 'Plantillas',
    sectionPath: '/maintenance-templates',
    groups: [
      {
        key: 'plantillas-main',
        title: 'Plantillas',
        shortTitle: 'Plantillas',
        items: [
          leaf(
            'maintenance-templates',
            'Plantillas de checklist',
            '/maintenance-templates',
            {
              description: 'Plantillas reutilizables para partes técnicos.',
            },
          ),
          leaf('templates-home', 'Biblioteca de plantillas', '/templates', {
            description: 'Resumen general de plantillas.',
            comingSoon: true,
          }),
          leaf(
            'templates-maintenance',
            'Plantillas de mantenimiento',
            '/templates/maintenance',
            {
              description: 'Plantillas avanzadas de mantenimiento.',
              comingSoon: true,
            },
          ),
        ],
      },
    ],
  },
  {
    key: 'reportes',
    title: 'Reportes',
    sectionPath: '/reports',
    groups: [
      {
        key: 'reportes-main',
        title: 'Reportes',
        shortTitle: 'Reportes',
        items: [
          leaf('reports', 'Reportes', '/reports', {
            description: 'Indicadores, métricas e informes de operación.',
            comingSoon: true,
          }),
          leaf('operations-reports', 'Informes operativos', '/operations/reports', {
            description: 'Informes finales y explotación administrativa.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
  {
    key: 'configuracion',
    title: 'Configuración',
    sectionPath: '/settings',
    groups: [
      {
        key: 'configuracion-main',
        title: 'Configuración',
        shortTitle: 'Configuración',
        items: [
          leaf('settings', 'Configuración', '/settings', {
            description: 'Ajustes generales del sistema.',
            comingSoon: true,
          }),
          leaf('settings-company', 'Empresa', '/settings/company', {
            description: 'Datos de empresa, branding y preferencias.',
            comingSoon: true,
          }),
          leaf('settings-security', 'Seguridad', '/settings/security', {
            description: 'Roles, sesiones y seguridad de acceso.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
];

const TECHNICIAN_SECTIONS: TcNavSection[] = [
  {
    key: 'panel',
    title: 'Panel técnico',
    sectionPath: '/technician/dashboard',
    roles: ['TECHNICIAN'],
    groups: [
      {
        key: 'tech-panel',
        title: 'Panel técnico',
        shortTitle: 'Panel',
        roles: ['TECHNICIAN'],
        items: [
          leaf('tech-dashboard', 'Panel técnico', '/technician/dashboard', {
            roles: ['TECHNICIAN'],
            description: 'Vista principal del técnico.',
          }),
        ],
      },
    ],
  },
  {
    key: 'ordenes',
    title: 'Mis órdenes',
    sectionPath: '/technician/dashboard/work-orders',
    roles: ['TECHNICIAN'],
    groups: [
      {
        key: 'tech-work',
        title: 'Mis órdenes',
        shortTitle: 'Mis órdenes',
        roles: ['TECHNICIAN'],
        items: [
          leaf(
            'tech-work-orders',
            'Mis órdenes de trabajo',
            '/technician/dashboard/work-orders',
            {
              roles: ['TECHNICIAN'],
              description: 'Órdenes asignadas al técnico.',
            },
          ),
        ],
      },
    ],
  },
  {
    key: 'partes',
    title: 'Mis partes',
    sectionPath: '/new',
    roles: ['TECHNICIAN'],
    groups: [
      {
        key: 'tech-reports',
        title: 'Mis partes',
        shortTitle: 'Partes',
        roles: ['TECHNICIAN'],
        items: [
          leaf('tech-new-report', 'Nuevo parte', '/new', {
            roles: ['TECHNICIAN'],
            description: 'Crear un parte técnico.',
          }),
          leaf('tech-maintenance-reports', 'Partes enviados', '/maintenance-reports', {
            roles: ['TECHNICIAN'],
            description: 'Historial de partes técnicos.',
          }),
        ],
      },
    ],
  },
];

export function getNavigationSections(
  role?: string | null,
): TcNavSection[] {
  const normalizedRole = normalizeRole(role);
  const base =
    normalizedRole === 'TECHNICIAN' ? TECHNICIAN_SECTIONS : ADMIN_SECTIONS;

  return base
    .filter((section) => isAllowedForRole(normalizedRole, section.roles))
    .map((section) => ({
      ...section,
      groups: section.groups
        .filter((group) => isAllowedForRole(normalizedRole, group.roles))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            isAllowedForRole(normalizedRole, item.roles),
          ),
        }))
        .filter((group) => group.items.length > 0),
    }))
    .filter((section) => section.groups.length > 0);
}

export function getPrimaryNavItems(
  role?: string | null,
): TcPrimaryNavItem[] {
  return getNavigationSections(role).map((section) => {
    const firstVisibleLeaf = section.groups
      .flatMap((group) => group.items)
      .find((item) => !item.comingSoon);

    const activeMatchers = section.groups.flatMap((group) =>
      group.items.map((item) => item.path),
    );

    if (section.sectionPath) {
      activeMatchers.push(section.sectionPath);
    }

    return {
      key: section.key,
      title: section.title,
      path: section.sectionPath ?? firstVisibleLeaf?.path ?? '/dashboard',
      sectionKey: section.key,
      activeMatchers,
      hasVisibleItems: !!firstVisibleLeaf,
    };
  });
}

export function getSidebarGroupsForPath(
  pathname: string,
  role?: string | null,
): TcNavGroup[] {
  const sections = getNavigationSections(role);

  const matchedSection =
    sections.find(
      (section) =>
        section.groups.some((group) =>
          group.items.some((item) => isPathActive(pathname, item.path)),
        ) ||
        (section.sectionPath ? isPathActive(pathname, section.sectionPath) : false),
    ) ?? sections[0];

  return matchedSection?.groups ?? [];
}

export function getCurrentSectionKey(
  pathname: string,
  role?: string | null,
): string | null {
  const sections = getNavigationSections(role);

  const matchedSection = sections.find(
    (section) =>
      section.groups.some((group) =>
        group.items.some((item) => isPathActive(pathname, item.path)),
      ) ||
      (section.sectionPath ? isPathActive(pathname, section.sectionPath) : false),
  );

  return matchedSection?.key ?? null;
}

export function getCurrentSection(
  pathname: string,
  role?: string | null,
): TcNavSection | null {
  const sections = getNavigationSections(role);
  const currentKey = getCurrentSectionKey(pathname, role);

  return sections.find((section) => section.key === currentKey) ?? null;
}

export function isPathActive(pathname: string, href: string): boolean {
  if (!pathname || !href) return false;

  const normalizedPathname =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;

  const normalizedHref =
    href.length > 1 && href.endsWith('/') ? href.slice(0, -1) : href;

  if (normalizedPathname === normalizedHref) return true;

  return normalizedPathname.startsWith(`${normalizedHref}/`);
}