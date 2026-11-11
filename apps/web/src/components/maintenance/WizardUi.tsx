'use client';

import type { ReactNode } from 'react';

/** Piezas comunes de los pasos del asistente de mantenimiento. */

export type WizardStepKey =
  | 'building'
  | 'machines'
  | 'sheets'
  | 'plans'
  | 'summary';

export const WIZARD_STEPS: { key: WizardStepKey; title: string }[] = [
  { key: 'building', title: 'Edificio' },
  { key: 'machines', title: 'Máquinas' },
  { key: 'sheets', title: 'Qué se revisa' },
  { key: 'plans', title: 'Cuándo y quién' },
  { key: 'summary', title: 'Resumen' },
];

export function Stepper({
  current,
  reached,
  onGo,
}: {
  current: WizardStepKey;
  // Hasta qué paso se ha llegado: a esos se puede volver con un clic.
  reached: number;
  onGo: (step: WizardStepKey) => void;
}) {
  const index = WIZARD_STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Pasos" className="mb-6">
      <p className="text-sm font-medium text-muted sm:hidden">
        Paso {index + 1} de {WIZARD_STEPS.length} ·{' '}
        <span className="text-ink">{WIZARD_STEPS[index].title}</span>
      </p>
      <ol className="hidden gap-2 sm:flex">
        {WIZARD_STEPS.map((step, i) => {
          const active = i === index;
          const done = i < index;
          const canGo = i <= reached && !active;
          return (
            <li key={step.key} className="flex-1">
              <button
                type="button"
                onClick={() => canGo && onGo(step.key)}
                disabled={!canGo}
                aria-current={active ? 'step' : undefined}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'border-accent bg-accent-soft text-ink'
                    : done
                      ? 'border-line bg-surface text-ink-2 hover:bg-surface-2'
                      : 'border-line bg-surface text-subtle'
                } disabled:cursor-default`}
              >
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? 'bg-accent text-white'
                      : done
                        ? 'bg-success-soft text-success'
                        : 'bg-surface-3 text-muted'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="truncate font-medium">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Card({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`tc-panel p-5 sm:p-6 ${className ?? ''}`}>
      {title || right ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold text-ink">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      ) : null}
      {children ? (
        <div className={title || right ? 'mt-4' : ''}>{children}</div>
      ) : null}
    </section>
  );
}

/** − 3 + para cantidades pequeñas. */
export function Counter({
  value,
  onChange,
  min = 0,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  label: string;
}) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={`Menos ${label}`}
        className="h-9 w-9 text-lg text-ink-2 transition hover:bg-surface-2 disabled:text-subtle"
      >
        −
      </button>
      <input
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const n = Number.parseInt(
            e.target.value.replace(/\D/g, '') || '0',
            10,
          );
          set(Number.isNaN(n) ? min : n);
        }}
        aria-label={label}
        className="h-9 w-12 border-x border-line bg-surface text-center text-sm font-semibold text-ink outline-none focus:bg-accent-soft"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label={`Más ${label}`}
        className="h-9 w-9 text-lg text-ink-2 transition hover:bg-surface-2 disabled:text-subtle"
      >
        +
      </button>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? 'border-accent bg-accent-soft font-medium text-accent'
          : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
      } disabled:cursor-default disabled:opacity-80`}
    >
      {active ? <span aria-hidden>✓</span> : null}
      {children}
    </button>
  );
}

export function StepFooter({
  onBack,
  onNext,
  nextLabel = 'Siguiente',
  busy,
  problem,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy?: boolean;
  problem?: string | null;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {problem ? (
        <div
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-ink"
        >
          {problem}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="tc-button"
            disabled={busy}
          >
            Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onNext}
          className="tc-button-primary"
          disabled={busy}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}