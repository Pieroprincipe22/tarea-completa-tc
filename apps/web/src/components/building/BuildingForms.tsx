'use client';

import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { errMsg, tcPatch, tcPost } from '@/lib/tc/api';
import type { TcSession } from '@/lib/tc/session';
import {
  LEVEL_MAX,
  LEVEL_MIN,
  NAME_MAX,
  ZONE_SUGGESTIONS,
  apiError,
  defaultFloorName,
  previewGeneration,
  type FloorView,
} from '@/lib/tc/building';
import { EQUIPMENT_SUGGESTIONS } from '@/lib/tc/templates';

function toInt(value: string): number {
  const clean = value.trim();
  return /^-?\d+$/.test(clean) ? Number(clean) : Number.NaN;
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink-2"
      >
        {label}
        {hint ? (
          <span className="ml-1 font-normal text-subtle">{hint}</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------
// Generador de plantas y habitaciones
// ---------------------------------------------------------------

export type GenerateResult = {
  floorsCreated: number;
  roomsCreated: number;
  roomsSkipped: number;
  assetsCreated: number;
};

export function describeGeneration(result: GenerateResult): string {
  const parts: string[] = [];
  if (result.floorsCreated > 0)
    parts.push(
      `${result.floorsCreated} planta${result.floorsCreated === 1 ? '' : 's'}`,
    );
  if (result.roomsCreated > 0)
    parts.push(
      `${result.roomsCreated} habitaci${result.roomsCreated === 1 ? 'ón' : 'ones'}`,
    );
  if (result.assetsCreated > 0)
    parts.push(
      `${result.assetsCreated} equipo${result.assetsCreated === 1 ? '' : 's'}`,
    );

  const created =
    parts.length > 0
      ? `Creado: ${parts.join(', ')}.`
      : 'No había nada nuevo que crear.';
  const skipped =
    result.roomsSkipped > 0
      ? ` ${result.roomsSkipped} habitaci${result.roomsSkipped === 1 ? 'ón ya existía' : 'ones ya existían'} y se han dejado como estaban.`
      : '';
  return created + skipped;
}

export function GeneratorPanel({
  session,
  siteId,
  onDone,
  onCancel,
}: {
  session: TcSession;
  siteId: string;
  onDone: (result: GenerateResult) => void;
  onCancel: () => void;
}) {
  const [fromLevel, setFromLevel] = useState('1');
  const [toLevel, setToLevel] = useState('5');
  const [roomsPerFloor, setRoomsPerFloor] = useState('10');
  const [firstNumber, setFirstNumber] = useState('1');
  const [withEquipment, setWithEquipment] = useState(false);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useMemo(
    () =>
      previewGeneration({
        fromLevel: toInt(fromLevel),
        toLevel: toInt(toLevel),
        roomsPerFloor: toInt(roomsPerFloor),
        firstNumber: toInt(firstNumber),
      }),
    [fromLevel, toLevel, roomsPerFloor, firstNumber],
  );

  const equipmentMissing = withEquipment && !category.trim();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || !check.ok || equipmentMissing) return;

    setSaving(true);
    setError(null);
    try {
      const res = await tcPost<unknown>(
        session,
        `/sites/${siteId}/building/generate`,
        {
          fromLevel: toInt(fromLevel),
          toLevel: toInt(toLevel),
          roomsPerFloor: toInt(roomsPerFloor),
          firstNumber: toInt(firstNumber),
          equipment: withEquipment
            ? {
                category: category.trim(),
                brand: brand.trim() || null,
                model: model.trim() || null,
              }
            : null,
        },
      );
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, 'No se pudo generar el edificio.'));
        return;
      }
      const json = res.json as Partial<GenerateResult>;
      onDone({
        floorsCreated: json.floorsCreated ?? 0,
        roomsCreated: json.roomsCreated ?? 0,
        roomsSkipped: json.roomsSkipped ?? 0,
        assetsCreated: json.assetsCreated ?? 0,
      });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="tc-panel p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">
        Generar plantas y habitaciones
      </h2>
      <p className="mt-1 text-sm text-muted">
        Crea de una vez las plantas con sus habitaciones numeradas (101, 102…).
        Si alguna ya existe, se deja como está.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field id="gen-from" label="Desde la planta">
          <input
            id="gen-from"
            className="tc-input"
            inputMode="numeric"
            value={fromLevel}
            onChange={(e) => setFromLevel(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field id="gen-to" label="Hasta la planta">
          <input
            id="gen-to"
            className="tc-input"
            inputMode="numeric"
            value={toLevel}
            onChange={(e) => setToLevel(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field id="gen-rooms" label="Habitaciones por planta">
          <input
            id="gen-rooms"
            className="tc-input"
            inputMode="numeric"
            value={roomsPerFloor}
            onChange={(e) => setRoomsPerFloor(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field id="gen-first" label="Empezar en el" hint="(01)">
          <input
            id="gen-first"
            className="tc-input"
            inputMode="numeric"
            value={firstNumber}
            onChange={(e) => setFirstNumber(e.target.value)}
            disabled={saving}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={withEquipment}
            onChange={(e) => setWithEquipment(e.target.checked)}
            disabled={saving}
          />
          Poner un equipo en cada habitación
        </label>
        {withEquipment ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field id="gen-category" label="Tipo de equipo">
              <input
                id="gen-category"
                className="tc-input bg-surface"
                list="gen-category-options"
                value={category}
                maxLength={NAME_MAX}
                placeholder="Fancoil, Split…"
                onChange={(e) => setCategory(e.target.value)}
                disabled={saving}
              />
              <datalist id="gen-category-options">
                {EQUIPMENT_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <Field id="gen-brand" label="Marca" hint="(opcional)">
              <input
                id="gen-brand"
                className="tc-input bg-surface"
                value={brand}
                maxLength={120}
                onChange={(e) => setBrand(e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field id="gen-model" label="Modelo" hint="(opcional)">
              <input
                id="gen-model"
                className="tc-input bg-surface"
                value={model}
                maxLength={120}
                onChange={(e) => setModel(e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <div
        className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
          check.ok
            ? 'border-accent/25 bg-accent-soft text-ink-2'
            : 'border-danger/30 bg-danger-soft text-danger'
        }`}
        aria-live="polite"
      >
        {check.ok ? (
          <>
            <p className="font-medium text-ink">
              {check.preview.floors} planta
              {check.preview.floors === 1 ? '' : 's'} · {check.preview.rooms}{' '}
              habitaci
              {check.preview.rooms === 1 ? 'ón' : 'ones'}
            </p>
            <p className="mt-0.5">
              De la {check.preview.firstRoom} a la {check.preview.lastRoom}
              {check.preview.floors > 1
                ? ` (${check.preview.floorNames[0]} a ${check.preview.floorNames.at(-1)})`
                : ` (${check.preview.floorNames[0]})`}
              .
              {withEquipment && category.trim()
                ? ` Con un ${category.trim()} en cada habitación que no tenga equipo.`
                : ''}
            </p>
          </>
        ) : (
          check.problem
        )}
      </div>

      <div className="mt-4">
        <ErrorBox
          message={
            error ??
            (equipmentMissing
              ? 'Pon el tipo de equipo o desmarca la casilla.'
              : null)
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="tc-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="tc-button-primary"
          disabled={saving || !check.ok || equipmentMissing}
        >
          {saving ? 'Generando…' : 'Generar'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Planta: añadir o cambiar nombre y nivel
// ---------------------------------------------------------------

export function FloorForm({
  session,
  siteId,
  floor,
  suggestedLevel,
  onDone,
  onCancel,
}: {
  session: TcSession;
  siteId: string;
  // Sin planta se crea una nueva.
  floor?: FloorView;
  suggestedLevel: number;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(
    floor?.name ?? defaultFloorName(suggestedLevel),
  );
  const [level, setLevel] = useState(String(floor?.level ?? suggestedLevel));
  // Mientras no se toque el nombre, sigue al nivel ("Planta 3"…).
  const [nameTouched, setNameTouched] = useState(Boolean(floor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelNumber = toInt(level);
  const levelOk =
    Number.isInteger(levelNumber) &&
    levelNumber >= LEVEL_MIN &&
    levelNumber <= LEVEL_MAX;

  function onLevel(value: string) {
    setLevel(value);
    const n = toInt(value);
    if (!nameTouched && Number.isInteger(n)) setName(defaultFloorName(n));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError('Ponle un nombre a la planta.');
      return;
    }
    if (!levelOk) {
      setError(
        `El nivel tiene que ser un número entero entre ${LEVEL_MIN} y ${LEVEL_MAX}.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = { name: name.trim(), level: levelNumber };
      const res = floor
        ? await tcPatch<unknown>(
            session,
            `/sites/${siteId}/building/floors/${floor.id}`,
            body,
          )
        : await tcPost<unknown>(
            session,
            `/sites/${siteId}/building/floors`,
            body,
          );
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, 'No se pudo guardar la planta.'));
        return;
      }
      onDone(floor ? 'Planta guardada.' : `«${body.name}» añadida.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field id="floor-name" label="Nombre">
          <input
            id="floor-name"
            className="tc-input"
            value={name}
            maxLength={NAME_MAX}
            placeholder="Planta baja, Sótano -1, Cubierta…"
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            disabled={saving}
            autoFocus
          />
        </Field>
        <Field id="floor-level" label="Nivel">
          <input
            id="floor-level"
            className="tc-input"
            inputMode="numeric"
            value={level}
            onChange={(e) => onLevel(e.target.value)}
            disabled={saving}
          />
        </Field>
      </div>
      <p className="text-xs text-subtle">
        El nivel ordena las plantas: -1 sótano, 0 planta baja, 1, 2, 3… La
        cubierta, la más alta.
      </p>
      <ErrorBox message={error} />
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="tc-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="tc-button-primary" disabled={saving}>
          {saving ? 'Guardando…' : floor ? 'Guardar' : 'Añadir planta'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Habitación o zona común: añadir
// ---------------------------------------------------------------

export function SpaceForm({
  session,
  siteId,
  floors,
  floorId,
  kind,
  onDone,
  onCancel,
}: {
  session: TcSession;
  siteId: string;
  floors: FloorView[];
  floorId: string;
  kind: 'ROOM' | 'COMMON';
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [selectedFloor, setSelectedFloor] = useState(floorId);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRoom = kind === 'ROOM';

  // Al elegir un tipo de zona, el nombre se rellena igual (se puede cambiar).
  function onCategory(value: string) {
    if (!name.trim() || name === category) setName(value);
    setCategory(value);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError(
        isRoom
          ? 'Pon el número de la habitación.'
          : 'Ponle un nombre a la zona.',
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await tcPost<unknown>(
        session,
        `/sites/${siteId}/building/spaces`,
        {
          floorId: selectedFloor,
          kind,
          name: name.trim(),
          category: isRoom ? null : category.trim() || null,
        },
      );
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, 'No se pudo guardar.'));
        return;
      }
      onDone(
        isRoom
          ? `Habitación ${name.trim()} añadida.`
          : `«${name.trim()}» añadida.`,
      );
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="space-floor" label="Planta">
        <select
          id="space-floor"
          className="tc-input"
          value={selectedFloor}
          onChange={(e) => setSelectedFloor(e.target.value)}
          disabled={saving}
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>
      {!isRoom ? (
        <Field id="space-category" label="Tipo de zona">
          <input
            id="space-category"
            className="tc-input"
            list="space-category-options"
            value={category}
            maxLength={NAME_MAX}
            placeholder="Elige o escribe uno"
            onChange={(e) => onCategory(e.target.value)}
            disabled={saving}
            autoFocus
          />
          <datalist id="space-category-options">
            {ZONE_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>
      ) : null}
      <Field id="space-name" label={isRoom ? 'Número de habitación' : 'Nombre'}>
        <input
          id="space-name"
          className="tc-input"
          value={name}
          maxLength={NAME_MAX}
          placeholder={isRoom ? '204' : 'Cuarto de rack planta baja'}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          autoFocus={isRoom}
        />
      </Field>
      <ErrorBox message={error} />
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="tc-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="tc-button-primary" disabled={saving}>
          {saving ? 'Guardando…' : isRoom ? 'Añadir habitación' : 'Añadir zona'}
        </button>
      </div>
    </form>
  );
}