import { isRecord } from '@/lib/tc/api';

/**
 * Plantillas de mantenimiento: tipos, lectura de la API y conversión
 * entre lo que guarda la API (lista plana de puntos) y lo que edita la
 * empresa (secciones con sus puntos).
 */

export const ITEM_TYPES = [
  'CHECKLIST',
  'NUMBER',
  'TEXT',
  'TEXTAREA',
  'BOOLEAN',
  'DATE',
  'PHOTO',
  'SIGNATURE',
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_INFO: Record<ItemType, { label: string; hint: string }> =
  {
    CHECKLIST: {
      label: 'Comprobación',
      hint: 'El técnico marca Correcto, Incorrecto o No aplica.',
    },
    NUMBER: {
      label: 'Medición',
      hint: 'Un valor con su unidad. Si pones un rango, el parte avisa cuando se sale.',
    },
    TEXT: {
      label: 'Texto corto',
      hint: 'Un dato breve: nº de serie, referencia…',
    },
    TEXTAREA: { label: 'Texto largo', hint: 'Observaciones o explicaciones.' },
    BOOLEAN: { label: 'Sí / No', hint: 'Una pregunta de sí o no.' },
    DATE: { label: 'Fecha', hint: 'Una fecha: próxima revisión, caducidad…' },
    PHOTO: { label: 'Foto', hint: 'El técnico adjunta una o varias fotos.' },
    SIGNATURE: {
      label: 'Firma',
      hint: 'Firma en pantalla del técnico o del cliente.',
    },
  };

// Tipos de equipo que se proponen al escribir (se puede poner cualquier otro).
export const EQUIPMENT_SUGGESTIONS = [
  'Split / Multisplit',
  'Conductos',
  'Cassette',
  'VRF / VRV',
  'Enfriadora',
  'Bomba de calor',
  'Fancoil',
  'Climatizadora (UTA)',
  'Recuperador de calor',
  'Aerotermia',
  'Caldera',
  'Cámara frigorífica',
  'Mueble frigorífico',
  'Extracción / ventilación',
  'Cuadro eléctrico',
  'Grupo electrógeno',
  'Grupo de presión',
  'Protección contra incendios',
];

export const NAME_MAX = 120;
export const CATEGORY_MAX = 60;
export const DESCRIPTION_MAX = 500;
export const LABEL_MAX = 200;
export const SECTION_MAX = 80;
export const UNIT_MAX = 20;
export const HELP_MAX = 300;

// ---------------------------------------------------------------
// Lo que llega de la API
// ---------------------------------------------------------------

export type TemplateItem = {
  id: string;
  label: string;
  type: ItemType;
  required: boolean;
  section: string | null;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  helpText: string | null;
};

export type Template = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  updatedAt: string | null;
  items: TemplateItem[];
};

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Plantillas antiguas pueden tener tipos que ya no se ofrecen.
export function normalizeItemType(value: unknown): ItemType {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if ((ITEM_TYPES as readonly string[]).includes(raw)) return raw as ItemType;
  if (raw === 'LONG_TEXT') return 'TEXTAREA';
  if (raw === 'CHECKBOX') return 'BOOLEAN';
  return 'CHECKLIST';
}

function parseItem(value: unknown, index: number): TemplateItem | null {
  if (!isRecord(value)) return null;
  return {
    id: str(value.id) ?? `item-${index}`,
    label: str(value.label) ?? str(value.title) ?? `Punto ${index + 1}`,
    type: normalizeItemType(value.type ?? value.valueType),
    required: value.required === true,
    section: str(value.section),
    unit: str(value.unit),
    minValue: num(value.minValue),
    maxValue: num(value.maxValue),
    helpText: str(value.helpText),
  };
}

export function parseTemplate(value: unknown): Template | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;

  const rawItems = Array.isArray(value.items) ? value.items : [];

  return {
    id,
    name: str(value.name) ?? str(value.title) ?? 'Plantilla sin nombre',
    category: str(value.category),
    description: str(value.description),
    isActive: value.isActive !== false,
    updatedAt: str(value.updatedAt),
    items: rawItems
      .map((item, index) => parseItem(item, index))
      .filter((item): item is TemplateItem => item !== null),
  };
}

export function countSections(items: TemplateItem[]): number {
  return groupBySection(items).filter((group) => group.name).length;
}

// Agrupa los puntos seguidos que comparten sección, respetando el orden.
export function groupBySection<T extends { section: string | null }>(
  items: T[],
): { name: string; items: T[] }[] {
  const groups: { name: string; items: T[] }[] = [];
  for (const item of items) {
    const name = item.section ?? '';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }
  return groups;
}

export function formatRange(
  minValue: number | null,
  maxValue: number | null,
  unit: string | null,
): string | null {
  const fmt = (n: number) => String(n).replace('.', ',');
  const suffix = unit ? ` ${unit}` : '';
  if (minValue !== null && maxValue !== null)
    return `${fmt(minValue)} – ${fmt(maxValue)}${suffix}`;
  if (minValue !== null) return `mín. ${fmt(minValue)}${suffix}`;
  if (maxValue !== null) return `máx. ${fmt(maxValue)}${suffix}`;
  return null;
}

// ---------------------------------------------------------------
// Lo que edita la empresa (borrador)
// ---------------------------------------------------------------

export type DraftItem = {
  key: string;
  label: string;
  type: ItemType;
  required: boolean;
  unit: string;
  minValue: string;
  maxValue: string;
  helpText: string;
};

export type DraftSection = {
  key: string;
  name: string;
  items: DraftItem[];
};

export type Draft = {
  name: string;
  category: string;
  description: string;
  sections: DraftSection[];
};

let keySeq = 0;
export function newKey(prefix: string): string {
  keySeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${keySeq}`;
}

export function emptyItem(type: ItemType = 'CHECKLIST'): DraftItem {
  return {
    key: newKey('item'),
    label: '',
    type,
    required: false,
    unit: '',
    minValue: '',
    maxValue: '',
    helpText: '',
  };
}

export function emptySection(name = ''): DraftSection {
  return { key: newKey('section'), name, items: [emptyItem()] };
}

export function emptyDraft(): Draft {
  return {
    name: '',
    category: '',
    description: '',
    sections: [emptySection()],
  };
}

const numberToField = (n: number | null) =>
  n === null ? '' : String(n).replace('.', ',');

export function templateToDraft(template: Template): Draft {
  const groups = groupBySection(template.items);
  return {
    name: template.name,
    category: template.category ?? '',
    description: template.description ?? '',
    sections:
      groups.length > 0
        ? groups.map((group) => ({
            key: newKey('section'),
            name: group.name,
            items: group.items.map((item) => ({
              key: newKey('item'),
              label: item.label,
              type: item.type,
              required: item.required,
              unit: item.unit ?? '',
              minValue: numberToField(item.minValue),
              maxValue: numberToField(item.maxValue),
              helpText: item.helpText ?? '',
            })),
          }))
        : [emptySection()],
  };
}

// "1,5" o "1.5" → 1.5 · "" → null · texto no numérico → NaN (error)
export function parseDecimal(value: string): number | null {
  const clean = value.trim().replace(/\s/g, '').replace(',', '.');
  if (clean === '') return null;
  return /^-?\d+(\.\d+)?$/.test(clean) ? Number(clean) : Number.NaN;
}

export type TemplatePayload = {
  name: string;
  category: string | null;
  description: string | null;
  items: {
    label: string;
    section: string | null;
    type: ItemType;
    required: boolean;
    unit: string | null;
    minValue: number | null;
    maxValue: number | null;
    helpText: string | null;
  }[];
};

/**
 * Comprueba el borrador y lo convierte en lo que espera la API.
 * Devuelve la lista de problemas (en el idioma de la empresa) si los hay.
 */
export function draftToPayload(
  draft: Draft,
): { ok: true; payload: TemplatePayload } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  const name = draft.name.trim();

  if (!name) problems.push('Ponle un nombre a la plantilla.');
  if (name.length > NAME_MAX)
    problems.push(`El nombre no puede superar ${NAME_MAX} caracteres.`);

  const items: TemplatePayload['items'] = [];
  let position = 0;

  for (const section of draft.sections) {
    const sectionName = section.name.trim();
    for (const item of section.items) {
      position += 1;
      const label = item.label.trim();
      const where = label ? `«${label}»` : `el punto ${position}`;

      if (!label) problems.push(`Al punto ${position} le falta el nombre.`);

      const isMeasurement = item.type === 'NUMBER';
      const minValue = isMeasurement ? parseDecimal(item.minValue) : null;
      const maxValue = isMeasurement ? parseDecimal(item.maxValue) : null;

      if (Number.isNaN(minValue))
        problems.push(`En ${where} el mínimo no es un número.`);
      if (Number.isNaN(maxValue))
        problems.push(`En ${where} el máximo no es un número.`);
      if (
        minValue !== null &&
        maxValue !== null &&
        !Number.isNaN(minValue) &&
        !Number.isNaN(maxValue) &&
        minValue > maxValue
      ) {
        problems.push(`En ${where} el mínimo es mayor que el máximo.`);
      }

      items.push({
        label,
        section: sectionName || null,
        type: item.type,
        required: item.required,
        unit: isMeasurement ? item.unit.trim() || null : null,
        minValue,
        maxValue,
        helpText: item.helpText.trim() || null,
      });
    }
  }

  if (items.length === 0)
    problems.push('Añade al menos un punto a la plantilla.');

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    payload: {
      name,
      category: draft.category.trim() || null,
      description: draft.description.trim() || null,
      items,
    },
  };
}

// La API devuelve "message" como texto o como lista. Los errores de un punto
// llegan como "items.3.Cada punto necesita un nombre." → "Punto 4: …".
export function apiMessages(json: unknown, fallback: string): string[] {
  if (isRecord(json)) {
    const message = json.message;
    const list = Array.isArray(message)
      ? message.filter((m): m is string => typeof m === 'string')
      : typeof message === 'string' && message.trim()
        ? [message]
        : [];
    if (list.length > 0) {
      return list.map((m) => {
        const match = /^items\.(\d+)\.(.+)$/.exec(m);
        return match ? `Punto ${Number(match[1]) + 1}: ${match[2]}` : m;
      });
    }
  }
  return [fallback];
}