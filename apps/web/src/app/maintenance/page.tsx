'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorBox } from '@/components/rounds/RoundsUi';
import { errMsg, tcGet } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  parseMaintenanceList,
  plural,
  type MaintenanceRow,
} from '@/lib/tc/maintenance';
import { formatDay } from '@/lib/tc/rounds';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';

function RoundsLine({ rounds }: { rounds: MaintenanceRow['rounds'] }) {
  const parts = [
    rounds.submitted > 0 ? (
      <span key="s" className="font-medium text-special">
        {plural(rounds.submitted, 'ronda por revisar', 'rondas por revisar')}
      </span>
    ) : null,
    rounds.inProgress > 0 ? (
      <span key="p">
        {plural(rounds.inProgress, 'ronda en curso', 'rondas en curso')}
      </span>
    ) : null,
    rounds.open > 0 ? (
      <span key="o">
        {plural(rounds.open, 'ronda sin empezar', 'rondas sin empezar')}
      </span>
    ) : null,
  ].filter(Boolean);

  if (parts.length === 0) return <span>Ninguna ronda pendiente</span>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? ' · ' : ''}
          {part}
        </span>
      ))}
    </>
  );
}

function HotelCard({ row }: { row: MaintenanceRow }) {
  return (
    <article className="tc-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{row.site.name}</h2>
          <p className="text-sm text-muted">
            {[row.customer?.name, row.site.city].filter(Boolean).join(' · ')}
            {row.rooms > 0
              ? ` · ${plural(row.rooms, 'habitación', 'habitaciones')}`
              : ''}
            {` · ${plural(row.machines, 'máquina', 'máquinas')}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/sites/${row.site.id}/plan`}
            className="tc-button-primary px-3 py-1.5 text-sm"
          >
            Plan y rondas
          </Link>
          <Link
            href={`/maintenance/new?siteId=${encodeURIComponent(row.site.id)}`}
            className="tc-button px-3 py-1.5 text-sm"
          >
            Añadir máquinas o planes
          </Link>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
        {row.plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="min-w-0">
              <span className="font-medium text-ink">{plan.category}</span>{' '}
              <span className="text-muted">· {plan.frequency}</span>
              {!plan.isActive ? (
                <span className="ml-2 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                  En pausa
                </span>
              ) : null}
              {plan.lastError ? (
                <span className="block text-xs text-danger">
                  {plan.lastError}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-muted">
              {plan.isActive ? `Próxima: ${formatDay(plan.nextDueOn)}` : '—'}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-muted">
        <RoundsLine rounds={row.rounds} />
      </p>
    </article>
  );
}

export default function MaintenancePage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [rows, setRows] = useState<MaintenanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!session || !isAdminRole(session.role)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await tcGet<unknown>(session, '/maintenance');
        if (cancelled) return;
        if (res.code < 200 || res.code >= 300) {
          setError(
            apiError(res.json, 'No se pudieron cargar los mantenimientos.'),
          );
          return;
        }
        setRows(parseMaintenanceList(res.json));
      } catch (err) {
        if (!cancelled) setError(errMsg(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!ready) {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-muted">Tu sesión ha caducado.</p>
          <Link href="/login" className="tc-button-primary mt-4">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdminRole(session.role)) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-muted">
            Tus rondas están en tu panel, en «Mis órdenes».
          </p>
          <Link
            href="/technician/dashboard/work-orders"
            className="tc-button mt-4"
          >
            Ir a mis órdenes
          </Link>
        </div>
      </div>
    );
  }

  const withPlans = (rows ?? []).filter((r) => r.plans.length > 0);
  const without = (rows ?? []).filter((r) => r.plans.length === 0);

  return (
    <div className="tc-page max-w-5xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="tc-title">Mantenimientos</h1>
          <p className="tc-subtitle mt-1 max-w-2xl">
            Los hoteles con mantenimiento preventivo y cómo van sus rondas.
          </p>
        </div>
        <Link href="/maintenance/new" className="tc-button-primary sm:shrink-0">
          Preparar un mantenimiento
        </Link>
      </header>

      <ErrorBox message={error} />

      {rows === null && !error ? (
        <p className="text-sm text-muted">Cargando mantenimientos…</p>
      ) : null}

      {rows !== null && rows.length === 0 ? (
        <div className="tc-panel p-6 sm:p-8">
          <h2 className="text-base font-semibold text-ink">
            Empieza por el cliente
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Da de alta el cliente y su hotel. Después, en un par de minutos,
            preparas su mantenimiento: habitaciones, máquinas, qué se revisa y
            cada cuánto.
          </p>
          <Link href="/customers/new" className="tc-button-primary mt-4">
            Dar de alta cliente y hotel
          </Link>
        </div>
      ) : null}

      {withPlans.length > 0 ? (
        <div className="flex flex-col gap-4">
          {withPlans.map((row) => (
            <HotelCard key={row.site.id} row={row} />
          ))}
        </div>
      ) : null}

      {without.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Hoteles sin mantenimiento
          </h2>
          <ul className="tc-panel mt-3 divide-y divide-line">
            {without.map((row) => (
              <li
                key={row.site.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-ink">
                    {row.site.name}
                  </span>
                  <span className="block text-sm text-muted">
                    {[row.customer?.name, row.site.city]
                      .filter(Boolean)
                      .join(' · ')}
                    {row.machines > 0
                      ? ` · ${plural(row.machines, 'máquina', 'máquinas')}`
                      : ''}
                  </span>
                </span>
                <Link
                  href={`/maintenance/new?siteId=${encodeURIComponent(row.site.id)}`}
                  className="tc-button px-3 py-1.5 text-sm sm:shrink-0"
                >
                  Preparar
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}