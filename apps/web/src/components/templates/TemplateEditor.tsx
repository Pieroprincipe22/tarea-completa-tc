'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { errMsg, tcPatch, tcPost } from '@/lib/tc/api';
import type { TcSession } from '@/lib/tc/session';
import {
  CATEGORY_MAX,
  DESCRIPTION_MAX,
  EQUIPMENT_SUGGESTIONS,
  HELP_MAX,
  ITEM_TYPES,
  ITEM_TYPE_INFO,
  LABEL_MAX,
  NAME_MAX,
  OPTION_LABEL_MAX,
  OPTION_PRESETS,
  OPTION_RESULTS,
  OPTION_RESULT_INFO,
  OPTIONS_MAX,
  OPTIONS_MIN,
  SECTION_MAX,
  UNIT_MAX,
  apiMessages,
  comparable,
  draftToPayload,
  emptyItem,
  emptyOption,
  emptySection,
  newKey,
  parseTemplate,
  presetOptions,
  type Draft,
  type DraftItem,
  type DraftOption,
  type DraftSection,
  type ItemType,
  type OptionResult,
} from '@/lib/tc/templates';
import TemplatePreview, {
  previewFromDraft,
  startPositions,
} from './TemplatePreview';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
} from './TemplateIcons';

type Props = {
  session: TcSession;
  initial: Draft;
  // Sin templateId se crea una plantilla nueva.
  templateId?: string;
  archived?: boolean;
  notice?: string | null;
};

type View = 'edit' | 'preview';

// Para saber si hay cambios sin guardar (ignora las claves internas).
function snapshot(draft: Draft): string {
  return JSON.stringify({
    name: draft.name,
    category: draft.category,
    description: draft.description,
    sections: draft.sections.map((s) => ({
      name: s.name,
      items: s.items.map((i) => [
        i.label,
        i.type,
        i.required,
        i.unit,
        i.minValue,
        i.maxValue,
        i.helpText,
        i.type === 'CHOICE' ? i.options.map((o) => [o.label, o.result]) : [],
      ]),
    })),
  });
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted transition hover:border-line hover:bg-surface disabled:pointer-events-none disabled:opacity-30 ${
        danger ? 'hover:text-danger' : 'hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function OptionsEditor({
  item,
  position,
  disabled,
  onLabel,
  onResult,
  onAdd,
  onRemove,
  onPreset,
}: {
  item: DraftItem;
  position: number;
  disabled: boolean;
  onLabel: (optionKey: string, label: string) => void;
  onResult: (optionKey: string, result: OptionResult) => void;
  onAdd: () => void;
  onRemove: (optionKey: string) => void;
  onPreset: (presetKey: string) => void;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">
          Opciones que puede elegir el técnico
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-subtle">Usar lista:</span>
          {OPTION_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="rounded-md border border-line bg-surface px-2 py-1 font-medium text-ink-2 transition hover:border-accent hover:text-accent disabled:opacity-50"
              title={preset.options.map((o) => o.label).join(' / ')}
              onClick={() => onPreset(preset.key)}
              disabled={disabled}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {item.options.map((option, oIndex) => (
          <li
            key={option.key}
            className="flex flex-wrap items-center gap-2 border-b border-line pb-2 last:border-0 last:pb-0 sm:border-0 sm:pb-0"
          >
            <input
              id={`option-${option.key}`}
              aria-label={`Punto ${position}: opción ${oIndex + 1}`}
              className="tc-input min-w-0 flex-[1_1_10rem] bg-surface py-1.5"
              value={option.label}
              maxLength={OPTION_LABEL_MAX}
              placeholder={`Opción ${oIndex + 1}: p. ej. Obstruido`}
              onChange={(e) => onLabel(option.key, e.target.value)}
              disabled={disabled}
            />
            <div className="flex items-center gap-1">
              <select
                aria-label={`Punto ${position}: qué significa la opción ${oIndex + 1}`}
                className={`tc-input w-[8.5rem] bg-surface py-1.5 ${
                  option.result === 'ISSUE'
                    ? 'text-danger'
                    : option.result === 'OK'
                      ? 'text-success'
                      : ''
                }`}
                value={option.result}
                onChange={(e) =>
                  onResult(option.key, e.target.value as OptionResult)
                }
                disabled={disabled}
              >
                {OPTION_RESULTS.map((result) => (
                  <option key={result} value={result}>
                    {OPTION_RESULT_INFO[result].label}
                  </option>
                ))}
              </select>
              <IconButton
                label={`Quitar la opción ${oIndex + 1}`}
                onClick={() => onRemove(option.key)}
                disabled={disabled || item.options.length <= OPTIONS_MIN}
                danger
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      {item.options.length < OPTIONS_MAX ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-50"
          onClick={onAdd}
          disabled={disabled}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Añadir opción
        </button>
      ) : (
        <p className="mt-2 text-xs text-subtle">
          Máximo {OPTIONS_MAX} opciones.
        </p>
      )}
    </div>
  );
}

export default function TemplateEditor({
  session,
  initial,
  templateId,
  archived,
  notice,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  // Último estado guardado: sirve para "Descartar" y para saber si hay cambios.
  const [saved, setSaved] = useState<Draft>(initial);
  const [view, setView] = useState<View>('edit');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  // Puntos con el cuadro de instrucciones abierto aunque esté vacío.
  const [helpOpen, setHelpOpen] = useState<Set<string>>(() => new Set());

  const isNew = !templateId;
  const dirty = useMemo(
    () => snapshot(draft) !== snapshot(saved),
    [draft, saved],
  );

  const stats = useMemo(() => {
    const items = draft.sections.flatMap((s) => s.items);
    return {
      items: items.length,
      sections: draft.sections.filter(
        (s) => s.name.trim() && s.items.length > 0,
      ).length,
      required: items.filter((i) => i.required).length,
      measurements: items.filter((i) => i.type === 'NUMBER').length,
      states: items.filter((i) => i.type === 'CHOICE').length,
    };
  }, [draft]);

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!message) return;
    // Los avisos largos se quedan más tiempo para que dé tiempo a leerlos.
    const timer = window.setTimeout(
      () => setMessage(null),
      Math.max(4000, message.length * 60),
    );
    return () => window.clearTimeout(timer);
  }, [message]);

  // ---------------------------------------------------------------
  // Cambios en el borrador
  // ---------------------------------------------------------------

  function change(next: (current: Draft) => Draft) {
    setDraft(next);
    setErrors([]);
  }

  function setMeta(field: 'name' | 'category' | 'description', value: string) {
    change((d) => ({ ...d, [field]: value }));
  }

  function setSection(sectionKey: string, patch: Partial<DraftSection>) {
    change((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.key === sectionKey ? { ...s, ...patch } : s,
      ),
    }));
  }

  function setItem(
    sectionKey: string,
    itemKey: string,
    patch: Partial<DraftItem>,
  ) {
    change((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              items: s.items.map((i) =>
                i.key === itemKey ? { ...i, ...patch } : i,
              ),
            }
          : s,
      ),
    }));
  }

  function addSection() {
    change((d) => ({ ...d, sections: [...d.sections, emptySection()] }));
  }

  function moveSection(sectionKey: string, delta: -1 | 1) {
    change((d) => {
      const index = d.sections.findIndex((s) => s.key === sectionKey);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= d.sections.length) return d;
      const sections = [...d.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...d, sections };
    });
  }

  function removeSection(section: DraftSection) {
    const filled = section.items.filter((i) => i.label.trim()).length;
    if (
      filled > 0 &&
      !window.confirm(
        `¿Quitar la sección${section.name.trim() ? ` «${section.name.trim()}»` : ''} y sus ${filled} punto${filled === 1 ? '' : 's'}?`,
      )
    ) {
      return;
    }
    change((d) => {
      const sections = d.sections.filter((s) => s.key !== section.key);
      return {
        ...d,
        sections: sections.length > 0 ? sections : [emptySection()],
      };
    });
  }

  function addItem(sectionKey: string) {
    const item = emptyItem();
    change((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.key === sectionKey ? { ...s, items: [...s.items, item] } : s,
      ),
    }));
    // Lleva el foco al punto nuevo para escribir directamente.
    window.setTimeout(
      () => document.getElementById(`label-${item.key}`)?.focus(),
      0,
    );
  }

  function duplicateItem(sectionKey: string, itemKey: string) {
    change((d) => ({
      ...d,
      sections: d.sections.map((s) => {
        if (s.key !== sectionKey) return s;
        const index = s.items.findIndex((i) => i.key === itemKey);
        if (index < 0) return s;
        const original = s.items[index];
        const copy = {
          ...original,
          key: newKey('item'),
          options: original.options.map((o) => ({
            ...o,
            key: newKey('option'),
          })),
        };
        const items = [...s.items];
        items.splice(index + 1, 0, copy);
        return { ...s, items };
      }),
    }));
  }

  function removeItem(sectionKey: string, itemKey: string) {
    change((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.key === sectionKey
          ? { ...s, items: s.items.filter((i) => i.key !== itemKey) }
          : s,
      ),
    }));
  }

  // Sube o baja un punto; en el borde de una sección pasa a la sección vecina.
  function moveItem(sectionKey: string, itemKey: string, delta: -1 | 1) {
    change((d) => {
      const sIndex = d.sections.findIndex((s) => s.key === sectionKey);
      if (sIndex < 0) return d;
      const sections = d.sections.map((s) => ({ ...s, items: [...s.items] }));
      const items = sections[sIndex].items;
      const iIndex = items.findIndex((i) => i.key === itemKey);
      if (iIndex < 0) return d;

      const target = iIndex + delta;
      if (target >= 0 && target < items.length) {
        [items[iIndex], items[target]] = [items[target], items[iIndex]];
        return { ...d, sections };
      }

      const neighbour = sections[sIndex + delta];
      if (!neighbour) return d;
      const [moved] = items.splice(iIndex, 1);
      if (delta === -1) neighbour.items.push(moved);
      else neighbour.items.unshift(moved);
      return { ...d, sections };
    });
  }

  function changeType(sectionKey: string, item: DraftItem, type: ItemType) {
    // Al dejar de ser medición, la unidad y el rango ya no tienen sentido.
    const patch: Partial<DraftItem> =
      type === 'NUMBER'
        ? { type }
        : { type, unit: '', minValue: '', maxValue: '' };
    // Un Estado nuevo empieza con Bien / Mal estado / Requiere cambio.
    if (type === 'CHOICE' && item.options.length === 0) {
      patch.options = presetOptions('state');
    }
    setItem(sectionKey, item.key, patch);
  }

  // ---------------------------------------------------------------
  // Opciones de un punto de tipo Estado
  // ---------------------------------------------------------------

  function updateOptions(
    sectionKey: string,
    itemKey: string,
    update: (options: DraftOption[]) => DraftOption[],
  ) {
    change((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              items: s.items.map((i) =>
                i.key === itemKey ? { ...i, options: update(i.options) } : i,
              ),
            }
          : s,
      ),
    }));
  }

  function setOption(
    sectionKey: string,
    itemKey: string,
    optionKey: string,
    patch: Partial<DraftOption>,
  ) {
    updateOptions(sectionKey, itemKey, (options) =>
      options.map((o) => (o.key === optionKey ? { ...o, ...patch } : o)),
    );
  }

  function addOption(sectionKey: string, itemKey: string) {
    const option = emptyOption();
    updateOptions(sectionKey, itemKey, (options) =>
      options.length >= OPTIONS_MAX ? options : [...options, option],
    );
    window.setTimeout(
      () => document.getElementById(`option-${option.key}`)?.focus(),
      0,
    );
  }

  function removeOption(
    sectionKey: string,
    itemKey: string,
    optionKey: string,
  ) {
    updateOptions(sectionKey, itemKey, (options) =>
      options.filter((o) => o.key !== optionKey),
    );
  }

  function applyPreset(sectionKey: string, item: DraftItem, presetKey: string) {
    const preset = OPTION_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    const current = item.options
      .map((o) => comparable(o.label))
      .filter(Boolean)
      .join('|');
    const target = preset.options.map((o) => comparable(o.label)).join('|');
    if (
      current &&
      current !== target &&
      !window.confirm(
        `¿Cambiar las opciones por las de «${preset.label}» (${preset.options
          .map((o) => o.label)
          .join(' / ')})?`,
      )
    ) {
      return;
    }
    updateOptions(sectionKey, item.key, () => presetOptions(presetKey));
  }

  function toggleHelp(item: DraftItem, sectionKey: string) {
    const open = helpOpen.has(item.key) || item.helpText.trim() !== '';
    setHelpOpen((prev) => {
      const next = new Set(prev);
      if (open) next.delete(item.key);
      else next.add(item.key);
      return next;
    });
    if (open) setItem(sectionKey, item.key, { helpText: '' });
  }

  // ---------------------------------------------------------------
  // Guardar
  // ---------------------------------------------------------------

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const result = draftToPayload(draft);
    if (!result.ok) {
      setErrors(result.problems);
      setView('edit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      const res = isNew
        ? await tcPost<unknown>(
            session,
            '/maintenance-templates',
            result.payload,
          )
        : await tcPatch<unknown>(
            session,
            `/maintenance-templates/${templateId}`,
            result.payload,
          );

      const saved =
        res.code >= 200 && res.code < 300 ? parseTemplate(res.json) : null;
      if (!saved) {
        setErrors(apiMessages(res.json, 'No se pudo guardar la plantilla.'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSaved(draft);
      if (isNew) {
        router.replace(`/maintenance-templates/${saved.id}?creada=1`);
      } else {
        setMessage('Cambios guardados.');
      }
    } catch (err) {
      setErrors([errMsg(err)]);
    } finally {
      setSaving(false);
    }
  }

  function onDiscard() {
    if (!window.confirm('¿Descartar los cambios sin guardar?')) return;
    setDraft(saved);
    setErrors([]);
  }

  // ---------------------------------------------------------------
  // Pantalla
  // ---------------------------------------------------------------

  const offsets = startPositions(draft.sections.map((s) => s.items.length));

  return (
    <div className="tc-page max-w-5xl pb-28">
      <header className="mb-6">
        <Link
          href="/maintenance-templates"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Plantillas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="tc-title">
            {isNew
              ? 'Nueva plantilla'
              : draft.name.trim() || 'Plantilla sin nombre'}
          </h1>
          {archived ? (
            <span className="rounded-full border border-line-strong bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-muted">
              Archivada
            </span>
          ) : null}
        </div>
        <p className="tc-subtitle mt-1">
          La hoja que rellenará el técnico en cada mantenimiento de este tipo de
          equipo.
        </p>
      </header>

      {message ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {message}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <>
              <p className="font-medium">
                Revisa estos puntos antes de guardar:
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <section className="tc-panel p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">
            Datos de la plantilla
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="tpl-name"
                className="mb-1.5 block text-sm font-medium text-ink-2"
              >
                Nombre
              </label>
              <input
                id="tpl-name"
                className="tc-input"
                value={draft.name}
                maxLength={NAME_MAX}
                placeholder="Mantenimiento preventivo split"
                onChange={(e) => setMeta('name', e.target.value)}
                disabled={saving}
                autoFocus={isNew}
              />
            </div>
            <div>
              <label
                htmlFor="tpl-category"
                className="mb-1.5 block text-sm font-medium text-ink-2"
              >
                Tipo de equipo
              </label>
              <input
                id="tpl-category"
                className="tc-input"
                list="tpl-category-options"
                value={draft.category}
                maxLength={CATEGORY_MAX}
                placeholder="Elige o escribe uno"
                onChange={(e) => setMeta('category', e.target.value)}
                disabled={saving}
              />
              <datalist id="tpl-category-options">
                {EQUIPMENT_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="tpl-description"
                className="mb-1.5 block text-sm font-medium text-ink-2"
              >
                Descripción{' '}
                <span className="font-normal text-subtle">(opcional)</span>
              </label>
              <textarea
                id="tpl-description"
                className="tc-input min-h-[72px] resize-y"
                value={draft.description}
                maxLength={DESCRIPTION_MAX}
                placeholder="Para qué equipos es y cada cuánto se hace."
                onChange={(e) => setMeta('description', e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Puntos de la hoja
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {stats.items} punto{stats.items === 1 ? '' : 's'}
              {stats.sections > 0
                ? ` en ${stats.sections} sección${stats.sections === 1 ? '' : 'es'}`
                : ''}
              {stats.measurements > 0
                ? ` · ${stats.measurements} medici${stats.measurements === 1 ? 'ón' : 'ones'}`
                : ''}
              {stats.states > 0
                ? ` · ${stats.states} estado${stats.states === 1 ? '' : 's'}`
                : ''}
              {stats.required > 0
                ? ` · ${stats.required} obligatorio${stats.required === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Modo"
            className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5"
          >
            {(['edit', 'preview'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  view === v
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {v === 'edit' ? 'Editar' : 'Vista previa'}
              </button>
            ))}
          </div>
        </div>

        {view === 'preview' ? (
          <TemplatePreview sections={previewFromDraft(draft)} />
        ) : (
          <>
            {draft.sections.map((section, sIndex) => (
              <section key={section.key} className="tc-panel overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2.5 sm:px-4">
                  <input
                    aria-label="Nombre de la sección"
                    className="tc-input bg-surface font-medium"
                    value={section.name}
                    maxLength={SECTION_MAX}
                    placeholder={
                      draft.sections.length === 1
                        ? 'Sección (opcional): p. ej. Unidad exterior'
                        : 'Nombre de la sección: p. ej. Unidad interior'
                    }
                    onChange={(e) =>
                      setSection(section.key, { name: e.target.value })
                    }
                    disabled={saving}
                  />
                  <div className="flex shrink-0 items-center">
                    <IconButton
                      label="Subir sección"
                      onClick={() => moveSection(section.key, -1)}
                      disabled={saving || sIndex === 0}
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Bajar sección"
                      onClick={() => moveSection(section.key, 1)}
                      disabled={saving || sIndex === draft.sections.length - 1}
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label="Quitar sección"
                      onClick={() => removeSection(section)}
                      disabled={saving}
                      danger
                    >
                      <TrashIcon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                {section.items.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-subtle">
                    Esta sección está vacía. Añade un punto o quítala.
                  </p>
                ) : (
                  <ol className="divide-y divide-line">
                    {section.items.map((item, iIndex) => {
                      const position = offsets[sIndex] + iIndex + 1;
                      const isFirst = sIndex === 0 && iIndex === 0;
                      const isLast =
                        sIndex === draft.sections.length - 1 &&
                        iIndex === section.items.length - 1;
                      const showHelp =
                        helpOpen.has(item.key) || item.helpText.trim() !== '';

                      return (
                        <li key={item.key} className="px-3 py-4 sm:px-4">
                          <div className="flex gap-3">
                            <span className="w-6 shrink-0 pt-2.5 text-right font-mono text-xs text-subtle">
                              {position}
                            </span>

                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
                                <input
                                  id={`label-${item.key}`}
                                  aria-label={`Punto ${position}: qué hay que revisar`}
                                  className="tc-input"
                                  value={item.label}
                                  maxLength={LABEL_MAX}
                                  placeholder="Qué hay que revisar: p. ej. Limpiar filtros"
                                  onChange={(e) =>
                                    setItem(section.key, item.key, {
                                      label: e.target.value,
                                    })
                                  }
                                  disabled={saving}
                                />
                                <select
                                  aria-label={`Punto ${position}: tipo`}
                                  className="tc-input"
                                  value={item.type}
                                  onChange={(e) =>
                                    changeType(
                                      section.key,
                                      item,
                                      e.target.value as ItemType,
                                    )
                                  }
                                  disabled={saving}
                                >
                                  {ITEM_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {ITEM_TYPE_INFO[t].label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {item.type === 'NUMBER' ? (
                                <div className="grid max-w-md grid-cols-3 gap-2">
                                  {(
                                    [
                                      ['unit', 'Unidad', 'bar', UNIT_MAX],
                                      ['minValue', 'Mínimo', '—', 12],
                                      ['maxValue', 'Máximo', '—', 12],
                                    ] as const
                                  ).map(([field, label, placeholder, max]) => (
                                    <div key={field}>
                                      <label
                                        htmlFor={`${field}-${item.key}`}
                                        className="mb-1 block text-xs font-medium text-muted"
                                      >
                                        {label}
                                      </label>
                                      <input
                                        id={`${field}-${item.key}`}
                                        className="tc-input py-1.5"
                                        inputMode={
                                          field === 'unit' ? 'text' : 'decimal'
                                        }
                                        value={item[field]}
                                        maxLength={max}
                                        placeholder={placeholder}
                                        onChange={(e) =>
                                          setItem(section.key, item.key, {
                                            [field]: e.target.value,
                                          })
                                        }
                                        disabled={saving}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {item.type === 'CHOICE' ? (
                                <OptionsEditor
                                  item={item}
                                  position={position}
                                  disabled={saving}
                                  onLabel={(optionKey, label) =>
                                    setOption(
                                      section.key,
                                      item.key,
                                      optionKey,
                                      {
                                        label,
                                      },
                                    )
                                  }
                                  onResult={(optionKey, result) =>
                                    setOption(
                                      section.key,
                                      item.key,
                                      optionKey,
                                      {
                                        result,
                                      },
                                    )
                                  }
                                  onAdd={() => addOption(section.key, item.key)}
                                  onRemove={(optionKey) =>
                                    removeOption(
                                      section.key,
                                      item.key,
                                      optionKey,
                                    )
                                  }
                                  onPreset={(presetKey) =>
                                    applyPreset(section.key, item, presetKey)
                                  }
                                />
                              ) : null}

                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-line-strong accent-accent"
                                    checked={item.required}
                                    onChange={(e) =>
                                      setItem(section.key, item.key, {
                                        required: e.target.checked,
                                      })
                                    }
                                    disabled={saving}
                                  />
                                  Obligatorio
                                </label>
                                <button
                                  type="button"
                                  className="text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                                  onClick={() => toggleHelp(item, section.key)}
                                  disabled={saving}
                                >
                                  {showHelp
                                    ? 'Quitar instrucciones'
                                    : '+ Instrucciones para el técnico'}
                                </button>
                                <span className="text-xs text-subtle">
                                  {ITEM_TYPE_INFO[item.type].hint}
                                </span>
                              </div>

                              {showHelp ? (
                                <textarea
                                  aria-label={`Punto ${position}: instrucciones para el técnico`}
                                  className="tc-input min-h-[60px] resize-y text-sm"
                                  value={item.helpText}
                                  maxLength={HELP_MAX}
                                  placeholder="Cómo hacerlo o qué mirar: p. ej. Medir con el equipo 10 min en frío."
                                  onChange={(e) =>
                                    setItem(section.key, item.key, {
                                      helpText: e.target.value,
                                    })
                                  }
                                  disabled={saving}
                                />
                              ) : null}
                            </div>

                            <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row sm:items-start sm:pt-1">
                              <IconButton
                                label="Subir punto"
                                onClick={() =>
                                  moveItem(section.key, item.key, -1)
                                }
                                disabled={saving || isFirst}
                              >
                                <ArrowUpIcon className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label="Bajar punto"
                                onClick={() =>
                                  moveItem(section.key, item.key, 1)
                                }
                                disabled={saving || isLast}
                              >
                                <ArrowDownIcon className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label="Duplicar punto"
                                onClick={() =>
                                  duplicateItem(section.key, item.key)
                                }
                                disabled={saving}
                              >
                                <CopyIcon className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label="Quitar punto"
                                onClick={() =>
                                  removeItem(section.key, item.key)
                                }
                                disabled={saving}
                                danger
                              >
                                <TrashIcon className="h-4 w-4" />
                              </IconButton>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <div className="border-t border-line px-3 py-2.5 sm:px-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-50"
                    onClick={() => addItem(section.key)}
                    disabled={saving}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Añadir punto
                  </button>
                </div>
              </section>
            ))}

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm font-medium text-muted transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
              onClick={addSection}
              disabled={saving}
            >
              <PlusIcon className="h-4 w-4" />
              Añadir sección
            </button>
          </>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 backdrop-blur xl:left-[280px]">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-3 md:px-6 lg:px-8">
            {dirty ? (
              <span className="mr-auto text-sm text-muted">
                Tienes cambios sin guardar.
              </span>
            ) : null}
            {!isNew ? (
              <button
                type="button"
                className="tc-button"
                disabled={!dirty || saving}
                onClick={onDiscard}
              >
                Descartar
              </button>
            ) : (
              <Link href="/maintenance-templates" className="tc-button">
                Cancelar
              </Link>
            )}
            <button
              type="submit"
              className="tc-button-primary"
              disabled={saving || (!isNew && !dirty)}
            >
              {saving
                ? 'Guardando…'
                : isNew
                  ? 'Crear plantilla'
                  : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}