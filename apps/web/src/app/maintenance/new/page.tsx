'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import BuildingStep from '@/components/maintenance/BuildingStep';
import MachinesStep from '@/components/maintenance/MachinesStep';
import PlansStep from '@/components/maintenance/PlansStep';
import SheetsStep from '@/components/maintenance/SheetsStep';
import { DonePanel, SummaryStep } from '@/components/maintenance/SummaryStep';
import {
  StepFooter,
  Stepper,
  WIZARD_STEPS,
  type WizardStepKey,
} from '@/components/maintenance/WizardUi';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import { ErrorBox } from '@/components/rounds/RoundsUi';
import { errMsg, tcGet, tcPost } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import {
  ROOF_ZONE,
  buildSetupBody,
  hotelZones,
  keyOf,
  machineCount,
  newPlanDraft,
  parseMaintenanceList,
  parseSetupContext,
  parseSetupResult,
  planProblem,
  plannableCategories,
  plannedFloors,
  plural,
  roofLevel,
  sheetProblem,
  type BuildingDraft,
  type MachineDraft,
  type MaintenanceRow,
  type PlanDraft,
  type SetupContext,
  type SetupResult,
  type WizardDraft,
  type ZoneChoice,
} from '@/lib/tc/maintenance';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';
import { newKey } from '@/lib/tc/templates';

function emptyDraft(context: SetupContext): WizardDraft {
  return {
    building: {
      // Si el hotel ya tiene habitaciones, no se añaden más salvo que se pida.
      add: context.building.rooms === 0,
      fromLevel: '1',
      toLevel: '',
      roomsPerFloor: '',
      firstNumber: '1',
      perFloor: {},
    },
    zones: [],
    machines: {},
    plans: {},
  };
}

// ---------------------------------------------------------------
// Elegir el hotel
// ---------------------------------------------------------------

function HotelPicker({ session }: { session: TcSession }) {
  const router = useRouter();
  const [rows, setRows] = useState<MaintenanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await tcGet<unknown>(session, '/maintenance');
        if (cancelled) return;
        if (res.code < 200 || res.code >= 300) {
          setError(apiError(res.json, 'No se pudieron cargar los hoteles.'));
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

  const filtered = (rows ?? []).filter((row) => {
    const q = keyOf(query);
    if (!q) return true;
    return [row.site.name, row.customer?.name ?? '', row.site.city ?? ''].some(
      (text) => keyOf(text).includes(q),
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar hotel o cliente…"
          className="tc-input sm:max-w-sm"
        />
        <Link href="/customers/new" className="tc-button">
          Cliente nuevo
        </Link>
      </div>

      <ErrorBox message={error} />

      {rows === null && !error ? (
        <p className="text-sm text-muted">Cargando hoteles…</p>
      ) : null}

      {rows !== null && rows.length === 0 ? (
        <div className="tc-panel p-6">
          <p className="text-sm text-muted">
            Aún no tienes ningún hotel. Da de alta el cliente y su hotel y
            vuelve aquí.
          </p>
          <Link href="/customers/new" className="tc-button-primary mt-4">
            Dar de alta cliente y hotel
          </Link>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="tc-panel divide-y divide-line">
          {filtered.map((row) => (
            <li key={row.site.id}>
              <button
                type="button"
                onClick={() =>
                  router.replace(
                    `/maintenance/new?siteId=${encodeURIComponent(row.site.id)}`,
                  )
                }
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-ink">
                    {row.site.name}
                  </span>
                  <span className="block text-sm text-muted">
                    {[row.customer?.name, row.site.city]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted">
                  {row.plans.length > 0
                    ? plural(row.plans.length, 'plan', 'planes')
                    : row.machines > 0
                      ? plural(row.machines, 'máquina', 'máquinas')
                      : 'Sin preparar'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : rows !== null && rows.length > 0 ? (
        <p className="text-sm text-muted">
          Ningún hotel coincide con «{query}».
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------
// El asistente
// ---------------------------------------------------------------

function Wizard({ session, siteId }: { session: TcSession; siteId: string }) {
  const [context, setContext] = useState<SetupContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [step, setStep] = useState<WizardStepKey>('building');
  const [reached, setReached] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [preview, setPreview] = useState<SetupResult | null>(null);
  const [done, setDone] = useState<SetupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await tcGet<unknown>(
          session,
          `/maintenance/sites/${encodeURIComponent(siteId)}`,
        );
        if (cancelled) return;
        const parsed =
          res.code >= 200 && res.code < 300
            ? parseSetupContext(res.json)
            : null;
        if (!parsed) {
          setLoadError(apiError(res.json, 'No se pudo abrir el hotel.'));
          return;
        }
        setContext(parsed);
        setDraft(emptyDraft(parsed));
      } catch (err) {
        if (!cancelled) setLoadError(errMsg(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, siteId]);

  const categories = useMemo(
    () => (context && draft ? plannableCategories(context, draft) : []),
    [context, draft],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    if (!context || !draft) return out;
    for (const machine of context.machines)
      out[keyOf(machine.category)] = machine.total;
    for (const machine of context.catalog) {
      const n = machineCount(context, draft, machine);
      if (n > 0) out[keyOf(machine.category)] = n;
    }
    return out;
  }, [context, draft]);

  // El aviso de un paso se va en cuanto se cambia algo.
  useEffect(() => {
    setProblem(null);
  }, [draft]);

  const goTo = useCallback((next: WizardStepKey) => {
    setProblem(null);
    setError(null);
    setStep(next);
    setReached((r) =>
      Math.max(
        r,
        WIZARD_STEPS.findIndex((s) => s.key === next),
      ),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loadError) {
    return (
      <div className="tc-panel max-w-xl p-6">
        <p className="text-sm text-danger">{loadError}</p>
        <Link href="/maintenance/new" className="tc-button mt-4">
          Elegir otro hotel
        </Link>
      </div>
    );
  }
  if (!context || !draft)
    return <p className="text-sm text-muted">Cargando el hotel…</p>;
  if (done) return <DonePanel result={done} />;

  const ctx = context;
  const update = (patch: Partial<WizardDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  function setBuilding(building: BuildingDraft) {
    update({ building });
  }

  function addZone(zone: ZoneChoice) {
    setDraft((d) => (d ? { ...d, zones: [...d.zones, zone] } : d));
  }

  // Al quitar una zona, también se quitan las máquinas puestas en ella.
  function removeZone(id: string) {
    setDraft((d) => {
      if (!d) return d;
      const machines: Record<string, MachineDraft> = {};
      for (const [key, choice] of Object.entries(d.machines)) {
        const zones = { ...choice.zones };
        delete zones[id];
        machines[key] = { ...choice, zones };
      }
      return { ...d, zones: d.zones.filter((z) => z.id !== id), machines };
    });
  }

  // "Añadir la cubierta" desde una máquina exterior: la zona y una máquina en ella.
  function addRoof() {
    setDraft((d) => {
      if (!d) return d;
      const existing = hotelZones(ctx, d).find(
        (z) => keyOf(z.name) === keyOf(ROOF_ZONE),
      );
      const id = existing?.id ?? newKey('zone');
      const zones = existing
        ? d.zones
        : [
            ...d.zones,
            {
              id,
              name: ROOF_ZONE,
              level: roofLevel(ctx, d.building),
              floorName: ROOF_ZONE,
              roof: true,
            },
          ];
      const machines: Record<string, MachineDraft> = {};
      for (const [key, choice] of Object.entries(d.machines)) {
        const machine = ctx.catalog.find((m) => m.key === key);
        const empty = Object.values(choice.zones).every((n) => n <= 0);
        machines[key] =
          choice.selected &&
          empty &&
          machine?.defaultZone &&
          keyOf(machine.defaultZone) === keyOf(ROOF_ZONE)
            ? { ...choice, zones: { [id]: 1 } }
            : choice;
      }
      return { ...d, zones, machines };
    });
  }

  function setMachine(key: string, choice: MachineDraft) {
    setDraft((d) =>
      d ? { ...d, machines: { ...d.machines, [key]: choice } } : d,
    );
  }

  function setPlan(key: string, plan: PlanDraft) {
    setDraft((d) => (d ? { ...d, plans: { ...d.plans, [key]: plan } } : d));
  }

  function copyToAll(from: PlanDraft) {
    setDraft((d) => {
      if (!d) return d;
      const plans = { ...d.plans };
      for (const [key, plan] of Object.entries(plans)) {
        if (!plan.include) continue;
        plans[key] = {
          ...plan,
          frequency: from.frequency,
          every: from.every,
          unit: from.unit,
          startsOn: from.startsOn,
          technicianIds: [...from.technicianIds],
        };
      }
      return { ...d, plans };
    });
  }

  // ---- Pasar de paso ----

  function nextFromBuilding() {
    if (draft!.building.add) {
      const planned = plannedFloors(draft!.building);
      if (!planned.ok) return setProblem(planned.problem);
    }
    goTo('machines');
  }

  function nextFromMachines() {
    const d = draft!;
    for (const machine of ctx.catalog) {
      const choice = d.machines[machine.key];
      if (!choice?.selected) continue;
      const zones = hotelZones(ctx, d);
      const inZones = Object.entries(choice.zones).reduce(
        (sum, [id, n]) => sum + (zones.some((z) => z.id === id) ? n : 0),
        0,
      );
      if (choice.perRoom === 0 && inZones === 0) {
        return setProblem(
          `${machine.label}: pon cuántas hay en las habitaciones o en las zonas.`,
        );
      }
    }
    const list = plannableCategories(ctx, d);
    if (list.length === 0 && ctx.plans.length === 0) {
      return setProblem('Marca al menos una máquina del hotel.');
    }
    // Cada tipo de máquina con su plan de partida (los ya tocados se respetan).
    const plans = { ...d.plans };
    for (const category of list) {
      const key = keyOf(category);
      if (!plans[key]) plans[key] = newPlanDraft(ctx, category);
    }
    setDraft({ ...d, plans });
    goTo('sheets');
  }

  function nextFromSheets() {
    for (const category of categories) {
      const plan = draft!.plans[keyOf(category)];
      const issue = plan ? sheetProblem(plan) : null;
      if (issue) return setProblem(issue);
    }
    goTo('plans');
  }

  async function runPreview() {
    for (const category of categories) {
      const plan = draft!.plans[keyOf(category)];
      const issue = plan ? planProblem(plan) : null;
      if (issue) return setProblem(issue);
    }
    setBusy(true);
    setProblem(null);
    setError(null);
    try {
      const res = await tcPost<unknown>(
        session,
        `/maintenance/sites/${encodeURIComponent(siteId)}`,
        buildSetupBody(ctx, draft!, true),
      );
      const parsed =
        res.code >= 200 && res.code < 300 ? parseSetupResult(res.json) : null;
      if (!parsed) {
        setProblem(apiError(res.json, 'No se pudo preparar el resumen.'));
        return;
      }
      setPreview(parsed);
      goTo('summary');
    } catch (err) {
      setProblem(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await tcPost<unknown>(
        session,
        `/maintenance/sites/${encodeURIComponent(siteId)}`,
        buildSetupBody(ctx, draft!, false),
      );
      const parsed =
        res.code >= 200 && res.code < 300 ? parseSetupResult(res.json) : null;
      if (!parsed) {
        setError(apiError(res.json, 'No se pudo crear el mantenimiento.'));
        return;
      }
      setDone(parsed);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  // Volver a un paso anterior invalida el resumen: se vuelve a contar.
  function jump(next: WizardStepKey) {
    if (next === 'summary') return void runPreview();
    goTo(next);
  }

  return (
    <>
      <Stepper current={step} reached={reached} onGo={jump} />

      {step === 'building' ? (
        <>
          <BuildingStep
            context={ctx}
            draft={draft}
            onBuilding={setBuilding}
            onAddZone={addZone}
            onRemoveZone={removeZone}
          />
          <StepFooter onNext={nextFromBuilding} problem={problem} />
        </>
      ) : null}

      {step === 'machines' ? (
        <>
          <MachinesStep
            context={ctx}
            draft={draft}
            onMachine={setMachine}
            onAddRoof={addRoof}
          />
          <StepFooter
            onBack={() => goTo('building')}
            onNext={nextFromMachines}
            problem={problem}
          />
        </>
      ) : null}

      {step === 'sheets' ? (
        <>
          <SheetsStep
            context={ctx}
            categories={categories}
            counts={counts}
            plans={draft.plans}
            onPlan={setPlan}
          />
          <StepFooter
            onBack={() => goTo('machines')}
            onNext={nextFromSheets}
            problem={problem}
          />
        </>
      ) : null}

      {step === 'plans' ? (
        <>
          <PlansStep
            context={ctx}
            categories={categories}
            counts={counts}
            plans={draft.plans}
            viewerId={session.userId || null}
            onPlan={setPlan}
            onCopyToAll={copyToAll}
          />
          <StepFooter
            onBack={() => goTo('sheets')}
            onNext={() => void runPreview()}
            nextLabel={busy ? 'Preparando el resumen…' : 'Ver el resumen'}
            busy={busy}
            problem={problem}
          />
        </>
      ) : null}

      {step === 'summary' && preview ? (
        <>
          <SummaryStep result={preview} />
          <div className="mt-4">
            <ErrorBox message={error} />
          </div>
          <StepFooter
            onBack={() => goTo('plans')}
            onNext={() => void create()}
            nextLabel={busy ? 'Creando…' : 'Crear el mantenimiento'}
            busy={busy}
          />
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------

function MaintenanceSetupPage() {
  const params = useSearchParams();
  const siteId = params.get('siteId')?.trim() || null;
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

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
            Preparar mantenimientos lo hace la oficina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-page max-w-4xl">
      <header className="mb-6">
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Mantenimientos
        </Link>
        <h1 className="tc-title mt-2">Preparar un mantenimiento</h1>
        <p className="tc-subtitle mt-1 max-w-2xl">
          {siteId
            ? 'Paso a paso: el edificio, sus máquinas, qué se revisa y cada cuánto. Nada se guarda hasta el final.'
            : 'Elige el hotel. Si es un cliente nuevo, dalo de alta primero.'}
        </p>
      </header>

      {siteId ? (
        <Wizard key={siteId} session={session} siteId={siteId} />
      ) : (
        <HotelPicker session={session} />
      )}
    </div>
  );
}

// useSearchParams necesita un límite de Suspense para que `next build` no falle.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <MaintenanceSetupPage />
    </Suspense>
  );
}