'use client';

import { TechnicianPicker } from '@/components/rounds/RoundsUi';
import { Card } from '@/components/maintenance/WizardUi';
import {
  frequencyKey,
  keyOf,
  plural,
  type PlanDraft,
  type SetupContext,
} from '@/lib/tc/maintenance';
import {
  EVERY_MAX,
  FREQUENCY_PRESETS,
  LEAD_DAYS_DEFAULT,
  formatDay,
  minusDays,
  type PlanUnit,
} from '@/lib/tc/rounds';

/** Paso 4: cada cuánto se revisa cada tipo de máquina y quién va. */
export default function PlansStep({
  context,
  categories,
  counts,
  plans,
  viewerId,
  onPlan,
  onCopyToAll,
}: {
  context: SetupContext;
  categories: string[];
  counts: Record<string, number>;
  plans: Record<string, PlanDraft>;
  viewerId: string | null;
  onPlan: (key: string, plan: PlanDraft) => void;
  onCopyToAll: (from: PlanDraft) => void;
}) {
  const included = categories
    .map((category) => plans[keyOf(category)])
    .filter((plan): plan is PlanDraft => Boolean(plan?.include));

  const technicians = context.team.map((member) => ({
    userId: member.userId,
    name: member.userId === viewerId ? `${member.name} (tú)` : member.name,
  }));

  if (included.length === 0) {
    return (
      <Card
        title="Ninguna máquina entra en el mantenimiento"
        subtitle="Vuelve al paso anterior y marca las que se revisan. Si solo querías dar de alta el edificio y las máquinas, sigue al resumen."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {included.map((plan, index) => {
        const key = keyOf(plan.category);
        const set = (patch: Partial<PlanDraft>) =>
          onPlan(key, { ...plan, ...patch });
        const createsOn = minusDays(plan.startsOn, LEAD_DAYS_DEFAULT);

        function choosePreset(value: string) {
          const preset = FREQUENCY_PRESETS.find((p) => p.key === value);
          set(
            preset
              ? {
                  frequency: value,
                  every: String(preset.every),
                  unit: preset.unit,
                }
              : { frequency: 'CUSTOM' },
          );
        }

        return (
          <article key={key} className="tc-panel p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {plan.category}
                </h2>
                {counts[key] ? (
                  <p className="text-sm text-muted">
                    {plural(counts[key], 'máquina', 'máquinas')} en cada ronda
                  </p>
                ) : null}
              </div>
              {index === 0 && included.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onCopyToAll(plan)}
                  className="tc-button px-3 py-1.5 text-xs"
                >
                  Usar lo mismo para todas
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-2">
                  Cada cuánto
                </span>
                <select
                  value={
                    plan.frequency === 'CUSTOM'
                      ? 'CUSTOM'
                      : frequencyKey(plan.every, plan.unit)
                  }
                  onChange={(e) => choosePreset(e.target.value)}
                  className="tc-input"
                >
                  {FREQUENCY_PRESETS.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                  <option value="CUSTOM">Otra…</option>
                </select>
                {plan.frequency === 'CUSTOM' ? (
                  <span className="mt-1 flex items-center gap-2 text-sm text-ink-2">
                    Cada
                    <input
                      inputMode="numeric"
                      value={plan.every}
                      onChange={(e) =>
                        set({ every: e.target.value.replace(/[^\d]/g, '') })
                      }
                      aria-label="Cada cuántas"
                      className="tc-input w-20"
                    />
                    <select
                      value={plan.unit}
                      onChange={(e) =>
                        set({ unit: e.target.value as PlanUnit })
                      }
                      aria-label="Semanas o meses"
                      className="tc-input w-auto"
                    >
                      <option value="WEEK">semanas</option>
                      <option value="MONTH">meses</option>
                    </select>
                    <span className="text-xs text-muted">
                      (máx. {EVERY_MAX[plan.unit]})
                    </span>
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-2">
                  Primera ronda
                </span>
                <input
                  type="date"
                  value={plan.startsOn}
                  onChange={(e) => set({ startsOn: e.target.value })}
                  className="tc-input"
                />
                <span className="text-xs text-muted">
                  {plan.startsOn && createsOn <= context.today
                    ? 'Se crea en cuanto termines y les llega ya a los técnicos.'
                    : plan.startsOn
                      ? `Se crea sola el ${formatDay(createsOn)}, una semana antes.`
                      : ''}
                </span>
              </label>
            </div>

            <div className="mt-4">
              <TechnicianPicker
                technicians={technicians}
                selected={plan.technicianIds}
                onChange={(ids) => set({ technicianIds: ids })}
                legend="Quién va"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}