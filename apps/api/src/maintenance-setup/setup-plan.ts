import {
  GENERATE_FLOORS_MAX,
  LEVEL_MAX,
  LEVEL_MIN,
  NAME_MAX,
  ROOMS_PER_FLOOR_MAX,
  compareNames,
  defaultFloorName,
  roomNumber,
  spaceLabel,
  type SpaceKindValue,
} from '../building/building-plan';

/**
 * Reglas del asistente de mantenimiento que no dependen de la base de
 * datos: qué plantas, habitaciones, zonas y máquinas faltan en un hotel
 * para dejarlo como pide el asistente. Se puede repetir sin duplicar: lo
 * que ya existe se respeta y solo se añade lo que falta.
 */

export const MACHINES_PER_ROOM_MAX = 4;
export const MACHINES_PER_ZONE_MAX = 50;
export const ZONES_MAX = 100;
export const MACHINE_TYPES_MAX = 20;

export type SetupInput = {
  building?: {
    firstNumber?: number;
    floors: { level: number; rooms: number }[];
  } | null;
  zones?: { name: string; level: number; floorName?: string | null }[];
  machines?: {
    category: string;
    perRoom?: number;
    brand?: string | null;
    model?: string | null;
    zones?: { name: string; level: number; quantity: number }[];
  }[];
};

// Lo que ya hay en el hotel.
export type SiteSnapshot = {
  floors: { level: number; name: string }[];
  spaces: { level: number; kind: SpaceKindValue; name: string }[];
  assets: {
    // Dónde está (null si no está en ninguna habitación o zona).
    place: { level: number; name: string } | null;
    name: string;
    category: string | null;
    // Activo o en mantenimiento: entra en las rondas.
    active: boolean;
  }[];
};

export type PlannedAsset = {
  level: number;
  floorName: string;
  kind: SpaceKindValue;
  spaceName: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
};

export type SetupPlan = {
  floors: { level: number; name: string }[];
  rooms: { level: number; name: string }[];
  zones: { level: number; name: string }[];
  assets: PlannedAsset[];
  // Por cada máquina pedida: cuántas había en el hotel y cuántas se añaden.
  machines: { category: string; existing: number; adding: number }[];
  // Cómo queda el hotel.
  totals: { floors: number; rooms: number; zones: number };
};

type Result = { ok: true; plan: SetupPlan } | { ok: false; problem: string };

/** Para comparar nombres y tipos sin mayúsculas ni espacios de más. */
export function keyOf(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

function placeKey(level: number, name: string): string {
  return `${level}|${keyOf(name)}`;
}

/**
 * Nombres de las máquinas que faltan en una habitación o zona.
 * Una sola: "Fancoil · Hab. 101". Varias: "Fancoil 1 · Hab. 101",
 * "Fancoil 2 · Hab. 101"… Si ya había una sin número, la nueva es la 2.
 * "taken" son los nombres que ya hay en ese sitio; se van añadiendo.
 */
export function machineNames(
  category: string,
  place: string,
  target: number,
  existing: number,
  taken: Set<string>,
): string[] {
  const missing = target - existing;
  const names: string[] = [];
  if (missing <= 0) return names;

  const tryAdd = (name: string) => {
    const key = keyOf(name);
    if (taken.has(key)) return false;
    taken.add(key);
    names.push(name);
    return true;
  };

  if (target === 1 && existing === 0 && tryAdd(`${category} · ${place}`)) return names;

  let n = target > 1 && existing === 0 ? 1 : Math.max(2, existing + 1);
  while (names.length < missing && n < 1000) {
    tryAdd(`${category} ${n} · ${place}`);
    n += 1;
  }
  return names;
}

function checkBuilding(building: NonNullable<SetupInput['building']>): string | null {
  const firstNumber = building.firstNumber ?? 1;
  const floors = building.floors;

  if (!Number.isInteger(firstNumber) || firstNumber < 1) {
    return 'La numeración de las habitaciones empieza en 1 o más.';
  }
  if (floors.length === 0) return 'Pon al menos una planta con habitaciones.';
  if (floors.length > GENERATE_FLOORS_MAX) {
    return `Como mucho se preparan ${GENERATE_FLOORS_MAX} plantas de una vez.`;
  }

  const seen = new Set<number>();
  for (const floor of floors) {
    if (!Number.isInteger(floor.level) || !Number.isInteger(floor.rooms)) {
      return 'Las plantas y habitaciones tienen que ser números enteros.';
    }
    if (floor.level < 1 || floor.level > LEVEL_MAX) {
      return `Las habitaciones van de la planta 1 a la ${LEVEL_MAX}. La planta baja y los sótanos se ponen como zonas comunes.`;
    }
    if (seen.has(floor.level)) return `La planta ${floor.level} está repetida.`;
    seen.add(floor.level);
    if (floor.rooms < 1 || floor.rooms > ROOMS_PER_FLOOR_MAX) {
      return `En la planta ${floor.level} pon entre 1 y ${ROOMS_PER_FLOOR_MAX} habitaciones.`;
    }
    if (firstNumber + floor.rooms - 1 > ROOMS_PER_FLOOR_MAX) {
      return `En la planta ${floor.level} las habitaciones pasarían del ${roomNumber(floor.level, ROOMS_PER_FLOOR_MAX)}. Empieza la numeración más abajo o pon menos habitaciones.`;
    }
  }
  return null;
}

/**
 * Calcula lo que hay que crear. Si algo no cuadra, devuelve el motivo en
 * español y no planea nada.
 */
export function planSetup(input: SetupInput, site: SiteSnapshot): Result {
  const floorNames = new Map<number, string>(site.floors.map((f) => [f.level, f.name]));
  // Habitaciones y zonas por planta y nombre.
  const places = new Map<string, { level: number; kind: SpaceKindValue; name: string }>();
  for (const space of site.spaces) places.set(placeKey(space.level, space.name), space);
  // Un número de habitación no se repite en todo el hotel.
  const roomNames = new Set(site.spaces.filter((s) => s.kind === 'ROOM').map((s) => keyOf(s.name)));

  const newFloors: SetupPlan['floors'] = [];
  const newRooms: SetupPlan['rooms'] = [];
  const newZones: SetupPlan['zones'] = [];

  const ensureFloor = (level: number, name?: string | null) => {
    if (floorNames.has(level)) return;
    const floorName = name?.trim() || defaultFloorName(level);
    floorNames.set(level, floorName);
    newFloors.push({ level, name: floorName });
  };

  // ---- Plantas y habitaciones ----
  if (input.building) {
    const problem = checkBuilding(input.building);
    if (problem) return { ok: false, problem };
    const firstNumber = input.building.firstNumber ?? 1;

    const floors = [...input.building.floors].sort((a, b) => a.level - b.level);
    for (const floor of floors) {
      ensureFloor(floor.level);
      for (let i = 0; i < floor.rooms; i += 1) {
        const name = roomNumber(floor.level, firstNumber + i);
        if (roomNames.has(keyOf(name))) continue;
        const other = places.get(placeKey(floor.level, name));
        if (other) {
          return {
            ok: false,
            problem: `En ${floorNames.get(floor.level)} ya hay una zona que se llama «${other.name}».`,
          };
        }
        roomNames.add(keyOf(name));
        places.set(placeKey(floor.level, name), { level: floor.level, kind: 'ROOM', name });
        newRooms.push({ level: floor.level, name });
      }
    }
  }

  // ---- Zonas comunes ----
  const zones = input.zones ?? [];
  if (zones.length > ZONES_MAX) {
    return { ok: false, problem: `Como mucho ${ZONES_MAX} zonas comunes de una vez.` };
  }
  for (const zone of zones) {
    const name = zone.name.trim().replace(/\s+/g, ' ');
    if (!name) return { ok: false, problem: 'Cada zona común necesita un nombre.' };
    if (name.length > NAME_MAX) {
      return {
        ok: false,
        problem: `El nombre de una zona no puede superar ${NAME_MAX} caracteres.`,
      };
    }
    if (!Number.isInteger(zone.level) || zone.level < LEVEL_MIN || zone.level > LEVEL_MAX) {
      return {
        ok: false,
        problem: `La planta de «${name}» tiene que estar entre la ${LEVEL_MIN} y la ${LEVEL_MAX}.`,
      };
    }
    ensureFloor(zone.level, zone.floorName);
    const existing = places.get(placeKey(zone.level, name));
    if (existing) {
      if (existing.kind === 'ROOM') {
        return {
          ok: false,
          problem: `En ${floorNames.get(zone.level)} ya hay una habitación ${existing.name}. Ponle otro nombre a la zona.`,
        };
      }
      continue;
    }
    places.set(placeKey(zone.level, name), { level: zone.level, kind: 'COMMON', name });
    newZones.push({ level: zone.level, name });
  }

  // ---- Máquinas ----
  const machines = input.machines ?? [];
  if (machines.length > MACHINE_TYPES_MAX) {
    return { ok: false, problem: `Como mucho ${MACHINE_TYPES_MAX} tipos de máquina de una vez.` };
  }

  // Lo que ya hay en cada habitación o zona.
  const takenNames = new Map<string, Set<string>>();
  const activeCounts = new Map<string, Map<string, number>>();
  const siteCounts = new Map<string, number>();
  for (const asset of site.assets) {
    const category = asset.category ? keyOf(asset.category) : '';
    if (asset.active && category) {
      siteCounts.set(category, (siteCounts.get(category) ?? 0) + 1);
    }
    if (!asset.place) continue;
    const key = placeKey(asset.place.level, asset.place.name);
    if (!takenNames.has(key)) takenNames.set(key, new Set());
    takenNames.get(key)!.add(keyOf(asset.name));
    if (asset.active && category) {
      if (!activeCounts.has(key)) activeCounts.set(key, new Map());
      const counts = activeCounts.get(key)!;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  const rooms = [...places.values()]
    .filter((p) => p.kind === 'ROOM')
    .sort((a, b) => a.level - b.level || compareNames(a.name, b.name));

  const assets: PlannedAsset[] = [];
  const summary: SetupPlan['machines'] = [];
  const seenCategories = new Set<string>();

  for (const machine of machines) {
    const category = machine.category.trim().replace(/\s+/g, ' ');
    if (!category) return { ok: false, problem: 'Cada máquina necesita un tipo.' };
    if (category.length > NAME_MAX) {
      return { ok: false, problem: `El tipo de máquina no puede superar ${NAME_MAX} caracteres.` };
    }
    const categoryKey = keyOf(category);
    if (seenCategories.has(categoryKey)) {
      return {
        ok: false,
        problem: `«${category}» está dos veces. Junta sus máquinas en una sola.`,
      };
    }
    seenCategories.add(categoryKey);

    const perRoom = machine.perRoom ?? 0;
    if (!Number.isInteger(perRoom) || perRoom < 0 || perRoom > MACHINES_PER_ROOM_MAX) {
      return {
        ok: false,
        problem: `${category}: pon de 0 a ${MACHINES_PER_ROOM_MAX} máquinas por habitación.`,
      };
    }
    if (perRoom > 0 && rooms.length === 0) {
      return {
        ok: false,
        problem: `${category}: el hotel todavía no tiene habitaciones. Ponlas en el paso Edificio.`,
      };
    }

    const brand = machine.brand?.trim() || null;
    const model = machine.model?.trim() || null;
    let adding = 0;

    const addTo = (
      place: { level: number; kind: SpaceKindValue; name: string },
      target: number,
    ) => {
      const key = placeKey(place.level, place.name);
      const existing = activeCounts.get(key)?.get(categoryKey) ?? 0;
      if (!takenNames.has(key)) takenNames.set(key, new Set());
      const label = spaceLabel(place.kind, place.name);
      for (const name of machineNames(category, label, target, existing, takenNames.get(key)!)) {
        assets.push({
          level: place.level,
          floorName: floorNames.get(place.level) ?? defaultFloorName(place.level),
          kind: place.kind,
          spaceName: place.name,
          name,
          category,
          brand,
          model,
        });
        adding += 1;
      }
    };

    if (perRoom > 0) for (const room of rooms) addTo(room, perRoom);

    const seenZones = new Set<string>();
    for (const ref of machine.zones ?? []) {
      const zoneName = ref.name.trim().replace(/\s+/g, ' ');
      if (
        !Number.isInteger(ref.quantity) ||
        ref.quantity < 1 ||
        ref.quantity > MACHINES_PER_ZONE_MAX
      ) {
        return {
          ok: false,
          problem: `${category} en «${zoneName}»: pon de 1 a ${MACHINES_PER_ZONE_MAX} máquinas.`,
        };
      }
      const key = placeKey(ref.level, zoneName);
      if (seenZones.has(key)) {
        return { ok: false, problem: `${category}: «${zoneName}» está repetida.` };
      }
      seenZones.add(key);
      const zone = places.get(key);
      if (!zone || zone.kind !== 'COMMON') {
        return {
          ok: false,
          problem: `${category}: la zona «${zoneName}» no está en el hotel. Añádela en el paso Edificio.`,
        };
      }
      addTo(zone, ref.quantity);
    }

    summary.push({ category, existing: siteCounts.get(categoryKey) ?? 0, adding });
  }

  const totalRooms = [...places.values()].filter((p) => p.kind === 'ROOM').length;

  return {
    ok: true,
    plan: {
      floors: newFloors,
      rooms: newRooms,
      zones: newZones,
      assets,
      machines: summary,
      totals: {
        floors: floorNames.size,
        rooms: totalRooms,
        zones: places.size - totalRooms,
      },
    },
  };
}