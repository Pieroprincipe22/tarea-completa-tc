'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { errMsg, tcGet } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  STOP_TONE_INFO,
  formatMoment,
  parseStopDetail,
  stopTone,
  type RoundFloor,
  type StopDetail,
  type StopItem,
  type StopTone,
  type StopView,
} from '@/lib/tc/rounds';
import type { TcSession } from '@/lib/tc/session';
import { groupBySection } from '@/lib/tc/templates';

export type StopFilter = 'all' | StopTone;

export function matchesFilter(stop: StopView, filter: StopFilter): boolean {
  return filter === 'all' || stopTone(stop) === filter;
}

function StopChip({
  stop,
  wide,
  onOpen,
}: {
  stop: StopView;
  wide?: boolean;
  onOpen: (stop: StopView) => void;
}) {
  const tone = stopTone(stop);
  const info = STOP_TONE_INFO[tone];
  const title = [
    stop.assetName,
    info.label,
    stop.noAccessReason,
    stop.doneBy ? `por ${stop.doneBy.name}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onOpen(stop)}
      title={title}
      aria-label={`${stop.label}: ${info.label}`}
      className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition hover:ring-2 hover:ring-accent/30 ${info.chip} ${
        wide ? 'font-medium' : 'text-center font-mono'
      }`}
    >
      <span className="block truncate">
        {wide ? stop.label : (stop.spaceName ?? stop.label)}
      </span>
      {wide && stop.spaceKind === null ? (
        <span className="block truncate text-[11px] font-normal opacity-80">
          {stop.assetName}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Una planta de la ronda: zonas comunes en lista y habitaciones en
 * cuadrícula, cada una del color de cómo quedó.
 */
export function RoundFloorSection({
  floor,
  filter,
  query,
  onOpen,
}: {
  floor: RoundFloor;
  filter: StopFilter;
  query: string;
  onOpen: (stop: StopView) => void;
}) {
  const visible = floor.stops.filter(
    (stop) =>
      matchesFilter(stop, filter) &&
      (!query ||
        `${stop.label} ${stop.assetName}`.toLowerCase().includes(query)),
  );
  if (visible.length === 0) return null;

  const done = floor.stops.filter((s) => s.status !== 'PENDING').length;
  const wide = visible.filter(
    (s) => s.spaceKind === 'COMMON' || s.spaceKind === null,
  );
  const rooms = visible.filter((s) => s.spaceKind === 'ROOM');

  return (
    <section className="tc-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-ink">{floor.name}</h3>
        <p className="text-xs text-muted">
          {done} de {floor.stops.length}
        </p>
      </div>
      <div className="space-y-3 px-4 py-3">
        {wide.length > 0 ? (
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {wide.map((stop) => (
              <li key={stop.id}>
                <StopChip stop={stop} wide onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : null}
        {rooms.length > 0 ? (
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-1.5"
            aria-label={`Habitaciones de ${floor.name}`}
          >
            {rooms.map((stop) => (
              <li key={stop.id}>
                <StopChip stop={stop} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function itemStatusLabel(item: StopItem): { text: string; className: string } {
  if (item.status === 'OK')
    return { text: 'Correcto', className: 'text-success' };
  if (item.status === 'FAIL')
    return { text: 'Incidencia', className: 'text-danger' };
  if (item.status === 'NA')
    return { text: 'No aplica', className: 'text-muted' };
  return { text: 'Sin rellenar', className: 'text-subtle' };
}

function itemValue(item: StopItem): string | null {
  if (!item.value) return null;
  return item.unit ? `${item.value} ${item.unit}` : item.value;
}

/**
 * Panel lateral con la hoja de un equipo de la ronda: cómo quedó cada punto.
 */
export function StopDrawer({
  session,
  roundId,
  stop,
  onClose,
}: {
  session: TcSession;
  roundId: string;
  stop: StopView;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<StopDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await tcGet<unknown>(
          session,
          `/rounds/${roundId}/stops/${stop.id}`,
        );
        if (cancelled) return;
        const parsed =
          res.code >= 200 && res.code < 300 ? parseStopDetail(res.json) : null;
        if (!parsed) {
          setError(apiError(res.json, 'No se pudo cargar la hoja del equipo.'));
          return;
        }
        setDetail(parsed);
      } catch (err) {
        if (!cancelled) setError(errMsg(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, roundId, stop.id]);

  const tone = stopTone(stop);
  const info = STOP_TONE_INFO[tone];
  const filled = detail?.items.filter((i) => i.status !== 'PENDING').length;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-drawer-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
              {stop.place}
            </p>
            <h2
              id="stop-drawer-title"
              className="mt-1 truncate text-lg font-semibold text-ink"
            >
              {stop.assetName}
            </h2>
            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${info.chip}`}
            >
              {info.label}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="tc-button px-3 py-1.5 text-xs"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <div className="flex-1 space-y-4 px-5 py-5">
          {stop.status === 'NO_ACCESS' ? (
            <p className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
              No se pudo entrar
              {stop.noAccessReason ? `: ${stop.noAccessReason}` : ''}. Queda
              pendiente para otro día.
            </p>
          ) : null}
          {stop.doneAt ? (
            <p className="text-sm text-muted">
              Revisado el {formatMoment(stop.doneAt)}
              {stop.doneBy ? ` por ${stop.doneBy.name}` : ''}.
            </p>
          ) : stop.status === 'PENDING' ? (
            <p className="text-sm text-muted">
              Todavía no se ha revisado este equipo.
            </p>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}

          {stop.assetId ? (
            <Link
              href={`/assets/${stop.assetId}`}
              className="tc-button w-full justify-center"
            >
              Ver el equipo y su historial
            </Link>
          ) : null}

          {!detail && !error ? (
            <p className="text-sm text-muted">Cargando la hoja…</p>
          ) : null}

          {detail ? (
            <section>
              <h3 className="text-sm font-semibold text-ink">
                Hoja de revisión
                <span className="ml-2 font-normal text-muted">
                  {filled} de {detail.items.length} puntos
                </span>
              </h3>
              <div className="mt-2 space-y-3">
                {groupBySection(detail.items).map((group, index) => (
                  <div key={`${group.name}-${index}`}>
                    {group.name ? (
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">
                        {group.name}
                      </p>
                    ) : null}
                    <ul className="divide-y divide-line rounded-lg border border-line">
                      {group.items.map((item) => {
                        const status = itemStatusLabel(item);
                        const value = itemValue(item);
                        return (
                          <li key={item.id} className="px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-ink">{item.label}</p>
                              <p
                                className={`shrink-0 text-xs font-medium ${status.className}`}
                              >
                                {value ?? status.text}
                              </p>
                            </div>
                            {value &&
                            item.status !== 'PENDING' &&
                            value !== status.text ? (
                              <p className={`text-xs ${status.className}`}>
                                {status.text}
                              </p>
                            ) : null}
                            {item.notes ? (
                              <p className="mt-1 text-xs text-muted">
                                {item.notes}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}