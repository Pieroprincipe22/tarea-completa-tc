'use client';

import { Card, Counter } from '@/components/maintenance/WizardUi';
import {
  MACHINES_PER_ROOM_MAX,
  MACHINES_PER_ZONE_MAX,
  hotelZones,
  keyOf,
  plural,
  roomsAfter,
  type CatalogMachine,
  type HotelZone,
  type MachineDraft,
  type SetupContext,
  type WizardDraft,
} from '@/lib/tc/maintenance';

/** Una máquina recién marcada: en cada habitación o en su zona de siempre. */
export function defaultMachineDraft(
  machine: CatalogMachine,
  zones: HotelZone[],
): MachineDraft {
  const home = machine.defaultZone
    ? zones.find((z) => keyOf(z.name) === keyOf(machine.defaultZone!))
    : undefined;
  return {
    selected: true,
    perRoom: machine.placement === 'ROOMS' ? 1 : 0,
    brand: '',
    model: '',
    zones: home ? { [home.id]: 1 } : {},
  };
}

function ZoneCounters({
  zones,
  choice,
  machine,
  onChange,
}: {
  zones: HotelZone[];
  choice: MachineDraft;
  machine: CatalogMachine;
  onChange: (zones: Record<string, number>) => void;
}) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {zones.map((zone) => (
        <li
          key={zone.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <span className="min-w-0 text-sm">
            <span className="text-ink">{zone.name}</span>{' '}
            {keyOf(zone.floorName) !== keyOf(zone.name) ? (
              <span className="text-muted">· {zone.floorName}</span>
            ) : null}
          </span>
          <Counter
            value={choice.zones[zone.id] ?? 0}
            onChange={(n) => onChange({ ...choice.zones, [zone.id]: n })}
            max={MACHINES_PER_ZONE_MAX}
            label={`${machine.label} en ${zone.name}`}
          />
        </li>
      ))}
    </ul>
  );
}

function RoomCounter({
  rooms,
  choice,
  machine,
  onChange,
}: {
  rooms: number;
  choice: MachineDraft;
  machine: CatalogMachine;
  onChange: (choice: MachineDraft) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-2">
        En cada habitación{' '}
        <span className="text-muted">
          ({plural(rooms, 'habitación', 'habitaciones')})
        </span>
      </span>
      <Counter
        value={choice.perRoom}
        onChange={(n) => onChange({ ...choice, perRoom: n })}
        max={MACHINES_PER_ROOM_MAX}
        label={`${machine.label} por habitación`}
      />
    </div>
  );
}

function MachineCard({
  machine,
  choice,
  existing,
  rooms,
  zones,
  onChange,
  onAddRoof,
}: {
  machine: CatalogMachine;
  choice: MachineDraft | undefined;
  existing: number;
  rooms: number;
  zones: HotelZone[];
  onChange: (choice: MachineDraft) => void;
  onAddRoof: () => void;
}) {
  const selected = Boolean(choice?.selected);
  const inZones = choice
    ? Object.entries(choice.zones).reduce(
        (sum, [id, n]) => sum + (zones.some((z) => z.id === id) ? n : 0),
        0,
      )
    : 0;
  const total = choice ? choice.perRoom * rooms + inZones : 0;
  const hasZoneMachines = inZones > 0;

  function toggle(checked: boolean) {
    if (checked)
      onChange(
        choice
          ? { ...choice, selected: true }
          : defaultMachineDraft(machine, zones),
      );
    else if (choice) onChange({ ...choice, selected: false });
  }

  return (
    <article
      className={`tc-panel p-4 sm:p-5 ${selected ? 'ring-2 ring-accent/30' : ''}`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-1 h-4 w-4 accent-accent"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-ink">
              {machine.label}
            </span>
            {existing > 0 ? (
              <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-muted">
                Ya hay {existing.toLocaleString('es-ES')}
              </span>
            ) : null}
          </span>
          <span className="block text-sm text-muted">{machine.hint}</span>
        </span>
      </label>

      {selected && choice ? (
        <div className="mt-4 flex flex-col gap-4 sm:pl-7">
          {rooms > 0 &&
          (machine.placement === 'ROOMS' || choice.perRoom > 0) ? (
            <RoomCounter
              rooms={rooms}
              choice={choice}
              machine={machine}
              onChange={onChange}
            />
          ) : rooms > 0 ? (
            // Las de zona (cubierta…) casi nunca van en las habitaciones.
            <details>
              <summary className="cursor-pointer text-sm text-muted hover:text-ink">
                También hay en las habitaciones
              </summary>
              <div className="mt-2">
                <RoomCounter
                  rooms={rooms}
                  choice={choice}
                  machine={machine}
                  onChange={onChange}
                />
              </div>
            </details>
          ) : machine.placement === 'ROOMS' ? (
            <p className="text-sm text-muted">
              El hotel aún no tiene habitaciones: ponlas en el paso Edificio.
            </p>
          ) : null}

          {zones.length === 0 ? (
            machine.placement === 'ZONES' ? (
              <div className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
                Estas máquinas van en una zona (la cubierta, la sala de
                máquinas…).{' '}
                <button
                  type="button"
                  onClick={onAddRoof}
                  className="font-medium text-accent hover:underline"
                >
                  Añadir la cubierta
                </button>
              </div>
            ) : null
          ) : machine.placement === 'ZONES' || hasZoneMachines ? (
            <div>
              <p className="mb-2 text-sm text-ink-2">En las zonas comunes</p>
              <ZoneCounters
                zones={zones}
                choice={choice}
                machine={machine}
                onChange={(next) => onChange({ ...choice, zones: next })}
              />
            </div>
          ) : (
            <details>
              <summary className="cursor-pointer text-sm text-muted hover:text-ink">
                También hay en zonas comunes
              </summary>
              <div className="mt-2">
                <ZoneCounters
                  zones={zones}
                  choice={choice}
                  machine={machine}
                  onChange={(next) => onChange({ ...choice, zones: next })}
                />
              </div>
            </details>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-ink-2">Marca (opcional)</span>
              <input
                value={choice.brand}
                onChange={(e) => onChange({ ...choice, brand: e.target.value })}
                placeholder="Daikin, Mitsubishi…"
                maxLength={80}
                className="tc-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-ink-2">Modelo (opcional)</span>
              <input
                value={choice.model}
                onChange={(e) => onChange({ ...choice, model: e.target.value })}
                maxLength={80}
                className="tc-input"
              />
            </label>
          </div>

          <p className="text-sm text-muted">
            {total > 0
              ? `${plural(total, 'máquina', 'máquinas')} en total.${existing > 0 ? ' Las que ya existen no se repiten: solo se añaden las que falten.' : ''}`
              : 'Pon cuántas hay en las habitaciones o en las zonas.'}
          </p>
        </div>
      ) : null}
    </article>
  );
}

/** Paso 2: qué máquinas tiene el hotel y dónde. */
export default function MachinesStep({
  context,
  draft,
  onMachine,
  onAddRoof,
}: {
  context: SetupContext;
  draft: WizardDraft;
  onMachine: (key: string, choice: MachineDraft) => void;
  onAddRoof: () => void;
}) {
  const rooms = roomsAfter(context, draft.building);
  const zones = hotelZones(context, draft);
  const catalogKeys = new Set(context.catalog.map((m) => keyOf(m.category)));
  const others = context.machines.filter(
    (m) => !catalogKeys.has(keyOf(m.category)),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Marca las máquinas que hay en el hotel. Cada una tendrá su ficha y
        saldrá en las rondas con su habitación o zona.
      </p>

      {context.catalog.map((machine) => (
        <MachineCard
          key={machine.key}
          machine={machine}
          choice={draft.machines[machine.key]}
          existing={
            context.machines.find(
              (m) => keyOf(m.category) === keyOf(machine.category),
            )?.total ?? 0
          }
          rooms={rooms}
          zones={zones}
          onChange={(choice) => onMachine(machine.key, choice)}
          onAddRoof={onAddRoof}
        />
      ))}

      {others.length > 0 ? (
        <Card
          title="Otras máquinas del hotel"
          subtitle="Ya están dadas de alta. En el paso siguiente puedes incluirlas en el mantenimiento."
        >
          <ul className="flex flex-wrap gap-2">
            {others.map((m) => (
              <li
                key={m.category}
                className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-ink-2"
              >
                {m.category}{' '}
                <span className="text-muted">
                  · {m.total.toLocaleString('es-ES')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}