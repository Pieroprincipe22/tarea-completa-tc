import type { InventoryLocationType } from '@prisma/client';

export const INVENTORY_PRODUCT = 'INVENTORY' as const;

/** Categorías con las que empieza una empresa (sacadas del trastero piloto). */
export const DEFAULT_INVENTORY_CATEGORIES: readonly string[] = [
  'Protección eléctrica',
  'Fijaciones',
  'Frigorífico',
  'Canalización',
  'Cable y mangueras',
  'Consumibles',
  'Recambios',
  'Herramientas',
];

/**
 * Tipo de ubicación que debe tener el padre. null = va en la raíz, sin padre.
 * Almacén → estantería → balda. Las furgonetas van sueltas.
 */
export const LOCATION_PARENT_TYPE: Record<InventoryLocationType, InventoryLocationType | null> = {
  WAREHOUSE: null,
  RACK: 'WAREHOUSE',
  SHELF: 'RACK',
  VAN: null,
};

export const LOCATION_TYPE_LABEL: Record<InventoryLocationType, string> = {
  WAREHOUSE: 'almacén',
  RACK: 'estantería',
  SHELF: 'balda',
  VAN: 'furgoneta',
};

export const INVENTORY_WRITE_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
