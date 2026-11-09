'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import { errMsg, tcPatch } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  ITEM_VALUE_MAX,
  NO_ACCESS_PRESETS,
  NO_ACCESS_REASON_MAX,
  PART_NAME_MAX,
  PART_SUGGESTIONS,
  PART_UNIT_MAX,
  buildSaveBody,
  choiceStatus,
  draftFromDetail,
  emptyPart,
  isSheetItem,
  outOfRange,
  parseNumber,
  statusForValue,
  thermalJump,
  type ItemDraft,
  type ItemStatus,
  type PartDraft,
  type StopDraft,
} from '@/lib/tc/round-sheet';
import {
  PARTS_MAX,
  parseStopDetail,
  type StopDetail,
  type StopItem,
  type StopStatus,
} from '@/lib/tc/rounds';
import type { TcSession } from '@/lib/tc/session';
import {
  formatRange,
  groupBySection,
  type OptionResult,
} from '@/lib/tc/templates';
import { ErrorBox } from './RoundsUi';

const EMPTY_ITEM: ItemDraft = { status: 'PENDING', value: '', notes: '' };

const RESULT_STYLE: Record<OptionResult, string> = {
  OK: 'border-success bg-success text-white',
  ISSUE: 'border-danger bg-danger text-white',
  NA: 'border-ink-2 bg-ink-2 text-white',
};

const STOP_STATUS_OPTIONS: { value: StopStatus; label: string }[] = [
  { value: 'DONE', label: 'Revisada' },
  { value: 'NO_ACCESS', label: 'Sin acceso' },
  { value: 'PENDING', label: 'Sin hacer' },
];

function Choice({
  label,
  selected,
  result,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  result: OptionResult;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`min-h-[2.25rem] rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
        selected
          ? RESULT_STYLE[result]
          : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  );
}

function ItemShell({
  item,
  htmlFor,
  children,
}: {
  item: StopItem;
  htmlFor?: string;
  children: ReactNode;
}) {
  const Label = htmlFor ? 'label' : 'p';
  return (
    <div className="px-3 py-3">
      <Label
        {...(htmlFor ? { htmlFor } : {})}
        className="mb-2 block text-sm font-medium text-ink"
      >
        {item.label}
        {item.required ? (
          <span className="ml-1 text-danger" aria-label="obligatorio">
            *
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

/** Un punto de la hoja, según su tipo. */
function ItemField({
  item,
  entry,
  disabled,
  onChange,
}: {
  item: StopItem;
  entry: ItemDraft;
  disabled: boolean;
  onChange: (next: ItemDraft) => void;
}) {
  const fieldId = `item-${item.id}`;
  const toggle = (status: ItemStatus, value: string) =>
    entry.status === status && entry.value === value
      ? onChange({ ...entry, status: 'PENDING', value: '' })
      : onChange({ ...entry, status, value });

  const failNote =
    entry.status === 'FAIL' ? (
      <input
        aria-label={`Qué le pasa a «${item.label}»`}
        className="tc-input mt-2"
        value={entry.notes}
        maxLength={ITEM_VALUE_MAX}
        placeholder="Qué le pasa (opcional)"
        onChange={(e) => onChange({ ...entry, notes: e.target.value })}
        disabled={disabled}
      />
    ) : null;

  if (item.type === 'CHOICE' && item.options.length > 0) {
    return (
      <ItemShell item={item}>
        <div className="flex flex-wrap gap-1.5">
          {item.options.map((option) => (
            <Choice
              key={option.label}
              label={option.label}
              result={option.result}
              selected={entry.value === option.label}
              disabled={disabled}
              onClick={() => toggle(choiceStatus(option.result), option.label)}
            />
          ))}
        </div>
        {failNote}
      </ItemShell>
    );
  }

  if (item.type === 'BOOLEAN') {
    return (
      <ItemShell item={item}>
        <div className="flex flex-wrap gap-1.5">
          {['Sí', 'No'].map((answer) => (
            <Choice
              key={answer}
              label={answer}
              result="OK"
              selected={entry.value === answer}
              disabled={disabled}
              onClick={() => toggle('OK', answer)}
            />
          ))}
        </div>
      </ItemShell>
    );
  }

  if (item.type === 'NUMBER') {
    const number = parseNumber(entry.value);
    const bad = entry.value.trim() !== '' && number === null;
    const outside = number !== null && outOfRange(number, item);
    const range = formatRange(item.minValue, item.maxValue, item.unit);
    return (
      <ItemShell item={item} htmlFor={fieldId}>
        <div className="flex items-center gap-2">
          <input
            id={fieldId}
            className="tc-input max-w-[9rem]"
            inputMode="decimal"
            value={entry.value}
            placeholder="0,0"
            aria-invalid={bad || outside}
            onChange={(e) =>
              onChange({
                ...entry,
                value: e.target.value,
                status: statusForValue(item, e.target.value),
              })
            }
            disabled={disabled}
          />
          {item.unit ? (
            <span className="text-sm text-muted">{item.unit}</span>
          ) : null}
        </div>
        {bad ? (
          <p className="mt-1 text-xs text-danger">
            Pon solo el número, por ejemplo 21,5.
          </p>
        ) : outside ? (
          <p className="mt-1 text-xs text-danger">
            Fuera de rango ({range}): sale como incidencia.
          </p>
        ) : range ? (
          <p className="mt-1 text-xs text-subtle">Normal: {range}</p>
        ) : null}
        {failNote}
      </ItemShell>
    );
  }

  if (
    item.type === 'TEXT' ||
    item.type === 'TEXTAREA' ||
    item.type === 'DATE'
  ) {
    const multiline = item.type === 'TEXTAREA';
    const change = (value: string) =>
      onChange({ ...entry, value, status: statusForValue(item, value) });
    return (
      <ItemShell item={item} htmlFor={fieldId}>
        {multiline ? (
          <textarea
            id={fieldId}
            className="tc-input min-h-[4.5rem]"
            value={entry.value}
            maxLength={ITEM_VALUE_MAX}
            placeholder={
              /incidencia/i.test(item.label)
                ? 'Déjalo vacío si no hay nada'
                : ''
            }
            onChange={(e) => change(e.target.value)}
            disabled={disabled}
          />
        ) : (
          <input
            id={fieldId}
            type={item.type === 'DATE' ? 'date' : 'text'}
            className="tc-input"
            value={entry.value}
            maxLength={ITEM_VALUE_MAX}
            onChange={(e) => change(e.target.value)}
            disabled={disabled}
          />
        )}
      </ItemShell>
    );
  }

  // Comprobación: correcto, incorrecto o no aplica.
  return (
    <ItemShell item={item}>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['OK', 'Correcto', 'OK'],
            ['FAIL', 'Incorrecto', 'ISSUE'],
            ['NA', 'No aplica', 'NA'],
          ] as const
        ).map(([status, label, result]) => (
          <Choice
            key={status}
            label={label}
            result={result}
            selected={entry.status === status}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...entry,
                status: entry.status === status ? 'PENDING' : status,
                value: '',
              })
            }
          />
        ))}
      </div>
      {failNote}
    </ItemShell>
  );
}

function PartRow({
  part,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  part: PartDraft;
  index: number;
  disabled: boolean;
  onChange: (next: PartDraft) => void;
  onRemove: () => void;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_auto] items-center gap-1.5">
      <input
        aria-label={`Recambio ${index + 1}`}
        className="tc-input"
        list="round-part-suggestions"
        value={part.name}
        maxLength={PART_NAME_MAX}
        placeholder="Motor ventilador"
        onChange={(e) => onChange({ ...part, name: e.target.value })}
        disabled={disabled}
      />
      <input
        aria-label={`Cantidad del recambio ${index + 1}`}
        className="tc-input text-center"
        inputMode="decimal"
        value={part.quantity}
        onChange={(e) => onChange({ ...part, quantity: e.target.value })}
        disabled={disabled}
      />
      <input
        aria-label={`Unidad del recambio ${index + 1}`}
        className="tc-input text-center"
        value={part.unit}
        maxLength={PART_UNIT_MAX}
        placeholder="ud."
        onChange={(e) => onChange({ ...part, unit: e.target.value })}
        disabled={disabled}
      />
      <button
        type="button"
        className="tc-button px-2.5 text-danger"
        aria-label={`Quitar el recambio ${index + 1}`}
        onClick={onRemove}
        disabled={disabled}
      >
        ×
      </button>
    </li>
  );
}

/**
 * Rellenar la hoja de un equipo de la ronda desde el ordenador. En el móvil
 * se hace con la app, que guarda sin cobertura; aquí se guarda directo.
 */
export default function StopEditor({
  session,
  roundId,
  detail,
  onSaved,
  onCancel,
}: {
  session: TcSession;
  roundId: string;
  detail: StopDetail;
  onSaved: (saved: StopDetail) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<StopDraft>(() => draftFromDetail(detail));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheetItems = detail.items.filter(isSheetItem);
  const photoItems = detail.items.filter((item) => item.type === 'PHOTO');
  const jump = thermalJump(detail.items, draft);
  const groups = groupBySection(sheetItems);
  const measurementsSection = sheetItems.find(
    (i) => i.type === 'NUMBER',
  )?.section;

  function setItem(id: string, next: ItemDraft) {
    setDraft((d) => ({ ...d, items: { ...d.items, [id]: next } }));
  }

  function setParts(parts: PartDraft[]) {
    setDraft((d) => ({ ...d, parts }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const built = buildSaveBody(detail.items, draft);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await tcPatch<unknown>(
        session,
        `/rounds/${roundId}/stops/${detail.id}`,
        built.body,
      );
      const saved =
        res.code >= 200 && res.code < 300 ? parseStopDetail(res.json) : null;
      if (!saved) {
        setError(apiError(res.json, 'No se pudo guardar la habitación.'));
        return;
      }
      onSaved(saved);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">
          ¿Cómo ha ido?
        </legend>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup">
          {STOP_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={draft.status === option.value}
              onClick={() => setDraft((d) => ({ ...d, status: option.value }))}
              disabled={saving}
              className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                draft.status === option.value
                  ? option.value === 'NO_ACCESS'
                    ? 'border-warning bg-warning text-white'
                    : option.value === 'DONE'
                      ? 'border-accent bg-accent text-white'
                      : 'border-ink-2 bg-ink-2 text-white'
                  : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {draft.status === 'NO_ACCESS' ? (
        <div>
          <label
            htmlFor="no-access-reason"
            className="mb-2 block text-sm font-medium text-ink"
          >
            ¿Por qué no se pudo entrar?
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {NO_ACCESS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  setDraft((d) => ({ ...d, noAccessReason: preset }))
                }
                disabled={saving}
                aria-pressed={draft.noAccessReason === preset}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  draft.noAccessReason === preset
                    ? 'border-warning bg-warning-soft text-warning'
                    : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            id="no-access-reason"
            className="tc-input"
            value={draft.noAccessReason}
            maxLength={NO_ACCESS_REASON_MAX}
            placeholder="O escribe el motivo"
            onChange={(e) =>
              setDraft((d) => ({ ...d, noAccessReason: e.target.value }))
            }
            disabled={saving}
          />
          <p className="mt-1.5 text-xs text-muted">
            Queda en naranja para volver otro día. La ronda se envía cuando
            estén todas hechas.
          </p>
        </div>
      ) : (
        <>
          {groups.map((group, index) => (
            <section key={`${group.name}-${index}`}>
              {group.name ? (
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-subtle">
                  {group.name}
                </h3>
              ) : null}
              <div className="divide-y divide-line rounded-lg border border-line">
                {group.items.map((item) => (
                  <ItemField
                    key={item.id}
                    item={item}
                    entry={draft.items[item.id] ?? EMPTY_ITEM}
                    disabled={saving}
                    onChange={(next) => setItem(item.id, next)}
                  />
                ))}
                {jump !== null && group.name === measurementsSection ? (
                  <p className="bg-surface-2 px-3 py-2 text-sm text-ink-2">
                    Salto térmico:{' '}
                    <span className="font-semibold text-ink">
                      {String(jump).replace('.', ',')} °C
                    </span>
                  </p>
                ) : null}
              </div>
            </section>
          ))}

          {photoItems.length > 0 ? (
            <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
              Las fotos ({photoItems.map((i) => i.label).join(', ')}) se hacen
              desde la app del móvil.
            </p>
          ) : null}

          {draft.status === 'DONE' ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-danger"
                checked={draft.urgent}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, urgent: e.target.checked }))
                }
                disabled={saving}
              />
              <span>
                <span className="block text-sm font-semibold text-danger">
                  Urgente
                </span>
                <span className="block text-xs text-ink-2">
                  Hay que actuar ya: sale la primera cuando el encargado revise
                  la ronda.
                </span>
              </span>
            </label>
          ) : null}

          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">
                Recambios que hacen falta
              </h3>
              {draft.parts.length < PARTS_MAX ? (
                <button
                  type="button"
                  className="tc-button px-2.5 py-1 text-xs"
                  onClick={() => setParts([...draft.parts, emptyPart()])}
                  disabled={saving}
                >
                  Añadir recambio
                </button>
              ) : null}
            </div>
            {draft.parts.length === 0 ? (
              <p className="text-xs text-subtle">Ninguno.</p>
            ) : (
              <>
                <div className="mb-1 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_auto] gap-1.5 text-[11px] font-medium text-subtle">
                  <span>Recambio</span>
                  <span className="text-center">Cantidad</span>
                  <span className="text-center">Unidad</span>
                  <span className="w-8" />
                </div>
                <ul className="space-y-1.5">
                  {draft.parts.map((part, index) => (
                    <PartRow
                      key={part.key}
                      part={part}
                      index={index}
                      disabled={saving}
                      onChange={(next) =>
                        setParts(
                          draft.parts.map((p) =>
                            p.key === part.key ? next : p,
                          ),
                        )
                      }
                      onRemove={() =>
                        setParts(draft.parts.filter((p) => p.key !== part.key))
                      }
                    />
                  ))}
                </ul>
              </>
            )}
            <datalist id="round-part-suggestions">
              {PART_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </section>
        </>
      )}

      <ErrorBox message={error} />

      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <button
          type="button"
          className="tc-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="tc-button-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}