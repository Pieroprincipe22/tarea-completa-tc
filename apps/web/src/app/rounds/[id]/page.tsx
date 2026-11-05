'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  RoundFloorSection,
  StopDrawer,
  matchesFilter,
  type StopFilter,
} from '@/components/rounds/RoundFloors';
import {
  ErrorBox,
  Modal,
  ProgressBar,
  RoundStatusBadge,
  StopLegend,
  countsSummary,
} from '@/components/rounds/RoundsUi';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import { errMsg, tcGet, tcPost } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  CLOSE_NOTE_MAX,
  STOP_TONE_INFO,
  formatDay,
  formatMoment,
  parseRound,
  progressPercent,
  type RoundView,
  type StopView,
} from '@/lib/tc/rounds';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: RoundView }
  | { status: 'error'; error: string };

const FILTERS: { key: StopFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'noAccess', label: 'Sin acceso' },
  { key: 'issue', label: 'Con incidencia' },
  { key: 'done', label: 'Hechas' },
];

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'issue' | 'noAccess';
}) {
  const color =
    tone === 'issue'
      ? 'text-danger'
      : tone === 'noAccess'
        ? 'text-warning'
        : 'text-ink';
  return (
    <div className="tc-panel px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold sm:text-2xl ${color}`}>
        {value}
      </p>
    </div>
  );
}

function CloseForm({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: number;
  onSubmit: (note: string | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const problem = await onSubmit(note.trim() || null);
    setSaving(false);
    setError(problem);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {pending > 0 ? (
        <p className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Quedan {pending} equipo{pending === 1 ? '' : 's'} sin hacer. Saldrán
          como pendientes en el informe de la ronda.
        </p>
      ) : (
        <p className="text-sm text-muted">Están todos los equipos revisados.</p>
      )}
      <div>
        <label
          htmlFor="close-note"
          className="mb-1.5 block text-sm font-medium text-ink-2"
        >
          Nota <span className="font-normal text-subtle">(opcional)</span>
        </label>
        <textarea
          id="close-note"
          className="tc-input min-h-[5rem]"
          value={note}
          maxLength={CLOSE_NOTE_MAX}
          placeholder="Habitaciones 303 y 512 ocupadas toda la semana."
          onChange={(e) => setNote(e.target.value)}
          disabled={saving}
        />
      </div>
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
          {saving ? 'Cerrando…' : 'Cerrar ronda'}
        </button>
      </div>
    </form>
  );
}

export default function RoundPage() {
  const params = useParams<{ id: string }>();
  const roundId = String(params?.id ?? '');

  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [filter, setFilter] = useState<StopFilter>('all');
  const [search, setSearch] = useState('');
  const [openStop, setOpenStop] = useState<StopView | null>(null);
  const [closing, setClosing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit = isAdminRole(session?.role);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!session || !roundId) return;
    try {
      const res = await tcGet<unknown>(session, `/rounds/${roundId}`);
      const data =
        res.code >= 200 && res.code < 300 ? parseRound(res.json) : null;
      if (!data) {
        setState({
          status: 'error',
          error:
            res.code === 404
              ? 'Esta ronda no existe o es de otra empresa.'
              : apiError(res.json, 'No se pudo cargar la ronda.'),
        });
        return;
      }
      setState({ status: 'ok', data });
    } catch (err) {
      setState({ status: 'error', error: errMsg(err) });
    }
  }, [session, roundId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Cierra, reabre o cancela. Devuelve el error, si lo hay.
  async function change(
    action: 'close' | 'reopen' | 'cancel',
    body: object,
    okMessage: string,
  ): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await tcPost<unknown>(
        session,
        `/rounds/${roundId}/${action}`,
        body,
      );
      const data =
        res.code >= 200 && res.code < 300 ? parseRound(res.json) : null;
      if (!data) return apiError(res.json, 'No se pudo cambiar la ronda.');
      setState({ status: 'ok', data });
      setNotice(okMessage);
      return null;
    } catch (err) {
      return errMsg(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSimpleChange(action: 'reopen' | 'cancel') {
    if (
      action === 'cancel' &&
      !window.confirm(
        '¿Cancelar la ronda?\n\nNo se borra nada: lo ya revisado se queda y se puede reabrir.',
      )
    ) {
      return;
    }
    const problem = await change(
      action,
      {},
      action === 'reopen' ? 'Ronda reabierta.' : 'Ronda cancelada.',
    );
    if (problem) setError(problem);
  }

  if (!ready || state.status === 'loading') {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando la ronda…</p>
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

  if (state.status === 'error') {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-danger">{state.error}</p>
          <Link
            href={canEdit ? '/work-orders' : '/technician/dashboard'}
            className="tc-button mt-4"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  const round = state.data;
  const counts = round.counts;
  const open = round.status === 'OPEN' || round.status === 'IN_PROGRESS';
  const query = search.trim().toLowerCase();
  const visibleCount = round.floors
    .flatMap((f) => f.stops)
    .filter(
      (s) =>
        matchesFilter(s, filter) &&
        (!query || `${s.label} ${s.assetName}`.toLowerCase().includes(query)),
    ).length;

  return (
    <div className="tc-page max-w-6xl">
      <header className="mb-6">
        <Link
          href={
            canEdit ? `/sites/${round.site.id}/plan` : '/technician/dashboard'
          }
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {canEdit ? `Plan preventivo · ${round.site.name}` : 'Mis órdenes'}
        </Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="tc-title">
                Preventivo {round.category} · {round.site.name}
              </h1>
              <RoundStatusBadge status={round.status} />
            </div>
            <p className="tc-subtitle mt-1">
              {formatDay(round.dueOn)}
              {round.workOrder.code ? ` · ${round.workOrder.code}` : ''}
              {round.site.customerName ? ` · ${round.site.customerName}` : ''}
              {` · ${round.technician ? round.technician.name : 'Sin técnico'}`}
            </p>
            <p className="mt-1 text-sm text-muted">
              {round.template ? `Hoja «${round.template.name}»` : 'Sin hoja'}
              {round.plan ? ` · ${round.plan.frequency}` : ' · Ronda suelta'}
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
              <Link
                href={`/work-orders/${round.workOrder.id}`}
                className="tc-button"
              >
                Ver la orden
              </Link>
              {open ? (
                <>
                  <button
                    type="button"
                    className="tc-button text-danger"
                    onClick={() => void onSimpleChange('cancel')}
                    disabled={busy}
                  >
                    Cancelar ronda
                  </button>
                  <button
                    type="button"
                    className="tc-button-primary"
                    onClick={() => setClosing(true)}
                    disabled={busy}
                  >
                    Cerrar ronda
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="tc-button-primary"
                  onClick={() => void onSimpleChange('reopen')}
                  disabled={busy}
                >
                  Reabrir ronda
                </button>
              )}
            </div>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      {round.status === 'DONE' && round.closedAt ? (
        <div className="mb-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
          Cerrada el {formatMoment(round.closedAt)}
          {round.closedBy ? ` por ${round.closedBy.name}` : ''}.
          {round.closeNote ? (
            <span className="mt-1 block text-muted">{round.closeNote}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hechas" value={`${counts.done} de ${counts.total}`} />
        <Stat label="Pendientes" value={String(counts.pending)} />
        <Stat
          label="Sin acceso"
          value={String(counts.noAccess)}
          tone={counts.noAccess > 0 ? 'noAccess' : undefined}
        />
        <Stat
          label="Con incidencia"
          value={String(counts.issues)}
          tone={counts.issues > 0 ? 'issue' : undefined}
        />
      </div>
      <div className="mb-6">
        <ProgressBar counts={counts} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {progressPercent(counts)} % · {countsSummary(counts)}
          </p>
          <StopLegend />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrar habitaciones"
        >
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === option.key
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-surface text-ink-2 hover:bg-surface-2'
              }`}
            >
              {option.key !== 'all' ? (
                <span
                  className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STOP_TONE_INFO[option.key].dot}`}
                  aria-hidden
                />
              ) : null}
              {option.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Buscar habitación o equipo"
          className="tc-input sm:max-w-xs"
          placeholder="Buscar habitación o equipo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {visibleCount === 0 ? (
        <div className="tc-panel p-6 text-sm text-muted">
          No hay equipos con este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {round.floors.map((floor, index) => (
            <RoundFloorSection
              key={`${floor.level ?? 'sin'}-${index}`}
              floor={floor}
              filter={filter}
              query={query}
              onOpen={setOpenStop}
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="tc-panel overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Incidencias ({round.incidents.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Lo que anotó el técnico. Sale también en el informe.
            </p>
          </div>
          {round.incidents.length === 0 ? (
            <p className="px-4 py-4 text-sm text-subtle">
              Sin incidencias por ahora.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {round.incidents.map((incident) => (
                <li key={incident.stopId} className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-ink hover:text-accent"
                    onClick={() => {
                      const stop = round.floors
                        .flatMap((f) => f.stops)
                        .find((s) => s.id === incident.stopId);
                      if (stop) setOpenStop(stop);
                    }}
                  >
                    {incident.place}
                  </button>
                  <p className="text-xs text-muted">
                    {incident.assetName}
                    {incident.doneAt
                      ? ` · ${formatMoment(incident.doneAt)}`
                      : ''}
                    {incident.doneBy ? ` · ${incident.doneBy.name}` : ''}
                  </p>
                  {incident.problems.length > 0 ? (
                    <ul className="mt-1.5 space-y-0.5">
                      {incident.problems.map((problem, index) => (
                        <li key={index} className="text-sm text-ink-2">
                          <span className={problem.failed ? 'text-danger' : ''}>
                            {problem.label}
                          </span>
                          {problem.value ? `: ${problem.value}` : ''}
                          {problem.unit && problem.value
                            ? ` ${problem.unit}`
                            : ''}
                          {problem.notes ? (
                            <span className="text-muted">
                              {' '}
                              · {problem.notes}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tc-panel overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Sin acceso ({round.noAccess.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Habitaciones a las que hay que volver.
            </p>
          </div>
          {round.noAccess.length === 0 ? (
            <p className="px-4 py-4 text-sm text-subtle">Ninguna por ahora.</p>
          ) : (
            <ul className="divide-y divide-line">
              {round.noAccess.map((row) => (
                <li
                  key={row.stopId}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{row.place}</p>
                    <p className="text-xs text-muted">
                      {row.reason ?? 'Sin motivo'}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-subtle">
                    {formatMoment(row.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {openStop ? (
        <StopDrawer
          key={openStop.id}
          session={session}
          roundId={round.id}
          stop={openStop}
          onClose={() => setOpenStop(null)}
        />
      ) : null}

      {closing ? (
        <Modal title="Cerrar la ronda" onClose={() => setClosing(false)}>
          <CloseForm
            pending={counts.pending + counts.noAccess}
            onCancel={() => setClosing(false)}
            onSubmit={async (note) => {
              const problem = await change('close', { note }, 'Ronda cerrada.');
              if (!problem) setClosing(false);
              return problem;
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}