'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, Chip } from '@/components/maintenance/WizardUi';
import {
  POINT_LABEL_MAX,
  QUICK_POINTS,
  SHEET_NAME_MAX,
  keyOf,
  matchingTemplates,
  newPoint,
  plural,
  pointKind,
  type CompanyTemplate,
  type PlanDraft,
  type SetupContext,
  type SheetItem,
} from '@/lib/tc/maintenance';
import { groupBySection } from '@/lib/tc/templates';

// "limpieza, mediciones y cierre"
function joinWithY(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

function TemplatePoints({ template }: { template: CompanyTemplate }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-muted hover:text-ink">
        Ver sus {plural(template.items.length, 'punto', 'puntos')}
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        {groupBySection(template.items).map((group, i) => (
          <div key={`${group.name}-${i}`}>
            {group.name ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group.name}
              </p>
            ) : null}
            <ul className="mt-1 text-sm text-ink-2">
              {group.items.map((item, j) => (
                <li
                  key={`${item.label}-${j}`}
                  className="flex justify-between gap-3 py-0.5"
                >
                  <span>
                    {item.label}
                    {item.required ? (
                      <span className="text-danger"> *</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {pointKind(item)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-subtle">
        Para cambiar esta hoja, ve a Plantillas. Los cambios valen para todos
        los hoteles que la usan.
      </p>
    </details>
  );
}

function AddPoint({
  sections,
  onAdd,
}: {
  sections: string[];
  onAdd: (item: SheetItem) => void;
}) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState(QUICK_POINTS[0].key);
  const [unit, setUnit] = useState('');
  const [section, setSection] = useState(
    sections.find((s) => keyOf(s) !== 'cierre') ?? 'Otros',
  );
  const needsUnit = QUICK_POINTS.find((q) => q.key === kind)?.needsUnit;

  function add() {
    if (!label.trim()) return;
    onAdd(newPoint(kind, label, section, unit));
    setLabel('');
    setUnit('');
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-line-strong p-3">
      <p className="text-sm font-medium text-ink-2">Añadir un punto</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Revisar aislamiento de tuberías…"
          maxLength={POINT_LABEL_MAX}
          className="tc-input"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="tc-input sm:w-56"
        >
          {QUICK_POINTS.map((q) => (
            <option key={q.key} value={q.key}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        {needsUnit ? (
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidad: °C, bar, A…"
            maxLength={20}
            className="tc-input sm:w-40"
          />
        ) : null}
        <label className="flex items-center gap-2 text-sm text-ink-2">
          En
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="tc-input w-auto"
          >
            {[...new Set([...sections, 'Otros'])].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={!label.trim()}
          className="tc-button sm:ml-auto"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}

function SheetEditor({
  plan,
  onChange,
}: {
  plan: PlanDraft;
  onChange: (sheet: PlanDraft['newSheet']) => void;
}) {
  const sheet = plan.newSheet;
  const kept = sheet.items.filter((i) => i.keep).length;
  const sections = [...new Set(sheet.items.map((i) => i.section ?? 'Otros'))];
  const keptSections = [
    ...new Set(
      sheet.items.filter((i) => i.keep).map((i) => i.section ?? 'Otros'),
    ),
  ].map((s) => s.toLocaleLowerCase('es'));
  const sectionStates = sections.map((name) => {
    const items = sheet.items.filter((i) => (i.section ?? 'Otros') === name);
    return {
      name,
      total: items.length,
      kept: items.filter((i) => i.keep).length,
    };
  });

  // Quitar o volver a poner una parte entera (p. ej. la unidad exterior).
  function toggleSection(name: string, keep: boolean) {
    onChange({
      ...sheet,
      items: sheet.items.map((item) =>
        (item.section ?? 'Otros') === name ? { ...item, keep } : item,
      ),
    });
  }

  function update(key: string, patch: Partial<SheetItem>) {
    onChange({
      ...sheet,
      items: sheet.items.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    });
  }

  // Un punto nuevo va al final de su sección.
  function add(item: SheetItem) {
    const items = [...sheet.items];
    const last = items
      .map((i) => i.section ?? 'Otros')
      .lastIndexOf(item.section ?? 'Otros');
    const closing = items.findIndex((i) => keyOf(i.section ?? '') === 'cierre');
    const at = last >= 0 ? last + 1 : closing >= 0 ? closing : items.length;
    items.splice(at, 0, item);
    onChange({ ...sheet, items });
  }

  return (
    <div className="mt-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-2">
          Nombre de la hoja
        </span>
        <input
          value={sheet.name}
          onChange={(e) => onChange({ ...sheet, name: e.target.value })}
          maxLength={SHEET_NAME_MAX}
          className="tc-input"
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink-2">Qué partes se revisan</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sectionStates.map((section) => (
            <Chip
              key={section.name}
              active={section.kept > 0}
              onClick={() => toggleSection(section.name, section.kept === 0)}
            >
              {section.name}
              {section.kept > 0 && section.kept < section.total ? (
                <span className="text-xs font-normal text-muted">
                  {section.kept}/{section.total}
                </span>
              ) : null}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Toca una parte para quitarla si no la revisáis (por ejemplo, la unidad
          exterior) o para volver a ponerla.
        </p>
      </div>

      <details className="group mt-4 rounded-lg border border-line">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="text-sm text-ink-2">
            Lleva {plural(kept, 'punto', 'puntos')}:{' '}
            <span className="text-muted">{joinWithY(keptSections)}.</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-accent">
            <span className="group-open:hidden">Ver y cambiar</span>
            <span className="hidden group-open:inline">Cerrar</span>
          </span>
        </summary>
        <div className="border-t border-line px-4 pb-4 pt-3">
          <p className="text-sm text-muted">
            Quita lo que no hagáis y cambia el texto si quieres. Los marcados
            con <span className="text-danger">*</span> son obligatorios para el
            técnico.
          </p>

          <div className="mt-3 flex flex-col gap-4">
            {groupBySection(sheet.items).map((group, i) => (
              <div key={`${group.name}-${i}`}>
                {group.name ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {group.name}
                  </p>
                ) : null}
                <ul className="mt-1 divide-y divide-line rounded-lg border border-line">
                  {group.items.map((item) => (
                    <li
                      key={item.key}
                      className={`flex items-center gap-3 px-3 py-2 ${item.keep ? '' : 'bg-surface-2'}`}
                    >
                      <input
                        type="checkbox"
                        checked={item.keep}
                        onChange={(e) =>
                          update(item.key, { keep: e.target.checked })
                        }
                        aria-label={`Incluir ${item.label}`}
                        className="h-4 w-4 shrink-0 accent-accent"
                      />
                      <input
                        value={item.label}
                        onChange={(e) =>
                          update(item.key, { label: e.target.value })
                        }
                        disabled={!item.keep}
                        maxLength={POINT_LABEL_MAX}
                        aria-label="Texto del punto"
                        className={`min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-accent focus:bg-surface ${
                          item.keep ? 'text-ink' : 'text-subtle line-through'
                        }`}
                      />
                      <span className="hidden shrink-0 text-xs text-muted sm:inline">
                        {pointKind(item)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          update(item.key, { required: !item.required })
                        }
                        disabled={!item.keep}
                        aria-pressed={item.required}
                        title={
                          item.required
                            ? 'Obligatorio (quitar)'
                            : 'Hacerlo obligatorio'
                        }
                        className={`shrink-0 rounded px-1.5 text-base leading-none ${
                          item.required
                            ? 'text-danger'
                            : 'text-line-strong hover:text-muted'
                        }`}
                      >
                        *
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-muted">
            {kept} de {plural(sheet.items.length, 'punto', 'puntos')} en la
            hoja.
          </p>

          <AddPoint sections={sections} onAdd={add} />
        </div>
      </details>
    </div>
  );
}

/** Paso 3: qué entra en el mantenimiento y qué se revisa en cada máquina. */
export default function SheetsStep({
  context,
  categories,
  counts,
  plans,
  onPlan,
}: {
  context: SetupContext;
  categories: string[];
  counts: Record<string, number>;
  plans: Record<string, PlanDraft>;
  onPlan: (key: string, plan: PlanDraft) => void;
}) {
  if (categories.length === 0) {
    return context.plans.length > 0 ? (
      <Card
        title="Todas sus máquinas ya tienen plan"
        subtitle={`${context.plans.map((p) => p.category).join(', ')}. La frecuencia, los técnicos o la hoja se cambian desde su plan preventivo.`}
      >
        <Link href={`/sites/${context.site.id}/plan`} className="tc-button">
          Ver su plan preventivo
        </Link>
      </Card>
    ) : (
      <Card
        title="No hay máquinas para revisar"
        subtitle="Vuelve al paso Máquinas y marca las que tiene el hotel."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {context.plans.length > 0 ? (
        <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
          Ya tiene plan: {context.plans.map((p) => p.category).join(', ')}. Eso
          se cambia desde su plan preventivo.
        </p>
      ) : null}

      {categories.map((category) => {
        const key = keyOf(category);
        const plan = plans[key];
        if (!plan) return null;
        const own = matchingTemplates(context, category);
        const others = context.templates.filter(
          (t) => !own.some((o) => o.id === t.id),
        );
        const chosen =
          plan.sheet.kind === 'existing'
            ? context.templates.find(
                (t) =>
                  t.id === (plan.sheet as { templateId: string }).templateId,
              )
            : undefined;
        const set = (patch: Partial<PlanDraft>) =>
          onPlan(key, { ...plan, ...patch });

        return (
          <article key={key} className="tc-panel p-4 sm:p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={plan.include}
                onChange={(e) => set({ include: e.target.checked })}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <span>
                <span className="block text-base font-semibold text-ink">
                  {category}
                </span>
                <span className="block text-sm text-muted">
                  {counts[key]
                    ? `${plural(counts[key], 'máquina', 'máquinas')} · `
                    : ''}
                  {plan.include
                    ? 'Entra en el mantenimiento'
                    : 'No entra en el mantenimiento'}
                </span>
              </span>
            </label>

            {plan.include ? (
              <div className="mt-4 sm:pl-7">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium text-ink-2">
                    Hoja de revisión
                  </legend>
                  {own.map((template) => (
                    <label
                      key={template.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`sheet-${key}`}
                        checked={
                          plan.sheet.kind === 'existing' &&
                          chosen?.id === template.id
                        }
                        onChange={() =>
                          set({
                            sheet: {
                              kind: 'existing',
                              templateId: template.id,
                            },
                          })
                        }
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="text-ink">
                        Usar «{template.name}»{' '}
                        <span className="text-muted">
                          ({plural(template.items.length, 'punto', 'puntos')})
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`sheet-${key}`}
                      checked={plan.sheet.kind === 'new'}
                      onChange={() => set({ sheet: { kind: 'new' } })}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="text-ink">
                      {own.length > 0
                        ? 'Hacer una hoja nueva'
                        : 'Hoja nueva con los puntos de siempre'}
                    </span>
                  </label>
                  {others.length > 0 ? (
                    <label className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                      O usar otra hoja de la empresa:
                      <select
                        value={
                          chosen && !own.some((o) => o.id === chosen.id)
                            ? chosen.id
                            : ''
                        }
                        onChange={(e) =>
                          e.target.value
                            ? set({
                                sheet: {
                                  kind: 'existing',
                                  templateId: e.target.value,
                                },
                              })
                            : undefined
                        }
                        className="tc-input w-auto"
                      >
                        <option value="">Elegir…</option>
                        {others.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </fieldset>

                {plan.sheet.kind === 'existing' && chosen ? (
                  <TemplatePoints template={chosen} />
                ) : (
                  <SheetEditor
                    plan={plan}
                    onChange={(newSheet) => set({ newSheet })}
                  />
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}