'use client';

import { type ReactNode, useEffect } from 'react';
import {
  ROUND_STATUS_INFO,
  STOP_TONE_INFO,
  progressPercent,
  type RoundStatus,
  type StopCounts,
  type StopTone,
} from '@/lib/tc/rounds';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rounds-dialog-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-line bg-surface p-5 shadow-xl sm:rounded-xl sm:p-6"
      >
        <h2
          id="rounds-dialog-title"
          className="mb-4 text-base font-semibold text-ink"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  const info = ROUND_STATUS_INFO[status];
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${info.className}`}
    >
      {info.label}
    </span>
  );
}

/**
 * Barra de progreso de una ronda: verde lo hecho (rojo si tuvo
 * incidencia), naranja lo que no se pudo hacer, gris lo pendiente.
 */
export function ProgressBar({
  counts,
  className = '',
}: {
  counts: StopCounts;
  className?: string;
}) {
  const total = Math.max(counts.total, 1);
  const issues = Math.min(counts.issues, counts.done + counts.noAccess);
  const doneOk = Math.max(counts.done - issues, 0);
  const parts: { tone: StopTone; value: number }[] = [
    { tone: 'done', value: doneOk },
    { tone: 'issue', value: issues },
    { tone: 'noAccess', value: counts.noAccess },
  ];

  return (
    <div
      className={`flex h-2 w-full overflow-hidden rounded-full bg-surface-3 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercent(counts)}
      aria-label={`${counts.done} de ${counts.total} hechas`}
    >
      {parts.map((part) =>
        part.value > 0 ? (
          <span
            key={part.tone}
            className={STOP_TONE_INFO[part.tone].dot}
            style={{ width: `${(part.value / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

// "87 de 166 hechas · 3 sin acceso · 2 con incidencia"
export function countsSummary(counts: StopCounts): string {
  const parts = [`${counts.done} de ${counts.total} hechas`];
  if (counts.noAccess > 0) parts.push(`${counts.noAccess} sin acceso`);
  if (counts.issues > 0)
    parts.push(
      `${counts.issues} con incidencia${counts.issues === 1 ? '' : 's'}`,
    );
  return parts.join(' · ');
}

export function StopLegend() {
  const tones: StopTone[] = ['done', 'issue', 'noAccess', 'pending'];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {tones.map((tone) => (
        <li key={tone} className="inline-flex items-center gap-1.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${STOP_TONE_INFO[tone].dot}`}
            aria-hidden
          />
          {STOP_TONE_INFO[tone].label}
        </li>
      ))}
    </ul>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
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