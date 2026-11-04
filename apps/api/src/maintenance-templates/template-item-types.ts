/**
 * Tipos de punto que una empresa puede poner en sus plantillas.
 * Son valores del enum MaintenanceItemType de la base de datos.
 */
export const TEMPLATE_ITEM_TYPES = [
  'CHECKLIST', // Comprobación: Correcto / Incorrecto / No aplica
  'CHOICE', // Estado: el técnico elige una de las opciones de la empresa
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

// Solo los puntos de tipo Estado llevan opciones.
export const CHOICE_TYPE: TemplateItemType = 'CHOICE';

/**
 * Qué significa cada opción de un punto de tipo Estado:
 * OK = correcto, ISSUE = incidencia (sale en el resumen del informe),
 * NA = no aplica. Coinciden con el estado de un punto del parte
 * (OK / FAIL / NA), así que al elegir una opción el parte ya sabe si
 * hay incidencia.
 */
export const OPTION_RESULTS = ['OK', 'ISSUE', 'NA'] as const;
export type OptionResult = (typeof OPTION_RESULTS)[number];

export type TemplateItemOption = {
  label: string;
  result: OptionResult;
};

export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 10;
export const OPTION_LABEL_MAX = 60;

/**
 * Lee las opciones guardadas en la base de datos (columna JSON).
 * Lo que no tenga la forma esperada se descarta en lugar de romper.
 */
export function readOptions(value: unknown): TemplateItemOption[] {
  if (!Array.isArray(value)) return [];
  const options: TemplateItemOption[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { label, result } = entry as Record<string, unknown>;
    if (typeof label !== 'string' || !label.trim()) continue;
    options.push({
      label: label.trim(),
      result: (OPTION_RESULTS as readonly unknown[]).includes(result)
        ? (result as OptionResult)
        : 'OK',
    });
  }
  return options;
}