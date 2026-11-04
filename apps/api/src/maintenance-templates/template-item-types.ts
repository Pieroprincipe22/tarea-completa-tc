/**
 * Tipos de punto que una empresa puede poner en sus plantillas.
 * Son valores del enum MaintenanceItemType de la base de datos.
 */
export const TEMPLATE_ITEM_TYPES = [
  'CHECKLIST', // Comprobación: Correcto / Incorrecto / No aplica
  'NUMBER', // Medición con unidad y rango opcional
  'TEXT', // Texto corto
  'TEXTAREA', // Texto largo
  'BOOLEAN', // Sí / No
  'DATE', // Fecha
  'PHOTO', // Foto
  'SIGNATURE', // Firma
] as const;

export type TemplateItemType = (typeof TEMPLATE_ITEM_TYPES)[number];

// Solo las mediciones llevan unidad y rango.
export const MEASUREMENT_TYPE: TemplateItemType = 'NUMBER';