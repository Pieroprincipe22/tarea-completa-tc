'use client';

import Link from 'next/link';
import { Card } from '@/components/maintenance/WizardUi';
import { plural, type SetupResult } from '@/lib/tc/maintenance';
import { formatDay, namesList } from '@/lib/tc/rounds';

function BuildingLine({ result }: { result: SetupResult }) {
  const b = result.building;
  const added = [
    b.floorsAdded > 0 ? plural(b.floorsAdded, 'planta', 'plantas') : null,
    b.roomsAdded > 0
      ? plural(b.roomsAdded, 'habitación', 'habitaciones')
      : null,
    b.zonesAdded > 0
      ? plural(b.zonesAdded, 'zona común', 'zonas comunes')
      : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <p className="text-sm text-ink-2">
      {added.length > 0
        ? `Se añaden ${namesList(added.map((name) => ({ id: name, name })))}. `
        : 'El edificio se queda como está. '}
      <span className="text-muted">
        Quedará con {plural(b.floors, 'planta', 'plantas')},{' '}
        {plural(b.rooms, 'habitación', 'habitaciones')} y{' '}
        {plural(b.zones, 'zona común', 'zonas comunes')}.
      </span>
    </p>
  );
}

/** Paso 5: lo que se va a crear, contado por el servidor antes de guardar. */
export function SummaryStep({ result }: { result: SetupResult }) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="Edificio">
        <BuildingLine result={result} />
      </Card>

      <Card
        title="Máquinas"
        subtitle={
          result.machinesAdded > 0
            ? `Se dan de alta ${plural(result.machinesAdded, 'máquina', 'máquinas')}, cada una en su habitación o zona.`
            : 'No se añade ninguna máquina.'
        }
      >
        {result.machines.length > 0 ? (
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th className="!text-right">Ya había</th>
                  <th className="!text-right">Se añaden</th>
                </tr>
              </thead>
              <tbody>
                {result.machines.map((m) => (
                  <tr key={m.category}>
                    <td>{m.category}</td>
                    <td className="text-right tabular-nums text-muted">
                      {m.existing}
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {m.adding}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card
        title="Mantenimiento preventivo"
        subtitle={
          result.plans.length > 0
            ? 'Cada ronda se crea sola una semana antes de su fecha y les aparece a los técnicos en el móvil.'
            : 'No se crea ningún plan.'
        }
      >
        {result.plans.length > 0 ? (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {result.plans.map((plan) => (
              <li key={plan.category} className="px-4 py-3">
                <p className="font-medium text-ink">{plan.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  Primera ronda el {formatDay(plan.startsOn)} · Hoja «
                  {plan.template.name}»{plan.template.isNew ? ' (nueva)' : ''}
                </p>
                <p
                  className={`mt-0.5 text-sm ${plan.technicians.length > 0 ? 'text-ink-2' : 'text-warning'}`}
                >
                  {plan.technicians.length > 0
                    ? `Van: ${namesList(plan.technicians)}`
                    : 'Sin técnicos: la ronda quedará sin asignar hasta que elijas a alguien.'}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

/** Lo que se ve al terminar. */
export function DonePanel({ result }: { result: SetupResult }) {
  const created = result.plans.filter((p) => p.roundsCreated > 0);

  return (
    <div className="tc-panel p-6 sm:p-8">
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-lg font-semibold text-success"
      >
        ✓
      </span>
      <h1 className="tc-title mt-4">
        {result.site.name} ya tiene su mantenimiento
      </h1>
      <p className="tc-subtitle mt-2 max-w-2xl">
        {result.machinesAdded > 0
          ? `Se han dado de alta ${plural(result.machinesAdded, 'máquina', 'máquinas')}. `
          : ''}
        {created.length > 0
          ? 'Las rondas que ya tocaban están creadas y les han llegado a los técnicos.'
          : 'Las rondas se crearán solas una semana antes de cada fecha.'}
      </p>

      {result.plans.length > 0 ? (
        <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
          {result.plans.map((plan) => (
            <li key={plan.category} className="px-4 py-3 text-sm">
              <p className="font-medium text-ink">{plan.name}</p>
              <p className="mt-0.5 text-muted">
                {plan.lastError
                  ? plan.lastError
                  : plan.roundsCreated > 0
                    ? `Primera ronda creada${plan.nextDueOn ? ` · la siguiente, el ${formatDay(plan.nextDueOn)}` : ''}`
                    : `Primera ronda el ${formatDay(plan.nextDueOn ?? plan.startsOn)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/sites/${result.site.id}/plan`}
          className="tc-button-primary"
        >
          Ver el plan y las rondas
        </Link>
        <Link href="/maintenance" className="tc-button">
          Ir a Mantenimientos
        </Link>
      </div>
    </div>
  );
}