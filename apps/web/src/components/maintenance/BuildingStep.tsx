'use client';

import { useState } from 'react';
import { Card, Chip, Counter } from '@/components/maintenance/WizardUi';
import { newKey } from '@/lib/tc/templates';
import {
  LEVEL_MIN,
  ROOF_ZONE,
  ROOMS_PER_FLOOR_MAX,
  ZONE_NAME_MAX,
  floorNameFor,
  hotelZones,
  keyOf,
  plannedFloors,
  plural,
  presetLevel,
  roofLevel,
  roomNumber,
  zoneKey,
  type BuildingDraft,
  type SetupContext,
  type WizardDraft,
  type ZoneChoice,
} from '@/lib/tc/maintenance';

/**
 * Paso 1: las plantas con habitaciones y las zonas comunes del hotel.
 * Lo que ya existe se enseña y no se repite.
 */
export default function BuildingStep({
  context,
  draft,
  onBuilding,
  onAddZone,
  onRemoveZone,
}: {
  context: SetupContext;
  draft: WizardDraft;
  onBuilding: (building: BuildingDraft) => void;
  onAddZone: (zone: ZoneChoice) => void;
  onRemoveZone: (id: string) => void;
}) {
  const building = draft.building;
  const existingRooms = context.building.rooms;
  const roomFloors = context.building.floors.filter((f) => f.rooms > 0);
  const planned = building.add ? plannedFloors(building) : null;
  const roof = roofLevel(context, building);
  const zones = hotelZones(context, draft);
  const zoneKeys = new Set(zones.map((z) => zoneKey(z.level, z.name)));

  const [customName, setCustomName] = useState('');
  const [customLevel, setCustomLevel] = useState('0');
  const [customProblem, setCustomProblem] = useState<string | null>(null);

  function set<K extends keyof BuildingDraft>(key: K, value: BuildingDraft[K]) {
    onBuilding({ ...building, [key]: value });
  }

  // Al cambiar las habitaciones de todas, se olvidan los cambios por planta.
  function setRoomsPerFloor(value: string) {
    onBuilding({ ...building, roomsPerFloor: value, perFloor: {} });
  }

  function setFloorRooms(level: number, rooms: number) {
    onBuilding({
      ...building,
      perFloor: { ...building.perFloor, [level]: String(rooms) },
    });
  }

  function togglePreset(name: string, level: number | 'ROOF') {
    const isRoof = level === 'ROOF';
    const resolved = isRoof ? roof : level;
    const mine = draft.zones.find((z) =>
      isRoof
        ? z.roof && keyOf(z.name) === keyOf(name)
        : zoneKey(z.level, z.name) === zoneKey(resolved, name),
    );
    if (mine) {
      onRemoveZone(mine.id);
      return;
    }
    onAddZone({
      id: newKey('zone'),
      name,
      level: resolved,
      floorName: isRoof ? ROOF_ZONE : null,
      roof: isRoof,
    });
  }

  function addCustom() {
    const name = customName.trim().replace(/\s+/g, ' ');
    const level = Number.parseInt(customLevel, 10);
    if (!name) return setCustomProblem('Pon el nombre de la zona.');
    if (zoneKeys.has(zoneKey(level, name))) {
      return setCustomProblem(`«${name}» ya está en esa planta.`);
    }
    onAddZone({
      id: newKey('zone'),
      name,
      level,
      floorName: null,
      roof: false,
    });
    setCustomName('');
    setCustomProblem(null);
  }

  // Plantas que se pueden elegir para una zona: sótanos, baja, las de
  // habitaciones y la cubierta.
  const minLevel = Math.min(-2, ...context.building.floors.map((f) => f.level));
  const levelOptions: number[] = [];
  for (let level = Math.max(LEVEL_MIN, minLevel); level <= roof; level += 1)
    levelOptions.push(level);

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="Habitaciones"
        subtitle="Las plantas con habitaciones y cuántas hay en cada una. Se numeran solas: 101, 102…"
      >
        {existingRooms > 0 ? (
          <div className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
            Ya tiene {plural(existingRooms, 'habitación', 'habitaciones')} en{' '}
            {plural(roomFloors.length, 'planta', 'plantas')}
            {roomFloors.length > 0
              ? ` (de la ${roomFloors[0].roomNames[0] ?? ''} a la ${roomFloors[roomFloors.length - 1].roomNames.at(-1) ?? ''})`
              : ''}
            .
          </div>
        ) : null}

        {existingRooms > 0 ? (
          <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={building.add}
              onChange={(e) => set('add', e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Añadir más habitaciones
          </label>
        ) : null}

        {building.add ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-2">
                  Desde la planta
                </span>
                <input
                  inputMode="numeric"
                  value={building.fromLevel}
                  onChange={(e) =>
                    set('fromLevel', e.target.value.replace(/[^\d]/g, ''))
                  }
                  className="tc-input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-2">
                  Hasta la planta
                </span>
                <input
                  inputMode="numeric"
                  value={building.toLevel}
                  onChange={(e) =>
                    set('toLevel', e.target.value.replace(/[^\d]/g, ''))
                  }
                  className="tc-input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-2">
                  Habitaciones por planta
                </span>
                <input
                  inputMode="numeric"
                  value={building.roomsPerFloor}
                  onChange={(e) =>
                    setRoomsPerFloor(e.target.value.replace(/[^\d]/g, ''))
                  }
                  className="tc-input"
                />
              </label>
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted hover:text-ink">
                La primera habitación de cada planta es la{' '}
                {roomNumber(1, Number.parseInt(building.firstNumber, 10) || 1)}
              </summary>
              <label className="mt-2 flex items-center gap-2 text-ink-2">
                Empezar en el número
                <input
                  inputMode="numeric"
                  value={building.firstNumber}
                  onChange={(e) =>
                    set('firstNumber', e.target.value.replace(/[^\d]/g, ''))
                  }
                  className="tc-input w-20"
                />
              </label>
            </details>

            {planned &&
            !planned.ok &&
            building.toLevel &&
            building.roomsPerFloor ? (
              <p className="mt-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-ink">
                {planned.problem}
              </p>
            ) : null}

            {planned?.ok ? (
              <div className="mt-4">
                <p className="text-sm text-muted">
                  {plural(
                    planned.floors.reduce((sum, f) => sum + f.rooms, 0),
                    'habitación',
                    'habitaciones',
                  )}
                  . Si alguna planta tiene otras, cámbialas aquí.
                  {existingRooms > 0
                    ? ' Las que ya existen no se repiten.'
                    : ''}
                </p>
                <ul className="mt-2 max-h-80 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {planned.floors.map((floor) => (
                    <li
                      key={floor.level}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="min-w-0 text-sm">
                        <span className="font-medium text-ink">
                          Planta {floor.level}
                        </span>{' '}
                        <span className="text-muted">
                          · {roomNumber(floor.level, planned.firstNumber)} a{' '}
                          {roomNumber(
                            floor.level,
                            planned.firstNumber + floor.rooms - 1,
                          )}
                        </span>
                      </span>
                      <Counter
                        value={floor.rooms}
                        onChange={(n) => setFloorRooms(floor.level, n)}
                        min={1}
                        max={ROOMS_PER_FLOOR_MAX}
                        label={`habitaciones de la planta ${floor.level}`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </Card>

      <Card
        title="Zonas comunes"
        subtitle="Donde también hay máquinas: recepción, restaurante, la cubierta con las exteriores…"
      >
        <div className="flex flex-wrap gap-2">
          {context.zonePresets.map((preset) => {
            const level = presetLevel(preset, roof);
            const key = zoneKey(level, preset.name);
            const existing = zones.find(
              (z) => z.existing && zoneKey(z.level, z.name) === key,
            );
            const chosen = zoneKeys.has(key);
            return (
              <Chip
                key={`${preset.name}-${preset.level}`}
                active={chosen}
                disabled={Boolean(existing)}
                title={existing ? 'Ya está en el hotel' : undefined}
                onClick={() => togglePreset(preset.name, preset.level)}
              >
                {preset.name}
                <span className="text-xs font-normal text-muted">
                  {preset.level === 'ROOF'
                    ? 'arriba del todo'
                    : floorNameFor(context, level, roof)}
                </span>
              </Chip>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-2">Otra zona</span>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Sala de reuniones, Office planta 3…"
              maxLength={ZONE_NAME_MAX}
              className="tc-input"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:w-48">
            <span className="text-sm font-medium text-ink-2">En la planta</span>
            <select
              value={customLevel}
              onChange={(e) => setCustomLevel(e.target.value)}
              className="tc-input"
            >
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {floorNameFor(context, level, roof)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={addCustom} className="tc-button">
            Añadir
          </button>
        </div>
        {customProblem ? (
          <p className="mt-2 text-sm text-danger">{customProblem}</p>
        ) : null}

        {zones.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-medium text-ink-2">
              {plural(zones.length, 'zona común', 'zonas comunes')} en el hotel
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {zones.map((zone) => (
                <li
                  key={zone.id}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1.5 text-sm"
                >
                  <span className="text-ink">{zone.name}</span>
                  {keyOf(zone.floorName) !== keyOf(zone.name) ? (
                    <span className="text-xs text-muted">{zone.floorName}</span>
                  ) : null}
                  {zone.existing ? (
                    <span className="px-1.5 text-xs text-subtle">ya está</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveZone(zone.id)}
                      aria-label={`Quitar ${zone.name}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}