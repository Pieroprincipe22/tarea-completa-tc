/**
 * Reglas del edificio que no dependen de la base de datos: numeración de
 * habitaciones, nombres de planta y cómo se nombra o se describe dónde
 * está un equipo. Las usa el servicio y se prueban por separado.
 */

export const LEVEL_MIN = -10;
export const LEVEL_MAX = 200;
export const GENERATE_FLOORS_MAX = 100;
export const ROOMS_PER_FLOOR_MAX = 99;
export const NAME_MAX = 60;

// Planta 1, habitación 4 → "104" · Planta 11, habitación 15 → "1115".
export function roomNumber(level: number, position: number): string {
  return `${level}${String(position).padStart(2, '0')}`;
}

export function defaultFloorName(level: number): string {
  if (level === 0) return 'Planta baja';
  if (level < 0) return `Sótano ${level}`;
  return `Planta ${level}`;
}

export type GenerationInput = {
  fromLevel: number;
  toLevel: number;
  roomsPerFloor: number;
  firstNumber?: number;
};

export type PlannedFloor = {
  level: number;
  name: string;
  rooms: string[];
};

export type GenerationPlan = {
  floors: PlannedFloor[];
  totalRooms: number;
};

/**
 * Comprueba los datos del generador y devuelve las plantas y habitaciones
 * que salen. Si algo no cuadra, devuelve el motivo en español.
 */
export function planGeneration(
  input: GenerationInput,
): { ok: true; plan: GenerationPlan } | { ok: false; problem: string } {
  const { fromLevel, toLevel, roomsPerFloor } = input;
  const firstNumber = input.firstNumber ?? 1;

  const ints = [fromLevel, toLevel, roomsPerFloor, firstNumber];
  if (ints.some((n) => !Number.isInteger(n))) {
    return { ok: false, problem: 'Las plantas y habitaciones tienen que ser números enteros.' };
  }
  if (fromLevel < 1) {
    return {
      ok: false,
      problem:
        'Las habitaciones se generan desde la planta 1. La planta baja y los sótanos se añaden a mano.',
    };
  }
  if (toLevel < fromLevel) {
    return { ok: false, problem: 'La última planta no puede ser menor que la primera.' };
  }
  if (toLevel > LEVEL_MAX) {
    return { ok: false, problem: `La planta más alta posible es la ${LEVEL_MAX}.` };
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
  if (firstNumber < 1 || firstNumber + roomsPerFloor - 1 > ROOMS_PER_FLOOR_MAX) {
    return {
      ok: false,
      problem: `La numeración de cada planta tiene que ir del 01 al ${ROOMS_PER_FLOOR_MAX}.`,
    };
  }

  const floors: PlannedFloor[] = [];
  for (let level = fromLevel; level <= toLevel; level += 1) {
    const rooms: string[] = [];
    for (let i = 0; i < roomsPerFloor; i += 1) {
      rooms.push(roomNumber(level, firstNumber + i));
    }
    floors.push({ level, name: defaultFloorName(level), rooms });
  }

  return {
    ok: true,
    plan: { floors, totalRooms: floors.length * roomsPerFloor },
  };
}

export type SpaceKindValue = 'ROOM' | 'COMMON';

// "Hab. 204" para una habitación; el nombre tal cual para una zona común.
export function spaceLabel(kind: SpaceKindValue, name: string): string {
  return kind === 'ROOM' ? `Hab. ${name}` : name;
}

// Lo que se guarda en la ubicación del equipo: "Planta 2 · Hab. 204".
// Si la zona se llama como su planta ("Cubierta"), no se repite.
export function assetLocation(floorName: string, kind: SpaceKindValue, spaceName: string): string {
  const label = spaceLabel(kind, spaceName);
  const same = floorName.trim().toLocaleLowerCase('es') === label.trim().toLocaleLowerCase('es');
  return same ? label : `${floorName} · ${label}`;
}

// Nombre de un equipo creado por el generador: "Fancoil · Hab. 204".
export function generatedAssetName(category: string, room: string): string {
  return `${category} · ${spaceLabel('ROOM', room)}`;
}

// Ordena "2", "10", "101" como números y lo demás alfabéticamente.
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
}