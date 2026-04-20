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
    title: 'Panel',
    sectionPath: '/dashboard',
    groups: [
      {
        key: 'panel-main',
        title: 'Panel',
        shortTitle: 'Panel',
        items: [
          leaf('dashboard', 'Dashboard', '/dashboard', {
            description: 'Resumen general del negocio y la operación.',
          }),
        ],
      },
    ],
  },
  {
    key: 'operaciones',
    title: 'Operaciones',
    sectionPath: '/operations',
    groups: [
      {
        key: 'operaciones-main',
        title: 'Operaciones',
        shortTitle: 'Operaciones',
        items: [
          leaf('work-orders', 'Órdenes de trabajo', '/work-orders', {
            description: 'Gestión operativa de órdenes.',
          }),
          leaf('work-reports', 'Partes de trabajo', '/maintenance-reports', {
            description: 'Partes rellenados por técnicos y revisados por admin.',
          }),
          leaf('reports', 'Informes', '/operations/reports', {
            description: 'Informes finales y explotación administrativa.',
            comingSoon: true,
          }),
          leaf('planning', 'Planificación', '/operations/planning', {
            description: 'Agenda, programación y coordinación operativa.',
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
        title: 'Clientes y contratos',
        shortTitle: 'Clientes',
        items: [
          leaf('customers', 'Clientes', '/customers', {
            description: 'Empresas cliente y sus datos principales.',
          }),
          leaf('contracts', 'Contratos', '/contracts', {
            description: 'Contratos, condiciones y renovaciones.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
  {
    key: 'activos',
    title: 'Activos',
    sectionPath: '/inventory',
    groups: [
      {
        key: 'activos-main',
        title: 'Activos e inventario',
        shortTitle: 'Activos',
        items: [
          leaf('assets-home', 'Resumen de activos', '/inventory', {
            description: 'Entrada principal del módulo de activos e inventario.',
          }),
          leaf('inventory', 'Inventario', '/inventory/stock', {
            description: 'Materiales, repuestos, consumibles y stock.',
            comingSoon: true,
          }),
          leaf('assets', 'Equipos / activos', '/assets', {
            description: 'Equipos instalados en clientes y sites.',
            comingSoon: true,
          }),
          leaf('sites', 'Sites / ubicaciones', '/sites', {
            description:
              'Centros, plantas, edificios o ubicaciones de servicio.',
            comingSoon: true,
          }),
        ],
      },
    ],
  },
  {
    key: 'personal',
    title: 'Personal',
    sectionPath: '/team',
    groups: [
      {
        key: 'personal-main',
        title: 'Personal',
        shortTitle: 'Personal',
        items: [
          leaf('team-home', 'Resumen de personal', '/team', {
            description: 'Entrada principal del módulo de personal.',
          }),
          leaf('technicians', 'Técnicos', '/technicians', {
            description: 'Gestión del equipo técnico.',
            comingSoon: true,
          }),
          leaf('users', 'Usuarios', '/users', {
            description: 'Usuarios internos y permisos.',
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
            'checklist-templates',
            'Plantillas de checklist',
            '/maintenance-templates',
            {
              description: 'Plantillas reutilizables para partes y checklists.',
            },
          ),
          leaf(
            'maintenance-templates-future',
            'Plantillas de mantenimiento',
            '/templates/maintenance',
            {
              description: 'Biblioteca avanzada de plantillas técnicas.',
              comingSoon: true,
            },
          ),
        ],
      },
    ],
  },
];

const TECHNICIAN_SECTIONS: TcNavSection[] = [
  {
    key: 'panel',
    title: 'Panel',
    sectionPath: '/technician/dashboard',
    roles: ['TECHNICIAN'],
    groups: [
      {
        key: 'tech-panel',
        title: 'Panel técnico',
        shortTitle: 'Panel',
        roles: ['TECHNICIAN'],
        items: [
          leaf('tech-dashboard', 'Dashboard', '/technician/dashboard', {
            roles: ['TECHNICIAN'],
            description: 'Vista principal del técnico.',
          }),
        ],
      },
    ],
  },
  {
    key: 'operaciones',
    title: 'Operaciones',
    sectionPath: '/technician/dashboard/work-orders',
    roles: ['TECHNICIAN'],
    groups: [
      {
        key: 'tech-operaciones',
        title: 'Mi trabajo',
        shortTitle: 'Mi trabajo',
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
    const firstVisibleLeaf = section.groups.flatMap((group) => group.items)[0];

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
        (section.sectionPath
          ? isPathActive(pathname, section.sectionPath)
          : false),
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
      (section.sectionPath
        ? isPathActive(pathname, section.sectionPath)
        : false),
  );

  return matchedSection?.key ?? null;
}

export function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}