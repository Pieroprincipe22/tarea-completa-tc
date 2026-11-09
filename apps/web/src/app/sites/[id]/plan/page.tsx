'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import PlanForm from '@/components/rounds/PlanForm';
import {
  Modal,
  ProgressBar,
  RoundStatusBadge,
  countsSummary,
} from '@/components/rounds/RoundsUi';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import {
  errMsg,
  isRecord,
  normalizeList,
  tcDelete,
  tcGet,
  tcPatch,
  tcPost,
} from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  formatDay,
  namesList,
  parsePlanOverview,
  parseTechnicianOptions,
  todayString,
  type PlanOverview,
  type PlanView,
  type RoundRow,
  type TechnicianOption,
} from '@/lib/tc/rounds';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';
import { parseTemplate, type Template } from '@/lib/tc/templates';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: PlanOverview }
  | { status: 'error'; error: string };

function PlanCard({
  plan,
  busy,
  onEdit,
  onRun,
  onToggle,
  onDelete,
}: {
  plan: PlanView;
  busy: boolean;
  onEdit: () => void;
  onRun: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const createsToday = plan.createsOn <= todayString();
  // "Fancoil · cada 3 meses" ya dice la frecuencia.
  const showFrequency = !plan.name
    .toLowerCase()
    .includes(plan.frequency.toLowerCase());

  return (
    <article className="tc-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
            {plan.isActive ? (
              <span className="rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                Activo
              </span>
            ) : (
              <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                En pausa
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {showFrequency ? `${plan.frequency} · ` : ''}
            {plan.assetCount} equipo
            {plan.assetCount === 1 ? '' : 's'} de tipo «{plan.category}» · Hoja
            «{plan.templateName}»
            {plan.technicians.length > 0
              ? ` · ${namesList(plan.technicians)}`
              : ' · Sin técnicos'}
          </p>
          {plan.isActive ? (
            <p className="mt-2 text-sm text-ink-2">
              <span className="font-medium text-ink">
                Próxima ronda: {formatDay(plan.nextDueOn)}
              </span>
              <span className="text-muted">
                {plan.lastError
                  ? ' · no se ha podido crear'
                  : createsToday
                    ? ' · se está creando'
                    : ` · se crea sola el ${formatDay(plan.createsOn)}`}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:shrink-0 sm:justify-end">
          {plan.isActive ? (
            <button
              type="button"
              className="tc-button px-2.5 py-1 text-xs"
              onClick={onRun}
              disabled={busy}
            >
              Crear la ronda ya
            </button>
          ) : null}
          <button
            type="button"
            className="tc-button px-2.5 py-1 text-xs"
            onClick={onEdit}
            disabled={busy}
          >
            Editar
          </button>
          <button
            type="button"
            className="tc-button px-2.5 py-1 text-xs"
            onClick={onToggle}
            disabled={busy}
          >
            {plan.isActive ? 'Pausar' : 'Reanudar'}
          </button>
          <button
            type="button"
            className="tc-button px-2.5 py-1 text-xs text-danger"
            onClick={onDelete}
            disabled={busy}
          >
            Quitar
          </button>
        </div>
      </div>

      {plan.lastError ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {plan.lastError}
        </div>
      ) : null}
      {!plan.templateActive ? (
        <p className="mt-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
          La hoja «{plan.templateName}» está archivada. Edita el plan y elige
          otra.
        </p>
      ) : null}
    </article>
  );
}

function RoundItem({ round }: { round: RoundRow }) {
  return (
    <li>
      <Link
        href={`/rounds/${round.id}`}
        className="block px-4 py-3 transition hover:bg-surface-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {formatDay(round.dueOn)} · {round.category}
            </p>
            <p className="truncate text-xs text-muted">
              {round.workOrder.code ?? 'Sin número'}
              {round.technicians.length > 0
                ? ` · ${namesList(round.technicians)}`
                : ''}
              {round.plan ? '' : ' · Ronda suelta'}
            </p>
          </div>
          <RoundStatusBadge status={round.status} />
        </div>
        <ProgressBar counts={round.counts} className="mt-2" />
        <p className="mt-1 text-xs text-muted">{countsSummary(round.counts)}</p>
      </Link>
    </li>
  );
}

export default function SitePlanPage() {
  const params = useParams<{ id: string }>();
  const siteId = String(params?.id ?? '');

  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [editing, setEditing] = useState<PlanView | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canEdit = isAdminRole(session?.role);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!session || !siteId) return;
    try {
      const res = await tcGet<unknown>(session, `/sites/${siteId}/plans`);
      const data =
        res.code >= 200 && res.code < 300 ? parsePlanOverview(res.json) : null;
      if (!data) {
        setState({
          status: 'error',
          error:
            res.code === 404
              ? 'Este sitio no existe o es de otra empresa.'
              : res.code === 403
                ? 'Solo el administrador puede ver el plan preventivo.'
                : apiError(res.json, 'No se pudo cargar el plan preventivo.'),
        });
        return;
      }
      setState({ status: 'ok', data });
    } catch (err) {
      setState({ status: 'error', error: errMsg(err) });
    }
  }, [session, siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Plantillas y técnicos para el formulario.
  useEffect(() => {
    if (!session || !isAdminRole(session.role)) return;
    let cancelled = false;
    void (async () => {
      try {
        const [tpl, tech] = await Promise.all([
          tcGet<unknown>(session, '/maintenance-templates'),
          tcGet<unknown>(session, '/technicians'),
        ]);
        if (cancelled) return;
        if (tpl.code >= 200 && tpl.code < 300) {
          setTemplates(
            normalizeList(tpl.json)
              .items.map(parseTemplate)
              .filter((t): t is Template => t !== null && t.isActive),
          );
        }
        if (tech.code >= 200 && tech.code < 300) {
          setTechnicians(
            parseTechnicianOptions(normalizeList(tech.json).items),
          );
        }
      } catch {
        // El formulario avisa si no hay plantillas.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () => setNotice(null),
      Math.max(4000, notice.length * 60),
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function afterChange(message: string) {
    setNotice(message);
    setError(null);
    await load();
  }

  async function act(
    request: () => Promise<{ code: number; json: unknown }>,
    ok: (json: unknown) => string,
    fallback: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, fallback));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      await afterChange(ok(res.json));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  function onRun(plan: PlanView) {
    if (
      !window.confirm(
        `¿Crear ya la ronda del ${formatDay(plan.nextDueOn)} con los ${plan.assetCount} equipos de tipo «${plan.category}»?`,
      )
    ) {
      return;
    }
    void act(
      () =>
        tcPost<unknown>(session, `/sites/${siteId}/plans/${plan.id}/run`, {}),
      (json) => {
        const code =
          isRecord(json) && typeof json.code === 'string' ? json.code : null;
        return `Ronda creada${code ? ` (${code})` : ''}.`;
      },
      'No se pudo crear la ronda.',
    );
  }

  function onToggle(plan: PlanView) {
    void act(
      () =>
        tcPatch<unknown>(session, `/sites/${siteId}/plans/${plan.id}`, {
          isActive: !plan.isActive,
        }),
      () =>
        plan.isActive
          ? `«${plan.name}» en pausa: no se crearán rondas.`
          : `«${plan.name}» reanudado.`,
      'No se pudo cambiar el plan.',
    );
  }

  function onDelete(plan: PlanView) {
    if (
      !window.confirm(
        `¿Quitar «${plan.name}» del plan?\n\nLas rondas que ya se crearon se quedan; solo deja de crear rondas nuevas.`,
      )
    ) {
      return;
    }
    void act(
      () => tcDelete<unknown>(session, `/sites/${siteId}/plans/${plan.id}`),
      () => `«${plan.name}» quitado del plan.`,
      'No se pudo quitar.',
    );
  }

  if (!ready || state.status === 'loading') {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando el plan preventivo…</p>
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
          <Link href={`/sites/${siteId}`} className="tc-button mt-4">
            Volver al sitio
          </Link>
        </div>
      </div>
    );
  }

  const data = state.data;
  const hasAssets = data.categories.length > 0;

  return (
    <div className="tc-page max-w-5xl">
      <header className="mb-6">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {data.site.name}
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="tc-title">Plan preventivo</h1>
            <p className="tc-subtitle mt-1 max-w-2xl">
              Cada cuánto se revisa cada tipo de equipo de {data.site.name}. Las
              rondas se crean solas unos días antes, con todos los equipos.
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              className="tc-button-primary sm:shrink-0"
              onClick={() => setEditing('new')}
              disabled={busy}
            >
              Añadir al plan
            </button>
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

      {!hasAssets ? (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Este sitio todavía no tiene equipos.{' '}
          <Link
            href={`/sites/${siteId}/building`}
            className="font-semibold underline"
          >
            Añádelos en Plantas y habitaciones
          </Link>{' '}
          para que entren en las rondas.
        </div>
      ) : null}

      {data.plans.length === 0 ? (
        <div className="tc-panel px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-ink">
            Todavía no hay plan preventivo
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Por ejemplo: los fancoils de las habitaciones, cada 3 meses, con la
            hoja de mantenimiento de fancoil. Cuando toque, se crea la ronda con
            todos los equipos, planta por planta.
          </p>
          {canEdit ? (
            <button
              type="button"
              className="tc-button-primary mt-5"
              onClick={() => setEditing('new')}
            >
              Añadir al plan
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              busy={busy}
              onEdit={() => setEditing(plan)}
              onRun={() => onRun(plan)}
              onToggle={() => onToggle(plan)}
              onDelete={() => onDelete(plan)}
            />
          ))}
        </div>
      )}

      <section className="tc-panel mt-6 overflow-hidden">
        <div className="border-b border-line bg-surface-2 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Rondas</h2>
          <p className="mt-0.5 text-xs text-muted">
            Las más recientes primero. Pulsa una para ver habitación por
            habitación.
          </p>
        </div>
        {data.rounds.length === 0 ? (
          <p className="px-4 py-4 text-sm text-subtle">
            Todavía no hay rondas en este sitio.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data.rounds.map((round) => (
              <RoundItem key={round.id} round={round} />
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <Modal
          title={
            editing === 'new' ? 'Añadir al plan' : `Editar «${editing.name}»`
          }
          onClose={() => setEditing(null)}
        >
          <PlanForm
            session={session}
            siteId={siteId}
            plan={editing === 'new' ? undefined : editing}
            categories={data.categories}
            templates={templates}
            technicians={technicians}
            onCancel={() => setEditing(null)}
            onDone={(message) => {
              setEditing(null);
              void afterChange(message);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}