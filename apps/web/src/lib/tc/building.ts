import { isRecord } from '@/lib/tc/api';

/**
 * Estructura del edificio de un sitio: plantas, habitaciones, zonas
 * comunes y sus equipos. La numeración y la vista previa del generador
 * siguen las mismas reglas que la API (apps/api/src/building/building-plan.ts).
 */

export type SpaceKind = 'ROOM' | 'COMMON';

export type AssetBrief = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  status: string | null;
};

export type SpaceView = {
  id: string;
  kind: SpaceKind;
  name: string;
  label: string;
  category: string | null;
  notes: string | null;
  assets: AssetBrief[];
};

export type FloorView = {
  id: string;
  level: number;
  name: string;
  spaces: SpaceView[];
};

export type Building = {
  site: { id: string; name: string; customerName: string | null };
  floors: FloorView[];
  unplacedAssets: AssetBrief[];
  totals: {
    floors: number;
    rooms: number;
    commons: number;
    placedAssets: number;
    unplacedAssets: number;
  };
};

export const NAME_MAX = 60;
export const LEVEL_MIN = -10;
export const LEVEL_MAX = 200;
export const GENERATE_FLOORS_MAX = 100;
export const ROOMS_PER_FLOOR_MAX = 99;

// Tipos de zona común que se proponen (se puede escribir cualquier otro).
export const ZONE_SUGGESTIONS = [
  'Recepción',
  'Comedor',
  'Cocina',
  'Cafetería / bar',
  'Lavandería',
  'Oficinas',
  'Despacho',
  'Sala de reuniones',
  'Office de planta',
  'Cuarto de mantenimiento',
  'Sala de máquinas',
  'Cuarto de rack',
  'Cuarto eléctrico',
  'Ascensor',
  'Gimnasio',
  'Spa / piscina',
  'Vestuarios',
  'Almacén',
  'Pasillo',
  'Parking',
  'Cubierta',
];

// ---------------------------------------------------------------
// Numeración (igual que en la API)
// ---------------------------------------------------------------

export function roomNumber(level: number, position: number): string {
  return `${level}${String(position).padStart(2, '0')}`;
}

export function defaultFloorName(level: number): string {
  if (level === 0) return 'Planta baja';
  if (level < 0) return `Sótano ${level}`;
  return `Planta ${level}`;
}

export function spaceLabel(kind: SpaceKind, name: string): string {
  return kind === 'ROOM' ? `Hab. ${name}` : name;
}

export type GenerationPreview = {
  floors: number;
  rooms: number;
  firstRoom: string;
  lastRoom: string;
  floorNames: string[];
};

/**
 * Lo mismo que comprobará la API, para enseñar la vista previa (o el
 * problema) mientras se escribe.
 */
export function previewGeneration(input: {
  fromLevel: number;
  toLevel: number;
  roomsPerFloor: number;
  firstNumber: number;
}): { ok: true; preview: GenerationPreview } | { ok: false; problem: string } {
  const { fromLevel, toLevel, roomsPerFloor, firstNumber } = input;

  if (
    [fromLevel, toLevel, roomsPerFloor, firstNumber].some(
      (n) => !Number.isInteger(n),
    )
  ) {
    return {
      ok: false,
      problem: 'Las plantas y habitaciones tienen que ser números enteros.',
    };
  }
  if (fromLevel < 1) {
    return {
      ok: false,
      problem:
        'Las habitaciones se generan desde la planta 1. La planta baja y los sótanos se añaden a mano.',
    };
  }
  if (toLevel < fromLevel) {
    return {
      ok: false,
      problem: 'La última planta no puede ser menor que la primera.',
    };
  }
  if (toLevel > LEVEL_MAX) {
    return {
      ok: false,
      problem: `La planta más alta posible es la ${LEVEL_MAX}.`,
    };
  }
  if (toLevel - fromLevel + 1 > GENERATE_FLOORS_MAX) {
    return {
      ok: false,
      problem: `Como mucho se generan ${GENERATE_FLOORS_MAX} plantas de una vez.`,
    };
  }
  if (roomsPerFloor < 1 || roomsPerFloor > ROOMS_PER_FLOOR_MAX) {
    return {
      ok: false,
      problem: `Pon entre 1 y ${ROOMS_PER_FLOOR_MAX} habitaciones por planta.`,
    };
  }
  if (
    firstNumber < 1 ||
    firstNumber + roomsPerFloor - 1 > ROOMS_PER_FLOOR_MAX
  ) {
    return {
      ok: false,
      problem: `La numeración de cada planta tiene que ir del 01 al ${ROOMS_PER_FLOOR_MAX}.`,
    };
  }

  const floors = toLevel - fromLevel + 1;
  const floorNames: string[] = [];
  for (let level = fromLevel; level <= toLevel; level += 1) {
    floorNames.push(defaultFloorName(level));
  }

  return {
    ok: true,
    preview: {
      floors,
      rooms: floors * roomsPerFloor,
      firstRoom: roomNumber(fromLevel, firstNumber),
      lastRoom: roomNumber(toLevel, firstNumber + roomsPerFloor - 1),
      floorNames,
    },
  };
}

// ---------------------------------------------------------------
// Lo que llega de la API
// ---------------------------------------------------------------

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseAsset(value: unknown): AssetBrief | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  return {
    id,
    name: str(value.name) ?? 'Equipo sin nombre',
    category: str(value.category),
    brand: str(value.brand),
    model: str(value.model),
    status: str(value.status),
  };
}

function parseAssets(value: unknown): AssetBrief[] {
  return Array.isArray(value)
    ? value.map(parseAsset).filter((a): a is AssetBrief => a !== null)
    : [];
}

function parseSpace(value: unknown): SpaceView | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const name = str(value.name);
  if (!id || !name) return null;
  const kind: SpaceKind = value.kind === 'COMMON' ? 'COMMON' : 'ROOM';
  return {
    id,
    kind,
    name,
    label: str(value.label) ?? spaceLabel(kind, name),
    category: str(value.category),
    notes: str(value.notes),
    assets: parseAssets(value.assets),
  };
}

function parseFloor(value: unknown): FloorView | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  const level = num(value.level);
  return {
    id,
    level,
    name: str(value.name) ?? defaultFloorName(level),
    spaces: Array.isArray(value.spaces)
      ? value.spaces.map(parseSpace).filter((s): s is SpaceView => s !== null)
      : [],
  };
}

export function parseBuilding(value: unknown): Building | null {
  if (!isRecord(value) || !isRecord(value.site)) return null;
  const siteId = str(value.site.id);
  if (!siteId) return null;
  const customer = isRecord(value.site.customer) ? value.site.customer : null;
  const totals = isRecord(value.totals) ? value.totals : {};

  return {
    site: {
      id: siteId,
      name: str(value.site.name) ?? 'Sitio',
      customerName: customer ? str(customer.name) : null,
    },
    floors: Array.isArray(value.floors)
      ? value.floors.map(parseFloor).filter((f): f is FloorView => f !== null)
      : [],
    unplacedAssets: parseAssets(value.unplacedAssets),
    totals: {
      floors: num(totals.floors),
      rooms: num(totals.rooms),
      commons: num(totals.commons),
      placedAssets: num(totals.placedAssets),
      unplacedAssets: num(totals.unplacedAssets),
    },
  };
}

// "Planta 3 · 15 habitaciones · 2 zonas · 17 equipos"
export function floorSummary(floor: FloorView): string {
  const rooms = floor.spaces.filter((s) => s.kind === 'ROOM').length;
  const zones = floor.spaces.length - rooms;
  const assets = floor.spaces.reduce((sum, s) => sum + s.assets.length, 0);
  const parts: string[] = [];
  if (rooms > 0) parts.push(`${rooms} habitaci${rooms === 1 ? 'ón' : 'ones'}`);
  if (zones > 0) parts.push(`${zones} zona${zones === 1 ? '' : 's'}`);
  parts.push(`${assets} equipo${assets === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

// La planta libre más alta + 1, para proponer "Cubierta".
export function nextFreeLevel(floors: FloorView[], from = 0): number {
  const used = new Set(floors.map((f) => f.level));
  let level = from;
  while (used.has(level)) level += 1;
  return level;
}

// La API devuelve "message" como texto o como lista de textos.
export function apiError(json: unknown, fallback: string): string {
  if (isRecord(json)) {
    const message = json.message;
    if (Array.isArray(message)) {
      const list = message.filter((m): m is string => typeof m === 'string');
      if (list.length > 0) return list.join(' ');
    }
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}