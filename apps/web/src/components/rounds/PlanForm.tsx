'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import { errMsg, tcPatch, tcPost } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  CATEGORY_MAX,
  EVERY_MAX,
  FREQUENCY_PRESETS,
  LEAD_DAYS_DEFAULT,
  LEAD_DAYS_MAX,
  PLAN_NAME_MAX,
  defaultPlanName,
  formatDay,
  minusDays,
  nextDueFrom,
  todayString,
  type CategoryOption,
  type PlanUnit,
  type PlanView,
  type TechnicianOption,
} from '@/lib/tc/rounds';
import type { TcSession } from '@/lib/tc/session';
import { comparable, type Template } from '@/lib/tc/templates';
import { ErrorBox, TechnicianPicker } from './RoundsUi';

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

function toInt(value: string): number {
  const clean = value.trim();
  return /^\d+$/.test(clean) ? Number(clean) : Number.NaN;
}

function presetKey(every: number, unit: PlanUnit): string {
  return (
    FREQUENCY_PRESETS.find((p) => p.every === every && p.unit === unit)?.key ??
    'CUSTOM'
  );
}

// Lo que se parece la plantilla al tipo de equipo: "Split" encaja con una
// plantilla de tipo "Split / Multisplit".
function templateScore(template: Template, category: string): number {
  const key = comparable(category);
  if (!key) return 0;
  const type = template.category ? comparable(template.category) : '';
  if (type === key) return 3;
  if (type && (type.includes(key) || key.includes(type))) return 2;
  return comparable(template.name).includes(key) ? 1 : 0;
}

// Las plantillas del mismo tipo de equipo, primero.
function sortTemplates(templates: Template[], category: string): Template[] {
  return [...templates].sort(
    (a, b) =>
      templateScore(b, category) - templateScore(a, category) ||
      a.name.localeCompare(b.name, 'es'),
  );
}

function countFor(categories: CategoryOption[], category: string): number {
  const key = comparable(category);
  return categories
    .filter((c) => comparable(c.category) === key)
    .reduce((sum, c) => sum + c.count, 0);
}

/**
 * Una línea del plan preventivo: qué equipos (por tipo), con qué hoja,
 * cada cuánto, desde cuándo y quién la hace.
 */
export default function PlanForm({
  session,
  siteId,
  plan,
  categories,
  templates,
  technicians,
  onDone,
  onCancel,
}: {
  session: TcSession;
  siteId: string;
  plan?: PlanView;
  categories: CategoryOption[];
  templates: Template[];
  technicians: TechnicianOption[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(
    plan?.category ?? categories[0]?.category ?? '',
  );
  const [templateId, setTemplateId] = useState(() => {
    if (plan) return plan.templateId;
    return sortTemplates(templates, categories[0]?.category ?? '')[0]?.id ?? '';
  });
  const [templatePicked, setTemplatePicked] = useState(Boolean(plan));
  const [frequency, setFrequency] = useState(
    plan ? presetKey(plan.every, plan.unit) : '3M',
  );
  const [every, setEvery] = useState(String(plan?.every ?? 3));
  const [unit, setUnit] = useState<PlanUnit>(plan?.unit ?? 'MONTH');
  const [startsOn, setStartsOn] = useState(plan?.startsOn ?? todayString());
  const [leadDays, setLeadDays] = useState(
    String(plan?.leadDays ?? LEAD_DAYS_DEFAULT),
  );
  const [technicianIds, setTechnicianIds] = useState<string[]>(
    () => plan?.technicians.map((t) => t.id) ?? [],
  );
  // Vacío = nombre automático ("Fancoil · cada 3 meses").
  const [name, setName] = useState(() =>
    plan && plan.name !== defaultPlanName(plan.category, plan.every, plan.unit)
      ? plan.name
      : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const everyNumber = toInt(every);
  const everyOk =
    Number.isInteger(everyNumber) &&
    everyNumber >= 1 &&
    everyNumber <= EVERY_MAX[unit];
  const leadNumber = toInt(leadDays);
  const leadOk =
    Number.isInteger(leadNumber) &&
    leadNumber >= 0 &&
    leadNumber <= LEAD_DAYS_MAX;

  const assetCount = countFor(categories, category);
  // Al editar, si no cambian las fechas la próxima ronda es la que ya tenía.
  const timingChanged =
    !plan ||
    plan.startsOn !== startsOn ||
    plan.every !== everyNumber ||
    plan.unit !== unit;
  const nextDue = !everyOk
    ? null
    : timingChanged
      ? nextDueFrom(startsOn, unit, everyNumber)
      : plan.nextDueOn;
  const createsOn = nextDue && leadOk ? minusDays(nextDue, leadNumber) : null;
  const sortedTemplates = sortTemplates(templates, category);

  function onCategory(value: string) {
    setCategory(value);
    // Mientras no se elija a mano, se propone la plantilla de ese tipo.
    if (!templatePicked) {
      const best = sortTemplates(templates, value)[0];
      if (best) setTemplateId(best.id);
    }
  }

  function onFrequency(key: string) {
    setFrequency(key);
    const preset = FREQUENCY_PRESETS.find((p) => p.key === key);
    if (preset) {
      setEvery(String(preset.every));
      setUnit(preset.unit);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    if (!category.trim()) return setError('Pon el tipo de equipo.');
    if (!templateId) return setError('Elige la hoja de revisión.');
    if (!everyOk)
      return setError(
        unit === 'WEEK'
          ? `Pon cada cuántas semanas (de 1 a ${EVERY_MAX.WEEK}).`
          : `Pon cada cuántos meses (de 1 a ${EVERY_MAX.MONTH}).`,
      );
    if (!nextDue) return setError('La fecha de la primera ronda no es válida.');
    if (!leadOk)
      return setError(
        `La antelación tiene que ser de 0 a ${LEAD_DAYS_MAX} días.`,
      );

    setSaving(true);
    setError(null);
    try {
      const body = {
        templateId,
        category: category.trim(),
        name: name.trim() || null,
        every: everyNumber,
        unit,
        startsOn,
        leadDays: leadNumber,
        technicianIds,
      };
      const res = plan
        ? await tcPatch<unknown>(
            session,
            `/sites/${siteId}/plans/${plan.id}`,
            body,
          )
        : await tcPost<unknown>(session, `/sites/${siteId}/plans`, body);
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, 'No se pudo guardar el plan.'));
        return;
      }
      const saved =
        body.name ?? defaultPlanName(body.category, everyNumber, unit);
      onDone(plan ? `«${saved}» guardado.` : `«${saved}» añadido al plan.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="plan-category" label="Tipo de equipo">
        <input
          id="plan-category"
          className="tc-input"
          list="plan-category-options"
          value={category}
          maxLength={CATEGORY_MAX}
          placeholder="Fancoil, Split…"
          onChange={(e) => onCategory(e.target.value)}
          disabled={saving}
          autoFocus
        />
        <datalist id="plan-category-options">
          {categories.map((option) => (
            <option key={option.category} value={option.category}>
              {`${option.count} equipo${option.count === 1 ? '' : 's'}`}
            </option>
          ))}
        </datalist>
        <p
          className={`mt-1.5 text-xs ${assetCount > 0 || !category.trim() ? 'text-subtle' : 'text-warning'}`}
        >
          {!category.trim()
            ? 'Entran todos los equipos del sitio que sean de este tipo.'
            : assetCount > 0
              ? `Entran los ${assetCount} equipo${assetCount === 1 ? '' : 's'} de tipo «${category.trim()}» de este sitio.`
              : `En este sitio no hay equipos de tipo «${category.trim()}». Las rondas no se crearán hasta que los haya.`}
        </p>
      </Field>

      <Field id="plan-template" label="Hoja de revisión">
        <select
          id="plan-template"
          className="tc-input"
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setTemplatePicked(true);
          }}
          disabled={saving}
        >
          <option value="">Elige una plantilla…</option>
          {sortedTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
              {template.category ? ` · ${template.category}` : ''}
            </option>
          ))}
        </select>
        {templates.length === 0 ? (
          <p className="mt-1.5 text-xs text-warning">
            No tienes plantillas activas. Crea una en Plantillas.
          </p>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="plan-frequency" label="Cada cuánto">
          <select
            id="plan-frequency"
            className="tc-input"
            value={frequency}
            onChange={(e) => onFrequency(e.target.value)}
            disabled={saving}
          >
            {FREQUENCY_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
            <option value="CUSTOM">Otra…</option>
          </select>
        </Field>
        {frequency === 'CUSTOM' ? (
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 self-end">
            <input
              aria-label="Número de semanas o meses"
              className="tc-input"
              inputMode="numeric"
              value={every}
              onChange={(e) => setEvery(e.target.value)}
              disabled={saving}
            />
            <select
              aria-label="Semanas o meses"
              className="tc-input"
              value={unit}
              onChange={(e) =>
                setUnit(e.target.value === 'WEEK' ? 'WEEK' : 'MONTH')
              }
              disabled={saving}
            >
              <option value="WEEK">semanas</option>
              <option value="MONTH">meses</option>
            </select>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="plan-start" label="Primera ronda">
          <input
            id="plan-start"
            type="date"
            className="tc-input"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field id="plan-lead" label="Crearla con" hint="(días de antelación)">
          <input
            id="plan-lead"
            className="tc-input"
            inputMode="numeric"
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value)}
            disabled={saving}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-subtle">
        Si ya lleváis este mantenimiento, pon la fecha de la última ronda: la
        próxima se calcula sola.
      </p>

      <TechnicianPicker
        legend="Quién hace las rondas"
        technicians={technicians}
        selected={technicianIds}
        onChange={setTechnicianIds}
        disabled={saving}
      />

      <Field id="plan-name" label="Nombre" hint="(opcional)">
        <input
          id="plan-name"
          className="tc-input"
          value={name}
          maxLength={PLAN_NAME_MAX}
          placeholder={
            category.trim() && everyOk
              ? defaultPlanName(category.trim(), everyNumber, unit)
              : 'Fancoils de habitaciones'
          }
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
      </Field>

      {nextDue ? (
        <div className="rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-ink-2">
          <p className="font-medium text-ink">
            Próxima ronda: {formatDay(nextDue)}
          </p>
          <p className="mt-0.5">
            {createsOn && createsOn <= todayString()
              ? 'Se creará al guardar, con todos los equipos.'
              : `Se creará sola el ${formatDay(createsOn)}, con todos los equipos.`}
          </p>
        </div>
      ) : null}

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
          {saving ? 'Guardando…' : plan ? 'Guardar' : 'Añadir al plan'}
        </button>
      </div>
    </form>
  );
}