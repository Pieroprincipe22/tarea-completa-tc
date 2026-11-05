'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { errMsg, tcGet } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  STOP_TONE_INFO,
  formatDay,
  formatMoment,
  parseAssetHistory,
  stopTone,
  type AssetHistory as History,
  type HistoryEntry,
} from '@/lib/tc/rounds';
import type { TcSession } from '@/lib/tc/session';

const REPORT_STATUS: Record<string, string> = {
  DRAFT: 'Borrador',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En curso',
  SUBMITTED: 'Enviado',
  COMPLETED: 'Completado',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(
    value,
  );
}

function RoundEntry({
  entry,
}: {
  entry: Extract<HistoryEntry, { kind: 'ROUND' }>;
}) {
  const tone = stopTone(entry);
  const info = STOP_TONE_INFO[tone];
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/rounds/${entry.roundId}`}
            className="text-sm font-medium text-ink hover:text-accent"
          >
            Ronda {entry.code ?? ''}
          </Link>
          <p className="text-xs text-muted">
            {entry.status === 'PENDING'
              ? `Prevista para el ${formatDay(entry.date?.slice(0, 10))}`
              : formatMoment(entry.date)}
            {entry.doneBy ? ` · ${entry.doneBy.name}` : ''}
            {entry.place ? ` · ${entry.place}` : ''}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${info.chip}`}
        >
          {info.label}
        </span>
      </div>
      {entry.status === 'NO_ACCESS' && entry.noAccessReason ? (
        <p className="mt-1 text-xs text-warning">{entry.noAccessReason}</p>
      ) : null}
      {entry.measurements.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {entry.measurements.map((m, index) => (
            <li
              key={index}
              className={`rounded-md border px-2 py-0.5 text-xs ${
                m.outOfRange
                  ? 'border-danger/30 bg-danger-soft text-danger'
                  : 'border-line bg-surface-2 text-ink-2'
              }`}
            >
              {m.label}: {formatNumber(m.value)}
              {m.unit ? ` ${m.unit}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      {entry.problems.length > 0 ? (
        <ul className="mt-2 space-y-0.5">
          {entry.problems.map((problem, index) => (
            <li key={index} className="text-sm text-ink-2">
              <span className={problem.failed ? 'text-danger' : ''}>
                {problem.label}
              </span>
              {problem.value ? `: ${problem.value}` : ''}
              {problem.notes ? (
                <span className="text-muted"> · {problem.notes}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Lo que se le ha hecho a un equipo: sus rondas (con las medidas y las
 * incidencias de cada una), sus partes sueltos y el plan en el que está.
 */
export default function AssetHistory({
  session,
  assetId,
}: {
  session: TcSession;
  assetId: string;
}) {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await tcGet<unknown>(session, `/assets/${assetId}/history`);
        if (cancelled) return;
        const parsed =
          res.code >= 200 && res.code < 300
            ? parseAssetHistory(res.json)
            : null;
        if (!parsed) {
          setError(apiError(res.json, 'No se pudo cargar el historial.'));
          return;
        }
        setHistory(parsed);
      } catch (err) {
        if (!cancelled) setError(errMsg(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, assetId]);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line bg-surface-2 px-5 py-4">
        <h2 className="text-lg font-bold text-ink">
          Historial de mantenimiento
        </h2>
        {history && history.plans.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {history.plans.map((plan) => (
              <li key={plan.id} className="text-sm text-muted">
                En el plan «{plan.name}»
                {plan.name.toLowerCase().includes(plan.frequency.toLowerCase())
                  ? ''
                  : ` · ${plan.frequency.toLowerCase()}`}{' '}
                · próxima ronda el {formatDay(plan.nextDueOn)}
              </li>
            ))}
          </ul>
        ) : history ? (
          <p className="mt-1 text-sm text-muted">
            Este equipo no está en ningún plan preventivo.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="px-5 py-4 text-sm text-danger">{error}</p>
      ) : !history ? (
        <p className="px-5 py-4 text-sm text-muted">Cargando…</p>
      ) : history.entries.length === 0 ? (
        <p className="px-5 py-4 text-sm text-subtle">
          Todavía no se le ha hecho ningún mantenimiento.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {history.entries.map((entry) =>
            entry.kind === 'ROUND' ? (
              <RoundEntry key={`r-${entry.id}`} entry={entry} />
            ) : (
              <li
                key={`p-${entry.id}`}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/maintenance-reports/${entry.reportId}`}
                    className="text-sm font-medium text-ink hover:text-accent"
                  >
                    {entry.title}
                  </Link>
                  <p className="text-xs text-muted">
                    Parte {entry.code ?? ''} · {formatMoment(entry.date)}
                  </p>
                </div>
                <span className="inline-flex shrink-0 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
                  {REPORT_STATUS[entry.status] ?? entry.status}
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}