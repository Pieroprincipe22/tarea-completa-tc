'use client';

import {
  floorSummary,
  type FloorView,
  type SpaceView,
} from '@/lib/tc/building';

function EquipmentDot({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="text-[11px] text-subtle" aria-label="sin equipos">
        —
      </span>
    );
  }
  return (
    <span
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent"
      aria-label={`${count} equipo${count === 1 ? '' : 's'}`}
    >
      {count}
    </span>
  );
}

/**
 * Una planta: sus zonas comunes en lista y sus habitaciones en cuadrícula.
 * Pulsar una habitación o zona abre su panel con los equipos.
 */
export default function FloorSection({
  floor,
  spaces,
  canEdit,
  onOpenSpace,
  onEdit,
  onDelete,
  onAddZone,
  onAddRoom,
}: {
  floor: FloorView;
  // Los espacios que se ven (pueden venir filtrados por la búsqueda).
  spaces: SpaceView[];
  canEdit: boolean;
  onOpenSpace: (space: SpaceView) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddZone: () => void;
  onAddRoom: () => void;
}) {
  const zones = spaces.filter((s) => s.kind === 'COMMON');
  const rooms = spaces.filter((s) => s.kind === 'ROOM');

  return (
    <section
      className="tc-panel overflow-hidden"
      aria-labelledby={`floor-${floor.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-3">
        <div className="min-w-0">
          <h2
            id={`floor-${floor.id}`}
            className="text-sm font-semibold text-ink"
          >
            {floor.name}
            <span className="ml-2 font-mono text-[11px] font-normal text-subtle">
              nivel {floor.level}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-muted">{floorSummary(floor)}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="tc-button px-2.5 py-1 text-xs"
              onClick={onAddZone}
            >
              + Zona
            </button>
            <button
              type="button"
              className="tc-button px-2.5 py-1 text-xs"
              onClick={onAddRoom}
            >
              + Habitación
            </button>
            <button
              type="button"
              className="tc-button px-2.5 py-1 text-xs"
              onClick={onEdit}
            >
              Editar
            </button>
            <button
              type="button"
              className="tc-button px-2.5 py-1 text-xs text-danger"
              onClick={onDelete}
            >
              Borrar
            </button>
          </div>
        ) : null}
      </div>

      {spaces.length === 0 ? (
        <p className="px-4 py-4 text-sm text-subtle">
          {floor.spaces.length === 0
            ? 'Esta planta todavía no tiene habitaciones ni zonas.'
            : 'Nada en esta planta coincide con la búsqueda.'}
        </p>
      ) : (
        <div className="space-y-4 px-4 py-4">
          {zones.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {zones.map((zone) => (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => onOpenSpace(zone)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left transition hover:border-accent hover:bg-accent-soft"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {zone.name}
                      </span>
                      {zone.category && zone.category !== zone.name ? (
                        <span className="block truncate text-xs text-muted">
                          {zone.category}
                        </span>
                      ) : null}
                    </span>
                    <EquipmentDot count={zone.assets.length} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {rooms.length > 0 ? (
            <ul
              className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1.5"
              aria-label={`Habitaciones de ${floor.name}`}
            >
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => onOpenSpace(room)}
                    title={
                      room.assets.length > 0
                        ? room.assets.map((a) => a.name).join('\n')
                        : 'Sin equipos'
                    }
                    className={`flex w-full items-center justify-between gap-1 rounded-md border px-2 py-1.5 font-mono text-xs transition hover:border-accent hover:bg-accent-soft ${
                      room.assets.length > 0
                        ? 'border-line bg-surface text-ink'
                        : 'border-dashed border-line-strong bg-surface-2 text-muted'
                    }`}
                  >
                    <span>{room.name}</span>
                    <EquipmentDot count={room.assets.length} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}