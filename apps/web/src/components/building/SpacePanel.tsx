'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { errMsg, tcDelete, tcPatch, tcPost } from '@/lib/tc/api';
import type { TcSession } from '@/lib/tc/session';
import {
  NAME_MAX,
  ZONE_SUGGESTIONS,
  apiError,
  type AssetBrief,
  type FloorView,
  type SpaceView,
} from '@/lib/tc/building';
import { EQUIPMENT_SUGGESTIONS } from '@/lib/tc/templates';

/**
 * Selector de habitación o zona agrupado por planta. Se usa para colocar o
 * mover un equipo.
 */
export function SpacePicker({
  id,
  floors,
  value,
  exclude,
  onChange,
  disabled,
  label,
}: {
  id: string;
  floors: FloorView[];
  value: string;
  exclude?: string;
  onChange: (spaceId: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      className="tc-input py-1.5"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Elige habitación o zona…</option>
      {floors.map((floor) =>
        floor.spaces.length > 0 ? (
          <optgroup key={floor.id} label={floor.name}>
            {floor.spaces
              .filter((space) => space.id !== exclude)
              .map((space) => (
                <option key={space.id} value={space.id}>
                  {space.label}
                </option>
              ))}
          </optgroup>
        ) : null,
      )}
    </select>
  );
}

function assetDetail(asset: AssetBrief): string {
  return [asset.category, asset.brand, asset.model].filter(Boolean).join(' · ');
}

export default function SpacePanel({
  session,
  siteId,
  floor,
  space,
  floors,
  canEdit,
  onClose,
  onChanged,
}: {
  session: TcSession;
  siteId: string;
  floor: FloorView;
  space: SpaceView;
  floors: FloorView[];
  canEdit: boolean;
  onClose: () => void;
  // Recarga el edificio y muestra el mensaje. Si "closePanel", se cierra.
  onChanged: (message: string, closePanel?: boolean) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

  // Nuevo equipo
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');

  // Editar la habitación o zona
  const [name, setName] = useState(space.name);
  const [zoneCategory, setZoneCategory] = useState(space.category ?? '');

  const isRoom = space.kind === 'ROOM';

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run(
    request: () => Promise<{ code: number; json: unknown }>,
    okMessage: string,
    fallback: string,
    closePanel = false,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, fallback));
        return false;
      }
      onChanged(okMessage, closePanel);
      return true;
    } catch (err) {
      setError(errMsg(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onAddAsset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const type = category.trim();
    if (!type) {
      setError('Pon el tipo de equipo.');
      return;
    }
    const assetName = `${type} · ${space.label}`;
    const ok = await run(
      () =>
        tcPost<unknown>(session, '/assets', {
          siteId,
          spaceId: space.id,
          name: assetName,
          category: type,
          ...(brand.trim() ? { brand: brand.trim() } : {}),
          ...(model.trim() ? { model: model.trim() } : {}),
        }),
      `«${assetName}» añadido.`,
      'No se pudo añadir el equipo.',
    );
    if (ok) {
      setAdding(false);
      setCategory('');
      setBrand('');
      setModel('');
    }
  }

  async function onMove(asset: AssetBrief) {
    if (!moveTarget) return;
    const target = floors
      .flatMap((f) => f.spaces)
      .find((s) => s.id === moveTarget);
    const ok = await run(
      () =>
        tcPatch<unknown>(session, `/assets/${asset.id}`, {
          spaceId: moveTarget,
        }),
      `«${asset.name}» movido a ${target?.label ?? 'su nuevo sitio'}.`,
      'No se pudo mover el equipo.',
    );
    if (ok) {
      setMoving(null);
      setMoveTarget('');
    }
  }

  async function onUnplace(asset: AssetBrief) {
    if (
      !window.confirm(
        `¿Sacar «${asset.name}» de ${space.label}?\n\nEl equipo no se borra: queda en el sitio, sin habitación, hasta que lo coloques en otra.`,
      )
    ) {
      return;
    }
    await run(
      () => tcPatch<unknown>(session, `/assets/${asset.id}`, { spaceId: null }),
      `«${asset.name}» ya no está en ${space.label}.`,
      'No se pudo quitar el equipo.',
    );
  }

  async function onSaveSpace(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setError(isRoom ? 'Pon el número de la habitación.' : 'Ponle un nombre.');
      return;
    }
    const ok = await run(
      () =>
        tcPatch<unknown>(
          session,
          `/sites/${siteId}/building/spaces/${space.id}`,
          {
            name: name.trim(),
            ...(isRoom ? {} : { category: zoneCategory.trim() || null }),
          },
        ),
      'Cambios guardados.',
      'No se pudo guardar.',
    );
    if (ok) setEditing(false);
  }

  async function onDeleteSpace() {
    if (!window.confirm(`¿Borrar ${space.label} de ${floor.name}?`)) return;
    await run(
      () =>
        tcDelete<unknown>(
          session,
          `/sites/${siteId}/building/spaces/${space.id}`,
        ),
      `${space.label} borrada.`,
      'No se pudo borrar.',
      true,
    );
  }

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
        aria-labelledby="space-panel-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
              {floor.name}
              {space.category && !isRoom && space.category !== space.name
                ? ` · ${space.category}`
                : ''}
            </p>
            <h2
              id="space-panel-title"
              className="mt-1 truncate text-lg font-semibold text-ink"
            >
              {space.label}
            </h2>
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

        <div className="flex-1 space-y-5 px-5 py-5">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-ink">
              Equipos ({space.assets.length})
            </h3>
            {space.assets.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                {isRoom
                  ? 'Esta habitación todavía no tiene equipos.'
                  : 'Esta zona todavía no tiene equipos.'}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                {space.assets.map((asset) => (
                  <li key={asset.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="block truncate text-sm font-medium text-ink hover:text-accent"
                        >
                          {asset.name}
                        </Link>
                        {assetDetail(asset) ? (
                          <p className="truncate text-xs text-muted">
                            {assetDetail(asset)}
                          </p>
                        ) : null}
                      </div>
                      {canEdit ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft disabled:opacity-50"
                            onClick={() => {
                              setMoving(moving === asset.id ? null : asset.id);
                              setMoveTarget('');
                            }}
                            disabled={busy}
                          >
                            Mover
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                            onClick={() => void onUnplace(asset)}
                            disabled={busy}
                          >
                            Quitar
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {moving === asset.id ? (
                      <div className="mt-2 flex gap-2">
                        <SpacePicker
                          id={`move-${asset.id}`}
                          label={`Mover ${asset.name} a`}
                          floors={floors}
                          value={moveTarget}
                          exclude={space.id}
                          onChange={setMoveTarget}
                          disabled={busy}
                        />
                        <button
                          type="button"
                          className="tc-button-primary shrink-0 px-3 py-1.5 text-xs"
                          onClick={() => void onMove(asset)}
                          disabled={busy || !moveTarget}
                        >
                          Mover
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canEdit ? (
              adding ? (
                <form
                  onSubmit={onAddAsset}
                  noValidate
                  className="mt-3 space-y-3 rounded-lg border border-line bg-surface-2 p-3"
                >
                  <div>
                    <label
                      htmlFor="asset-category"
                      className="mb-1 block text-xs font-medium text-muted"
                    >
                      Tipo de equipo
                    </label>
                    <input
                      id="asset-category"
                      className="tc-input bg-surface"
                      list="asset-category-options"
                      value={category}
                      maxLength={NAME_MAX}
                      placeholder="Fancoil, Split…"
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={busy}
                      autoFocus
                    />
                    <datalist id="asset-category-options">
                      {EQUIPMENT_SUGGESTIONS.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="asset-brand"
                        className="mb-1 block text-xs font-medium text-muted"
                      >
                        Marca
                      </label>
                      <input
                        id="asset-brand"
                        className="tc-input bg-surface"
                        value={brand}
                        maxLength={120}
                        onChange={(e) => setBrand(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="asset-model"
                        className="mb-1 block text-xs font-medium text-muted"
                      >
                        Modelo
                      </label>
                      <input
                        id="asset-model"
                        className="tc-input bg-surface"
                        value={model}
                        maxLength={120}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </div>
                  {category.trim() ? (
                    <p className="text-xs text-subtle">
                      Se llamará «{category.trim()} · {space.label}».
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="tc-button px-3 py-1.5 text-xs"
                      onClick={() => setAdding(false)}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="tc-button-primary px-3 py-1.5 text-xs"
                      disabled={busy}
                    >
                      {busy ? 'Guardando…' : 'Añadir equipo'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
                  onClick={() => {
                    setAdding(true);
                    setError(null);
                  }}
                >
                  + Añadir equipo
                </button>
              )
            ) : null}
          </section>

          {canEdit ? (
            <section className="border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-ink">
                {isRoom ? 'Habitación' : 'Zona'}
              </h3>
              {editing ? (
                <form
                  onSubmit={onSaveSpace}
                  noValidate
                  className="mt-3 space-y-3"
                >
                  {!isRoom ? (
                    <div>
                      <label
                        htmlFor="edit-space-category"
                        className="mb-1 block text-xs font-medium text-muted"
                      >
                        Tipo de zona
                      </label>
                      <input
                        id="edit-space-category"
                        className="tc-input"
                        list="edit-space-category-options"
                        value={zoneCategory}
                        maxLength={NAME_MAX}
                        onChange={(e) => setZoneCategory(e.target.value)}
                        disabled={busy}
                      />
                      <datalist id="edit-space-category-options">
                        {ZONE_SUGGESTIONS.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                  ) : null}
                  <div>
                    <label
                      htmlFor="edit-space-name"
                      className="mb-1 block text-xs font-medium text-muted"
                    >
                      {isRoom ? 'Número' : 'Nombre'}
                    </label>
                    <input
                      id="edit-space-name"
                      className="tc-input"
                      value={name}
                      maxLength={NAME_MAX}
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="tc-button px-3 py-1.5 text-xs"
                      onClick={() => {
                        setEditing(false);
                        setName(space.name);
                        setZoneCategory(space.category ?? '');
                      }}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="tc-button-primary px-3 py-1.5 text-xs"
                      disabled={busy}
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="tc-button px-3 py-1.5 text-xs"
                    onClick={() => setEditing(true)}
                    disabled={busy}
                  >
                    {isRoom ? 'Cambiar número' : 'Cambiar nombre'}
                  </button>
                  <button
                    type="button"
                    className="tc-button px-3 py-1.5 text-xs text-danger"
                    onClick={() => void onDeleteSpace()}
                    disabled={busy}
                  >
                    Borrar
                  </button>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}