'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
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
  TechnicianPicker,
  countsSummary,
} from '@/components/rounds/RoundsUi';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import { errMsg, normalizeList, tcGet, tcPatch, tcPost } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  CLOSE_NOTE_MAX,
  RETURN_NOTE_MAX,
  STOP_TONE_INFO,
  formatDay,
  formatMoment,
  formatQuantity,
  namesList,
  parseRound,
  parseTechnicianOptions,
  progressPercent,
  type RoundView,
  type StopView,
  type TechnicianOption,
} from '@/lib/tc/rounds';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: RoundView }
  | { status: 'error'; error: string };

type Dialog = 'close' | 'approve' | 'return' | 'team' | null;

type RoundAction =
  | 'start'
  | 'submit'
  | 'approve'
  | 'return'
  | 'close'
  | 'reopen'
  | 'cancel';

const FILTERS: { key: StopFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'noAccess', label: 'Sin acceso' },
  { key: 'issue', label: 'Con incidencia' },
  { key: 'urgent', label: 'Urgentes' },
  { key: 'done', label: 'Hechas' },
];

function Stat({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone?: 'issue' | 'noAccess';
  note?: string | null;
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
      {note ? (
        <p className="mt-0.5 text-xs font-semibold text-danger">{note}</p>
      ) : null}
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: 'info' | 'warning' | 'success' | 'special';
  children: ReactNode;
}) {
  const style = {
    info: 'border-line bg-surface-2 text-ink-2',
    warning: 'border-warning/30 bg-warning-soft text-ink-2',
    success: 'border-success/30 bg-success-soft text-ink-2',
    special: 'border-special/30 bg-special-soft text-ink-2',
  }[tone];
  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${style}`}>
      {children}
    </div>
  );
}

// "Revisa las 12 incidencias (2 urgentes) y los recambios."
function reviewWhat(incidents: number, urgent: number): string {
  if (incidents === 0) return 'No hay incidencias: revisa los recambios.';
  const what =
    incidents === 1 ? 'la incidencia' : `las ${incidents} incidencias`;
  const urgentText =
    urgent > 0 ? ` (${urgent} urgente${urgent === 1 ? '' : 's'})` : '';
  return `Revisa ${what}${urgentText} y los recambios.`;
}

/** Una nota y un botón: cerrar, aprobar o devolver la ronda. */
function NoteForm({
  id,
  intro,
  label,
  placeholder,
  required,
  max,
  submitLabel,
  savingLabel,
  danger,
  onSubmit,
  onCancel,
}: {
  id: string;
  intro: ReactNode;
  label: string;
  placeholder: string;
  required: boolean;
  max: number;
  submitLabel: string;
  savingLabel: string;
  danger?: boolean;
  onSubmit: (note: string | null) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (required && !note.trim()) {
      setError('Escribe qué hay que repasar.');
      return;
    }
    setSaving(true);
    const problem = await onSubmit(note.trim() || null);
    setSaving(false);
    setError(problem);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {intro}
      <div>
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-ink-2"
        >
          {label}{' '}
          {required ? null : (
            <span className="font-normal text-subtle">(opcional)</span>
          )}
        </label>
        <textarea
          id={id}
          className="tc-input min-h-[5rem]"
          value={note}
          maxLength={max}
          placeholder={placeholder}
          onChange={(e) => setNote(e.target.value)}
          disabled={saving}
          autoFocus={required}
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
        <button
          type="submit"
          className={danger ? 'tc-button text-danger' : 'tc-button-primary'}
          disabled={saving}
        >
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

function TeamForm({
  session,
  round,
  onSubmit,
  onCancel,
}: {
  session: TcSession;
  round: RoundView;
  onSubmit: (ids: string[]) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [technicians, setTechnicians] = useState<TechnicianOption[] | null>(
    null,
  );
  const [current] = useState(round.technicians);
  const [selected, setSelected] = useState<string[]>(() =>
    current.map((t) => t.id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await tcGet<unknown>(session, '/technicians');
        if (cancelled) return;
        if (res.code < 200 || res.code >= 300) {
          setError(
            apiError(res.json, 'No se pudo cargar la lista de técnicos.'),
          );
          setTechnicians([]);
          return;
        }
        const list = parseTechnicianOptions(normalizeList(res.json).items);
        // Los que ya van y ya no están activos se siguen viendo para poder quitarlos.
        const missing = current
          .filter((t) => !list.some((o) => o.userId === t.id))
          .map((t) => ({ userId: t.id, name: t.name }));
        setTechnicians([...list, ...missing]);
      } catch (err) {
        if (!cancelled) {
          setError(errMsg(err));
          setTechnicians([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, current]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const problem = await onSubmit(selected);
    setSaving(false);
    setError(problem);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {technicians === null ? (
        <p className="text-sm text-muted">Cargando técnicos…</p>
      ) : (
        <TechnicianPicker
          technicians={technicians}
          selected={selected}
          onChange={setSelected}
          disabled={saving}
        />
      )}
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
        <button
          type="submit"
          className="tc-button-primary"
          disabled={saving || technicians === null}
        >
          {saving ? 'Guardando…' : 'Guardar'}
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
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = isAdminRole(session?.role);

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
    const timer = window.setTimeout(
      () => setNotice(null),
      Math.max(5000, notice.length * 60),
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Cambia el estado de la ronda. Devuelve el error, si lo hay.
  async function change(
    action: RoundAction,
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

  async function onAction(
    action: RoundAction,
    okMessage: string,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    const problem = await change(action, {}, okMessage);
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function saveTeam(ids: string[]): Promise<string | null> {
    setBusy(true);
    try {
      const res = await tcPatch<unknown>(
        session,
        `/rounds/${roundId}/technicians`,
        {
          technicianIds: ids,
        },
      );
      const data =
        res.code >= 200 && res.code < 300 ? parseRound(res.json) : null;
      if (!data)
        return apiError(res.json, 'No se pudieron cambiar los técnicos.');
      setState({ status: 'ok', data });
      setNotice(
        data.technicians.length > 0
          ? `La ronda la hacen ${namesList(data.technicians)}.`
          : 'La ronda se ha quedado sin técnicos.',
      );
      setDialog(null);
      return null;
    } catch (err) {
      return errMsg(err);
    } finally {
      setBusy(false);
    }
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
            href={isAdmin ? '/work-orders' : '/technician/dashboard'}
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
  const status = round.status;
  const working = status === 'OPEN' || status === 'IN_PROGRESS';
  const allDone = counts.total > 0 && counts.done === counts.total;
  const left = counts.total - counts.done;
  const isMember = round.technicians.some((t) => t.id === session.userId);
  const canFill = isAdmin
    ? working || status === 'SUBMITTED'
    : isMember && working;
  const reviewing = status === 'SUBMITTED';
  const urgentIncidents = round.incidents.filter((i) => i.urgent).length;
  const query = search.trim().toLowerCase();
  const visibleCount = round.floors
    .flatMap((f) => f.stops)
    .filter(
      (s) =>
        matchesFilter(s, filter) &&
        (!query || `${s.label} ${s.assetName}`.toLowerCase().includes(query)),
    ).length;

  function openStopById(stopId: string) {
    const stop = round.floors
      .flatMap((f) => f.stops)
      .find((s) => s.id === stopId);
    if (stop) setOpenStop(stop);
  }

  const incidentsSection = (
    <section className="tc-panel overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          Incidencias ({round.incidents.length})
          {urgentIncidents > 0 ? (
            <span className="ml-2 text-danger">
              · {urgentIncidents} urgente{urgentIncidents === 1 ? '' : 's'}
            </span>
          ) : null}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Lo que anotaron los técnicos, las urgentes primero. Sale también en el
          informe.
        </p>
      </div>
      {round.incidents.length === 0 ? (
        <p className="px-4 py-4 text-sm text-subtle">
          Sin incidencias por ahora.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {round.incidents.map((incident) => (
            <li
              key={incident.stopId}
              className={`px-4 py-3 ${incident.urgent ? 'bg-danger-soft/50' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="text-left text-sm font-medium text-ink hover:text-accent"
                  onClick={() => openStopById(incident.stopId)}
                >
                  {incident.place}
                </button>
                {incident.urgent ? (
                  <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white">
                    Urgente
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                {incident.assetName}
                {incident.doneAt ? ` · ${formatMoment(incident.doneAt)}` : ''}
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
                      {problem.unit && problem.value ? ` ${problem.unit}` : ''}
                      {problem.notes ? (
                        <span className="text-muted"> · {problem.notes}</span>
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
  );

  const partsSection = (
    <section className="tc-panel overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          Recambios ({round.parts.length})
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Lo que piden los técnicos, sumado de todas las habitaciones.
        </p>
      </div>
      {round.parts.length === 0 ? (
        <p className="px-4 py-4 text-sm text-subtle">Ninguno por ahora.</p>
      ) : (
        <ul className="divide-y divide-line">
          {round.parts.map((part) => (
            <li
              key={`${part.name}-${part.unit ?? ''}`}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{part.name}</p>
                <p className="text-xs text-muted">{part.places.join(', ')}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-ink">
                {formatQuantity(part.quantity, part.unit)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const noAccessSection = (
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
                <button
                  type="button"
                  className="text-left text-sm font-medium text-ink hover:text-accent"
                  onClick={() => openStopById(row.stopId)}
                >
                  {row.place}
                </button>
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
  );

  const summarySections = (
    <div className="grid gap-4 lg:grid-cols-2">
      {incidentsSection}
      <div className="space-y-4">
        {partsSection}
        {noAccessSection}
      </div>
    </div>
  );

  return (
    <div className="tc-page max-w-6xl">
      <header className="mb-6">
        <Link
          href={
            isAdmin ? `/sites/${round.site.id}/plan` : '/technician/dashboard'
          }
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {isAdmin ? `Plan preventivo · ${round.site.name}` : 'Mis órdenes'}
        </Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="tc-title">
                Preventivo {round.category} · {round.site.name}
              </h1>
              <RoundStatusBadge status={status} />
            </div>
            <p className="tc-subtitle mt-1">
              {formatDay(round.dueOn)}
              {round.workOrder.code ? ` · ${round.workOrder.code}` : ''}
              {round.site.customerName ? ` · ${round.site.customerName}` : ''}
            </p>
            <p className="mt-1 text-sm text-muted">
              {round.technicians.length > 0
                ? `Técnicos: ${namesList(round.technicians)}`
                : 'Sin técnicos asignados'}
              {round.template
                ? ` · Hoja «${round.template.name}»`
                : ' · Sin hoja'}
              {round.plan ? ` · ${round.plan.frequency}` : ' · Ronda suelta'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
            {isAdmin ? (
              <>
                <Link
                  href={`/work-orders/${round.workOrder.id}`}
                  className="tc-button"
                >
                  Ver la orden
                </Link>
                {working ? (
                  <>
                    <button
                      type="button"
                      className="tc-button"
                      onClick={() => setDialog('team')}
                      disabled={busy}
                    >
                      Técnicos
                    </button>
                    <button
                      type="button"
                      className="tc-button text-danger"
                      onClick={() =>
                        void onAction(
                          'cancel',
                          'Ronda cancelada.',
                          '¿Cancelar la ronda?\n\nNo se borra nada: lo ya revisado se queda y se puede reabrir.',
                        )
                      }
                      disabled={busy}
                    >
                      Cancelar ronda
                    </button>
                    <button
                      type="button"
                      className="tc-button"
                      onClick={() => setDialog('close')}
                      disabled={busy}
                    >
                      {allDone ? 'Cerrar ronda' : 'Cerrar sin terminar'}
                    </button>
                  </>
                ) : reviewing ? (
                  <>
                    <button
                      type="button"
                      className="tc-button text-danger"
                      onClick={() => setDialog('return')}
                      disabled={busy}
                    >
                      Devolver
                    </button>
                    <button
                      type="button"
                      className="tc-button-primary"
                      onClick={() => setDialog('approve')}
                      disabled={busy}
                    >
                      Aprobar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="tc-button-primary"
                    onClick={() => void onAction('reopen', 'Ronda reabierta.')}
                    disabled={busy}
                  >
                    Reabrir ronda
                  </button>
                )}
              </>
            ) : isMember && status === 'OPEN' ? (
              <button
                type="button"
                className="tc-button-primary"
                onClick={() =>
                  void onAction('start', 'Ronda iniciada. ¡A por ella!')
                }
                disabled={busy}
              >
                Iniciar la ronda
              </button>
            ) : isMember && status === 'IN_PROGRESS' ? (
              <button
                type="button"
                className="tc-button-primary"
                onClick={() =>
                  void onAction(
                    'submit',
                    'Enviada al encargado.',
                    '¿Enviar la ronda al encargado?\n\nDespués ya no se pueden cambiar las habitaciones, salvo que te la devuelva.',
                  )
                }
                disabled={busy || !allDone}
                title={
                  allDone ? undefined : 'Se envía cuando estén todas hechas.'
                }
              >
                Enviar al encargado
              </button>
            ) : null}
          </div>
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

      {working && round.returnNote && round.returnedAt ? (
        <Banner tone="warning">
          <p className="font-semibold text-warning">
            Devuelta por el encargado el {formatMoment(round.returnedAt)}
          </p>
          <p className="mt-1 whitespace-pre-line">{round.returnNote}</p>
        </Banner>
      ) : null}

      {reviewing ? (
        <Banner tone="special">
          <p className="font-semibold text-special">
            Enviada al encargado
            {round.submittedAt ? ` el ${formatMoment(round.submittedAt)}` : ''}
            {round.submittedBy ? ` por ${round.submittedBy.name}` : ''}.
          </p>
          <p className="mt-1">
            {isAdmin
              ? `${reviewWhat(round.incidents.length, urgentIncidents)} Si todo está bien, apruébala; si hay que repasar algo, devuélvela con una nota. Si hace falta, puedes corregir una habitación tú mismo.`
              : 'El encargado la está revisando. Si hay que cambiar algo, os la devolverá con una nota.'}
          </p>
        </Banner>
      ) : null}

      {!isAdmin && isMember && status === 'OPEN' ? (
        <Banner tone="info">
          Pulsa <strong>Iniciar la ronda</strong> cuando empecéis. Desde la app
          del móvil se inicia sola al guardar la primera habitación.
        </Banner>
      ) : null}

      {!isAdmin && isMember && status === 'IN_PROGRESS' ? (
        allDone ? (
          <Banner tone="success">
            Están todas hechas. Revisad que no falte nada y enviadla al
            encargado.
          </Banner>
        ) : (
          <Banner tone="info">
            {left === 1 ? 'Queda' : 'Quedan'} {left} equipo
            {left === 1 ? '' : 's'}
            {counts.noAccess > 0 ? ` (${counts.noAccess} sin acceso)` : ''}. La
            ronda se envía al encargado cuando estén todos hechos.
          </Banner>
        )
      ) : null}

      {status === 'DONE' && round.closedAt ? (
        <Banner tone="info">
          {round.submittedAt ? 'Aprobada' : 'Cerrada'} el{' '}
          {formatMoment(round.closedAt)}
          {round.closedBy ? ` por ${round.closedBy.name}` : ''}.
          {round.closeNote ? (
            <span className="mt-1 block whitespace-pre-line text-muted">
              {round.closeNote}
            </span>
          ) : null}
        </Banner>
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
          note={
            counts.urgent > 0
              ? `${counts.urgent} urgente${counts.urgent === 1 ? '' : 's'}`
              : null
          }
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

      {reviewing ? <div className="mb-6">{summarySections}</div> : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrar habitaciones"
        >
          {FILTERS.filter(
            (option) => option.key !== 'urgent' || counts.urgent > 0,
          ).map((option) => (
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
              {option.key === 'urgent' ? (
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full bg-danger ring-2 ring-danger/30"
                  aria-hidden
                />
              ) : option.key !== 'all' ? (
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

      {reviewing ? null : <div className="mt-6">{summarySections}</div>}

      {openStop ? (
        <StopDrawer
          key={openStop.id}
          session={session}
          roundId={round.id}
          stop={openStop}
          canFill={canFill}
          onSaved={() => void load()}
          onClose={() => setOpenStop(null)}
        />
      ) : null}

      {dialog === 'close' ? (
        <Modal title="Cerrar la ronda" onClose={() => setDialog(null)}>
          <NoteForm
            id="close-note"
            intro={
              left > 0 ? (
                <p className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                  {left === 1 ? 'Queda' : 'Quedan'} {left} equipo
                  {left === 1 ? '' : 's'} sin hacer. En el informe de la ronda
                  salen como pendientes. Lo normal es que los técnicos la
                  terminen y te la envíen.
                </p>
              ) : (
                <p className="text-sm text-muted">
                  Están todos los equipos revisados.
                </p>
              )
            }
            label="Nota"
            placeholder="Habitaciones 303 y 512 ocupadas toda la semana."
            required={false}
            max={CLOSE_NOTE_MAX}
            submitLabel="Cerrar ronda"
            savingLabel="Cerrando…"
            onCancel={() => setDialog(null)}
            onSubmit={async (note) => {
              const problem = await change('close', { note }, 'Ronda cerrada.');
              if (!problem) setDialog(null);
              return problem;
            }}
          />
        </Modal>
      ) : null}

      {dialog === 'approve' ? (
        <Modal title="Aprobar la ronda" onClose={() => setDialog(null)}>
          <NoteForm
            id="approve-note"
            intro={
              <p className="text-sm text-ink-2">
                {counts.total === 1
                  ? 'El parte queda aprobado'
                  : `Los ${counts.total} partes quedan aprobados`}{' '}
                y la orden se cierra.
                {round.parts.length > 0
                  ? ` ${round.parts.length === 1 ? 'Queda apuntado 1 recambio' : `Quedan apuntados ${round.parts.length} recambios`} para pedir.`
                  : ''}
              </p>
            }
            label="Nota"
            placeholder="Pedir los recambios esta semana."
            required={false}
            max={CLOSE_NOTE_MAX}
            submitLabel="Aprobar"
            savingLabel="Aprobando…"
            onCancel={() => setDialog(null)}
            onSubmit={async (note) => {
              const problem = await change(
                'approve',
                { note },
                'Ronda aprobada.',
              );
              if (!problem) setDialog(null);
              return problem;
            }}
          />
        </Modal>
      ) : null}

      {dialog === 'return' ? (
        <Modal title="Devolver a los técnicos" onClose={() => setDialog(null)}>
          <NoteForm
            id="return-note"
            intro={
              <p className="text-sm text-ink-2">
                La ronda vuelve a los técnicos con tu nota y pueden cambiar las
                habitaciones. Cuando lo tengan, te la vuelven a enviar.
              </p>
            }
            label="Qué hay que repasar"
            placeholder="La 204 no tiene temperaturas. Revisad el desagüe de la 312."
            required
            max={RETURN_NOTE_MAX}
            submitLabel="Devolver"
            savingLabel="Devolviendo…"
            danger
            onCancel={() => setDialog(null)}
            onSubmit={async (note) => {
              const problem = await change(
                'return',
                { note },
                'Devuelta a los técnicos.',
              );
              if (!problem) setDialog(null);
              return problem;
            }}
          />
        </Modal>
      ) : null}

      {dialog === 'team' ? (
        <Modal title="Técnicos de la ronda" onClose={() => setDialog(null)}>
          <TeamForm
            session={session}
            round={round}
            onSubmit={saveTeam}
            onCancel={() => setDialog(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}