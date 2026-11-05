export type LocationType = 'WAREHOUSE' | 'RACK' | 'SHELF' | 'VAN';

export type LocationSummary = {
  id: string;
  code: string;
  name: string;
  type: LocationType;
};

export type InventoryLocation = LocationSummary & {
  parentId: string | null;
  parent: LocationSummary | null;
  path: string[];
  assignedUser: { id: string; name: string } | null;
  notes: string | null;
  sortOrder: number;
  isActive: boolean;
  childrenCount: number;
  partsWithStock: number;
};

export type InventoryLocationDetail = InventoryLocation & {
  children: LocationSummary[];
};

export type InventoryCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  partsCount: number;
};

export type InventoryStatus = {
  enabled: boolean;
  plan: string | null;
  role: string | null;
};

export type Technician = { id: string; name: string; email: string };

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  WAREHOUSE: 'Almacén',
  RACK: 'Estantería',
  SHELF: 'Balda',
  VAN: 'Furgoneta',
};

/** Tipo que tiene que tener el padre. null = va suelta. Igual que en la API. */
export const LOCATION_PARENT_TYPE: Record<LocationType, LocationType | null> = {
  WAREHOUSE: null,
  RACK: 'WAREHOUSE',
  SHELF: 'RACK',
  VAN: null,
};

const CODE_PREFIX: Record<LocationType, string> = {
  WAREHOUSE: 'A',
  RACK: 'E',
  SHELF: 'B',
  VAN: 'F',
};

/**
 * Código sugerido para la siguiente ubicación: A1, E1, F1… y para las baldas
 * el código de su estantería: E1 → E1-B3. Salta los códigos que ya existen.
 */
export function suggestCode(
  type: LocationType,
  parent: LocationSummary | null,
  siblingsCount: number,
  existingCodes: Set<string>,
): string {
  const build = (n: number) =>
    type === 'SHELF' && parent ? `${parent.code}-${CODE_PREFIX.SHELF}${n}` : `${CODE_PREFIX[type]}${n}`;

  let n = siblingsCount + 1;

  while (existingCodes.has(build(n)) && n < 999) {
    n += 1;
  }

  return build(n);
}

export type LocationNode = InventoryLocation & { children: LocationNode[] };

/** Árbol almacén → estantería → balda a partir de la lista plana de la API. */
export function buildLocationTree(items: InventoryLocation[]): LocationNode[] {
  const nodes = new Map<string, LocationNode>();

  for (const item of items) {
    nodes.set(item.id, { ...item, children: [] });
  }

  const roots: LocationNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Enlace que lleva cada QR: al escanearlo con la cámara se abre la ubicación. */
export function locationQrUrl(origin: string, code: string): string {
  return `${origin}/l/${encodeURIComponent(code)}`;
}
