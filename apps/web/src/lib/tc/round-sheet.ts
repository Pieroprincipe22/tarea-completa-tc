import {
  PARTS_MAX,
  type PartLine,
  type StopDetail,
  type StopItem,
  type StopStatus,
} from '@/lib/tc/rounds';
import type { OptionResult } from '@/lib/tc/templates';

/**
 * Rellenar la hoja de un equipo de la ronda: lo que va marcando el técnico
 * y lo que se manda a la API (PATCH /rounds/:id/stops/:stopId). Sigue las
 * mismas reglas que apps/api/src/rounds/round-plan.ts.
 */

export type ItemStatus = 'PENDING' | 'OK' | 'FAIL' | 'NA';

export type ItemDraft = {
  status: ItemStatus;
  value: string;
  notes: string;
};

export type PartDraft = {
  key: string;
  name: string;
  quantity: string;
  unit: string;
};

export type StopDraft = {
  status: StopStatus;
  noAccessReason: string;
  urgent: boolean;
  items: Record<string, ItemDraft>;
  parts: PartDraft[];
};

export const NO_ACCESS_REASON_MAX = 200;
export const ITEM_VALUE_MAX = 2000;
export const PART_NAME_MAX = 120;
export const PART_UNIT_MAX = 20;

// Los motivos que más se repiten en un hotel; se puede escribir otro.
export const NO_ACCESS_PRESETS = [
  'Habitación ocupada',
  'No molestar',
  'Cliente no deja pasar',
  'Sin llave',
  'Habitación bloqueada',
];

// Recambios habituales de climatización (se puede escribir cualquier otro).
export const PART_SUGGESTIONS = [
  'Filtro',
  'Motor ventilador',
  'Condensador de arranque',
  'Válvula de 3 vías',
  'Actuador de válvula',
  'Termostato',
  'Sonda de temperatura',
  'Bomba de condensados',
  'Bandeja de condensados',
  'Tubo de desagüe',
  'Placa electrónica',
  'Turbina',
];

// Puntos que no se rellenan en la hoja: van aparte (fotos y firmas).
const NOT_IN_SHEET = new Set(['PHOTO', 'SIGNATURE']);

export function isSheetItem(item: { type: string | null }): boolean {
  return !NOT_IN_SHEET.has(item.type ?? '');
}

export function choiceStatus(result: OptionResult): ItemStatus {
  if (result === 'ISSUE') return 'FAIL';
  if (result === 'NA') return 'NA';
  return 'OK';
}

/** "21,5" o "21.5" → 21.5. null si no es un número. */
export function parseNumber(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

export function outOfRange(
  value: number,
  item: { minValue: number | null; maxValue: number | null },
): boolean {
  return (
    (item.minValue !== null && value < item.minValue) ||
    (item.maxValue !== null && value > item.maxValue)
  );
}

/**
 * Cómo queda un punto según lo que se escribe: una medición fuera de rango
 * sale como incidencia; un texto vacío, sin rellenar.
 */
export function statusForValue(item: StopItem, value: string): ItemStatus {
  if (!value.trim()) return 'PENDING';
  if (item.type === 'NUMBER') {
    const number = parseNumber(value);
    if (number === null) return 'PENDING';
    return outOfRange(number, item) ? 'FAIL' : 'OK';
  }
  return 'OK';
}

function newKey(): string {
  return `part-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyPart(): PartDraft {
  return { key: newKey(), name: '', quantity: '1', unit: '' };
}

function quantityText(quantity: number): string {
  return String(quantity).replace('.', ',');
}

export function draftFromDetail(detail: StopDetail): StopDraft {
  const items: Record<string, ItemDraft> = {};
  for (const item of detail.items) {
    items[item.id] = {
      status: (['OK', 'FAIL', 'NA'] as const).includes(
        item.status as 'OK' | 'FAIL' | 'NA',
      )
        ? (item.status as ItemStatus)
        : 'PENDING',
      value:
        item.type === 'NUMBER' && item.value
          ? item.value.replace('.', ',')
          : (item.value ?? ''),
      notes: item.notes ?? '',
    };
  }
  return {
    // Una habitación sin hacer se abre para darla por hecha.
    status: detail.status === 'PENDING' ? 'DONE' : detail.status,
    noAccessReason: detail.noAccessReason ?? '',
    urgent: detail.urgent,
    items,
    parts: detail.parts.map((part: PartLine) => ({
      key: newKey(),
      name: part.name,
      quantity: quantityText(part.quantity),
      unit: part.unit ?? '',
    })),
  };
}

/** Los obligatorios que faltan para darla por hecha. */
export function missingItems(items: StopItem[], draft: StopDraft): StopItem[] {
  return items.filter(
    (item) =>
      item.required &&
      isSheetItem(item) &&
      (draft.items[item.id]?.status ?? 'PENDING') === 'PENDING',
  );
}

export function badNumbers(items: StopItem[], draft: StopDraft): StopItem[] {
  return items.filter((item) => {
    if (item.type !== 'NUMBER') return false;
    const value = draft.items[item.id]?.value.trim() ?? '';
    return value !== '' && parseNumber(value) === null;
  });
}

function findTemperature(
  items: StopItem[],
  word: RegExp,
): StopItem | undefined {
  return items.find(
    (item) =>
      item.type === 'NUMBER' &&
      /temperatura/i.test(item.label) &&
      word.test(item.label),
  );
}

/**
 * Salto térmico: impulsión menos retorno, si la hoja tiene las dos
 * temperaturas y están rellenas.
 */
export function thermalJump(
  items: StopItem[],
  draft: StopDraft,
): number | null {
  const supply = findTemperature(items, /impulsi[oó]n/i);
  const back = findTemperature(items, /retorno/i);
  if (!supply || !back) return null;
  const a = parseNumber(draft.items[supply.id]?.value ?? '');
  const b = parseNumber(draft.items[back.id]?.value ?? '');
  if (a === null || b === null) return null;
  return Math.round(Math.abs(b - a) * 10) / 10;
}

export type PartsCheck =
  | {
      ok: true;
      parts: { name: string; quantity: number; unit: string | null }[];
    }
  | { ok: false; error: string };

export function cleanParts(parts: PartDraft[]): PartsCheck {
  const clean: { name: string; quantity: number; unit: string | null }[] = [];
  for (const part of parts) {
    const name = part.name.trim();
    if (!name) continue;
    const quantity = parseNumber(part.quantity || '1');
    if (quantity === null || quantity <= 0 || quantity > 10000) {
      return { ok: false, error: `Pon cuántos «${name}» hacen falta.` };
    }
    clean.push({ name, quantity, unit: part.unit.trim() || null });
  }
  if (clean.length > PARTS_MAX) {
    return {
      ok: false,
      error: `Como mucho ${PARTS_MAX} recambios por equipo.`,
    };
  }
  return { ok: true, parts: clean };
}

export type SaveBody = {
  status: StopStatus;
  noAccessReason?: string;
  urgent?: boolean;
  items?: {
    id: string;
    status: ItemStatus;
    value: string | null;
    notes: string | null;
  }[];
  parts?: { name: string; quantity: number; unit: string | null }[];
  savedAt: string;
};

export type BuildResult =
  | { ok: true; body: SaveBody }
  | { ok: false; error: string };

/** Lo que se manda a la API, o qué falta por poner. */
export function buildSaveBody(
  items: StopItem[],
  draft: StopDraft,
  now: Date = new Date(),
): BuildResult {
  const savedAt = now.toISOString();

  if (draft.status === 'NO_ACCESS') {
    const reason = draft.noAccessReason.trim();
    if (!reason) return { ok: false, error: 'Pon por qué no se pudo entrar.' };
    return {
      ok: true,
      body: { status: 'NO_ACCESS', noAccessReason: reason, savedAt },
    };
  }

  const wrong = badNumbers(items, draft);
  if (wrong.length > 0) {
    return { ok: false, error: `«${wrong[0].label}» tiene que ser un número.` };
  }
  if (draft.status === 'DONE') {
    const missing = missingItems(items, draft);
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Falta rellenar: ${missing.map((item) => item.label).join(', ')}.`,
      };
    }
  }
  const parts = cleanParts(draft.parts);
  if (!parts.ok) return parts;

  return {
    ok: true,
    body: {
      status: draft.status,
      urgent: draft.status === 'DONE' ? draft.urgent : false,
      items: items.filter(isSheetItem).map((item) => {
        const entry = draft.items[item.id] ?? {
          status: 'PENDING',
          value: '',
          notes: '',
        };
        const value = entry.value.trim();
        return {
          id: item.id,
          status: entry.status,
          value: value ? value.slice(0, ITEM_VALUE_MAX) : null,
          notes: entry.notes.trim()
            ? entry.notes.trim().slice(0, ITEM_VALUE_MAX)
            : null,
        };
      }),
      parts: parts.parts,
      savedAt,
    },
  };
}