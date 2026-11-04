import {
  ITEM_TYPE_INFO,
  OPTION_RESULT_INFO,
  formatRange,
  groupBySection,
  parseDecimal,
  type Draft,
  type ItemOption,
  type ItemType,
  type OptionResult,
  type Template,
} from '@/lib/tc/templates';

export type PreviewItem = {
  key: string;
  label: string;
  type: ItemType;
  required: boolean;
  range: string | null;
  helpText: string | null;
  options: ItemOption[];
};

export type PreviewSection = {
  key: string;
  name: string;
  items: PreviewItem[];
};

export function previewFromTemplate(template: Template): PreviewSection[] {
  return groupBySection(template.items).map((group, index) => ({
    key: `s-${index}`,
    name: group.name,
    items: group.items.map((item) => ({
      key: item.id,
      label: item.label,
      type: item.type,
      required: item.required,
      range:
        item.type === 'NUMBER'
          ? (formatRange(item.minValue, item.maxValue, item.unit) ?? item.unit)
          : null,
      helpText: item.helpText,
      options: item.type === 'CHOICE' ? item.options : [],
    })),
  }));
}

export function previewFromDraft(draft: Draft): PreviewSection[] {
  const safe = (value: string) => {
    const n = parseDecimal(value);
    return n === null || Number.isNaN(n) ? null : n;
  };

  return draft.sections
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      key: section.key,
      name: section.name.trim(),
      items: section.items.map((item) => ({
        key: item.key,
        label: item.label.trim() || 'Punto sin nombre',
        type: item.type,
        required: item.required,
        range:
          item.type === 'NUMBER'
            ? (formatRange(
                safe(item.minValue),
                safe(item.maxValue),
                item.unit.trim() || null,
              ) ??
              (item.unit.trim() || null))
            : null,
        helpText: item.helpText.trim() || null,
        options:
          item.type === 'CHOICE'
            ? item.options
                .filter((o) => o.label.trim())
                .map((o) => ({ label: o.label.trim(), result: o.result }))
            : [],
      })),
    }));
}

const OPTION_STYLE: Record<OptionResult, string> = {
  OK: 'border-success/30 bg-success-soft text-success',
  ISSUE: 'border-danger/30 bg-danger-soft text-danger',
  NA: 'border-line bg-surface-2 text-muted',
};

// Las opciones de un punto de tipo Estado, como las verá el técnico.
export function OptionChips({ options }: { options: ItemOption[] }) {
  if (options.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Opciones">
      {options.map((option) => (
        <li
          key={option.label}
          title={OPTION_RESULT_INFO[option.result].label}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${OPTION_STYLE[option.result]}`}
        >
          {option.label}
        </li>
      ))}
    </ul>
  );
}

// [3, 2, 4] → [0, 3, 5]: cuántos puntos hay antes de cada sección.
export function startPositions(counts: number[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (const count of counts) {
    result.push(total);
    total += count;
  }
  return result;
}

/**
 * Cómo verá el técnico la hoja: secciones con sus puntos, en orden.
 */
export default function TemplatePreview({
  sections,
}: {
  sections: PreviewSection[];
}) {
  if (sections.length === 0) {
    return (
      <div className="tc-panel p-6 text-sm text-muted">
        Esta plantilla todavía no tiene puntos.
      </div>
    );
  }

  // Numeración continua de los puntos a lo largo de todas las secciones.
  const offsets = startPositions(sections.map((s) => s.items.length));
  const hasOptions = sections.some((s) =>
    s.items.some((item) => item.options.length > 0),
  );

  return (
    <div className="space-y-4">
      {sections.map((section, sIndex) => (
        <section key={section.key} className="tc-panel overflow-hidden">
          {section.name ? (
            <h3 className="border-b border-line bg-surface-2 px-5 py-3 text-sm font-semibold text-ink">
              {section.name}
            </h3>
          ) : null}

          <ol className="divide-y divide-line">
            {section.items.map((item, iIndex) => {
              const position = offsets[sIndex] + iIndex + 1;
              return (
                <li key={item.key} className="flex gap-4 px-5 py-3.5">
                  <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs text-subtle">
                    {position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {item.label}
                      {item.required ? (
                        <span className="ml-1 text-danger" title="Obligatorio">
                          *
                        </span>
                      ) : null}
                    </p>
                    {item.helpText ? (
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {item.helpText}
                      </p>
                    ) : null}
                    <OptionChips options={item.options} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
                      {ITEM_TYPE_INFO[item.type].label}
                    </span>
                    {item.range ? (
                      <span className="font-mono text-[11px] text-muted">
                        {item.range}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <p className="text-xs text-subtle">
        <span className="text-danger">*</span> Obligatorio: el técnico tiene que
        rellenarlo.
        {hasOptions ? ' Las opciones en rojo cuentan como incidencia.' : ''}
      </p>
    </div>
  );
}