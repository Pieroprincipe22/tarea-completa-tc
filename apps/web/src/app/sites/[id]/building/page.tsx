'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FloorForm,
  GeneratorPanel,
  SpaceForm,
  describeGeneration,
} from '@/components/building/BuildingForms';
import FloorSection from '@/components/building/FloorSection';
import SpacePanel, { SpacePicker } from '@/components/building/SpacePanel';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import { errMsg, tcDelete, tcGet, tcPatch } from '@/lib/tc/api';
import {
  apiError,
  nextFreeLevel,
  parseBuilding,
  type AssetBrief,
  type Building,
  type FloorView,
  type SpaceView,
} from '@/lib/tc/building';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: Building }
  | { status: 'error'; error: string };

type Dialog =
  | { kind: 'floor'; floor?: FloorView }
  | { kind: 'space'; spaceKind: 'ROOM' | 'COMMON'; floorId: string };

// Para buscar sin importar mayúsculas ni tildes.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findSpace(
  floors: FloorView[],
  spaceId: string,
): { floor: FloorView; space: SpaceView } | null {
  for (const floor of floors) {
    const space = floor.spaces.find((s) => s.id === spaceId);
    if (space) return { floor, space };
  }
  return null;
}

// Busca por número, nombre, tipo de zona o nombre de sus equipos.
function matches(space: SpaceView, query: string): boolean {
  return normalize(
    [
      space.name,
      space.label,
      space.category ?? '',
      ...space.assets.map((a) => a.name),
    ].join(' '),
  ).includes(query);
}

function Modal({
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
    <div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4">
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
        aria-labelledby="building-dialog-title"
        className="relative w-full max-w-lg rounded-t-xl border border-line bg-surface p-5 shadow-xl sm:rounded-xl sm:p-6"
      >
        <h2
          id="building-dialog-title"
          className="mb-4 text-base font-semibold text-ink"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="tc-panel px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function UnplacedAsset({
  asset,
  floors,
  canEdit,
  busy,
  onPlace,
}: {
  asset: AssetBrief;
  floors: FloorView[];
  canEdit: boolean;
  busy: boolean;
  onPlace: (asset: AssetBrief, spaceId: string) => void;
}) {
  const [target, setTarget] = useState('');
  const detail = [asset.category, asset.brand, asset.model]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/assets/${asset.id}`}
          className="block truncate text-sm font-medium text-ink hover:text-accent"
        >
          {asset.name}
        </Link>
        {detail ? (
          <p className="truncate text-xs text-muted">{detail}</p>
        ) : null}
      </div>
      {canEdit && floors.some((f) => f.spaces.length > 0) ? (
        <div className="flex gap-2 sm:w-80">
          <SpacePicker
            id={`place-${asset.id}`}
            label={`Colocar ${asset.name} en`}
            floors={floors}
            value={target}
            onChange={setTarget}
            disabled={busy}
          />
          <button
            type="button"
            className="tc-button-primary shrink-0 px-3 py-1.5 text-xs"
            onClick={() => onPlace(asset, target)}
            disabled={busy || !target}
          >
            Colocar
          </button>
        </div>
      ) : null}
    </li>
  );
}

export default function SiteBuildingPage() {
  const params = useParams<{ id: string }>();
  const siteId = String(params?.id ?? '');

  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const canEdit = isAdminRole(session?.role);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!session || !siteId) return;
    try {
      const res = await tcGet<unknown>(session, `/sites/${siteId}/building`);
      const building =
        res.code >= 200 && res.code < 300 ? parseBuilding(res.json) : null;
      if (!building) {
        setState({
          status: 'error',
          error:
            res.code === 404
              ? 'Este sitio no existe o es de otra empresa.'
              : apiError(res.json, 'No se pudo cargar el edificio.'),
        });
        return;
      }
      setState({ status: 'ok', data: building });
    } catch (err) {
      setState({ status: 'error', error: errMsg(err) });
    }
  }, [session, siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () => setNotice(null),
      Math.max(4000, notice.length * 60),
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  const building = state.status === 'ok' ? state.data : null;
  const floors = useMemo(() => building?.floors ?? [], [building]);

  // La habitación o zona abierta se busca en los datos recién cargados,
  // así el panel siempre enseña los equipos actualizados.
  const openSpace = openSpaceId ? findSpace(floors, openSpaceId) : null;

  const query = normalize(search.trim());
  const visibleSpaces = (floor: FloorView): SpaceView[] =>
    query
      ? floor.spaces.filter((space) => matches(space, query))
      : floor.spaces;

  async function afterChange(message: string) {
    setNotice(message);
    setError(null);
    await load();
  }

  async function onDeleteFloor(floor: FloorView) {
    const assets = floor.spaces.reduce((sum, s) => sum + s.assets.length, 0);
    if (assets > 0) {
      setError(
        `«${floor.name}» tiene ${assets} equipo${assets === 1 ? '' : 's'}. Quítalos o muévelos a otra planta antes de borrarla.`,
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const spaces = floor.spaces.length;
    if (
      !window.confirm(
        `¿Borrar «${floor.name}»${spaces > 0 ? ` y sus ${spaces} habitaciones y zonas` : ''}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await tcDelete<unknown>(
        session,
        `/sites/${siteId}/building/floors/${floor.id}`,
      );
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, 'No se pudo borrar la planta.'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      await afterChange(`«${floor.name}» borrada.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function onPlace(asset: AssetBrief, spaceId: string) {
    if (!spaceId) return;
    const target = floors
      .flatMap((f) => f.spaces.map((s) => ({ floor: f, space: s })))
      .find((x) => x.space.id === spaceId);
    setBusy(true);
    try {
      const res = await tcPatch<unknown>(session, `/assets/${asset.id}`, {
        spaceId,
      });
      if (res.code < 200 || res.code >= 300) {
        setError(apiError(res.json, 'No se pudo colocar el equipo.'));
        return;
      }
      await afterChange(
        `«${asset.name}» colocado en ${target ? `${target.floor.name} · ${target.space.label}` : 'su sitio'}.`,
      );
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

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

  if (state.status === 'loading') {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando el edificio…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-danger">{state.error}</p>
          <Link href="/sites" className="tc-button mt-4">
            Volver a los sitios
          </Link>
        </div>
      </div>
    );
  }

  const data = state.data;
  const hasFloors = floors.length > 0;
  const shownFloors = query
    ? floors.filter((f) => visibleSpaces(f).length > 0)
    : floors;

  return (
    <div className="tc-page max-w-6xl">
      <header className="mb-6">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {data.site.name}
        </Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="tc-title">Plantas y habitaciones</h1>
            <p className="tc-subtitle mt-1 max-w-2xl">
              {data.site.name}
              {data.site.customerName ? ` · ${data.site.customerName}` : ''}.
              Cada equipo en su habitación o zona, para que el técnico sepa
              dónde está.
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
              <button
                type="button"
                className="tc-button"
                onClick={() => setDialog({ kind: 'floor' })}
                disabled={busy}
              >
                Añadir planta
              </button>
              <button
                type="button"
                className="tc-button"
                onClick={() =>
                  floors[0]
                    ? setDialog({
                        kind: 'space',
                        spaceKind: 'COMMON',
                        floorId: (
                          floors.find((f) => f.level === 0) ?? floors[0]
                        ).id,
                      })
                    : setDialog({ kind: 'floor' })
                }
                disabled={busy}
              >
                Añadir zona común
              </button>
              <button
                type="button"
                className="tc-button-primary"
                onClick={() => setShowGenerator((v) => !v)}
                disabled={busy}
                aria-expanded={showGenerator}
              >
                Generar plantas y habitaciones
              </button>
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

      {showGenerator && canEdit ? (
        <div className="mb-6">
          <GeneratorPanel
            session={session}
            siteId={siteId}
            onCancel={() => setShowGenerator(false)}
            onDone={(result) => {
              setShowGenerator(false);
              void afterChange(describeGeneration(result));
            }}
          />
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Plantas" value={data.totals.floors} />
        <Stat label="Habitaciones" value={data.totals.rooms} />
        <Stat label="Zonas comunes" value={data.totals.commons} />
        <Stat label="Equipos colocados" value={data.totals.placedAssets} />
      </div>

      {!hasFloors ? (
        <div className="tc-panel px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-ink">
            Este sitio todavía no tiene plantas
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Genera de una vez las plantas con sus habitaciones (101, 102…) o
            empieza añadiendo la planta baja con sus zonas comunes.
          </p>
          {canEdit ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="tc-button-primary"
                onClick={() => setShowGenerator(true)}
              >
                Generar plantas y habitaciones
              </button>
              <button
                type="button"
                className="tc-button"
                onClick={() => setDialog({ kind: 'floor' })}
              >
                Añadir planta
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <input
              type="search"
              aria-label="Buscar habitación, zona o equipo"
              className="tc-input sm:max-w-sm"
              placeholder="Buscar habitación, zona o equipo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {shownFloors.length === 0 ? (
            <div className="tc-panel p-6 text-sm text-muted">
              Nada coincide con «{search.trim()}».
            </div>
          ) : (
            <div className="space-y-4">
              {shownFloors.map((floor) => (
                <FloorSection
                  key={floor.id}
                  floor={floor}
                  spaces={visibleSpaces(floor)}
                  canEdit={canEdit}
                  onOpenSpace={(space) => setOpenSpaceId(space.id)}
                  onEdit={() => setDialog({ kind: 'floor', floor })}
                  onDelete={() => void onDeleteFloor(floor)}
                  onAddZone={() =>
                    setDialog({
                      kind: 'space',
                      spaceKind: 'COMMON',
                      floorId: floor.id,
                    })
                  }
                  onAddRoom={() =>
                    setDialog({
                      kind: 'space',
                      spaceKind: 'ROOM',
                      floorId: floor.id,
                    })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {data.unplacedAssets.length > 0 ? (
        <section className="tc-panel mt-6 overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">
              Equipos sin habitación ({data.unplacedAssets.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Están en este sitio pero no en una habitación o zona.
              {canEdit
                ? ' Colócalos para que el técnico sepa dónde están.'
                : ''}
            </p>
          </div>
          <ul className="divide-y divide-line">
            {data.unplacedAssets.map((asset) => (
              <UnplacedAsset
                key={asset.id}
                asset={asset}
                floors={floors}
                canEdit={canEdit}
                busy={busy}
                onPlace={(a, spaceId) => void onPlace(a, spaceId)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {dialog?.kind === 'floor' ? (
        <Modal
          title={dialog.floor ? `Editar ${dialog.floor.name}` : 'Añadir planta'}
          onClose={() => setDialog(null)}
        >
          <FloorForm
            session={session}
            siteId={siteId}
            floor={dialog.floor}
            suggestedLevel={nextFreeLevel(floors)}
            onCancel={() => setDialog(null)}
            onDone={(message) => {
              setDialog(null);
              void afterChange(message);
            }}
          />
        </Modal>
      ) : null}

      {dialog?.kind === 'space' ? (
        <Modal
          title={
            dialog.spaceKind === 'ROOM'
              ? 'Añadir habitación'
              : 'Añadir zona común'
          }
          onClose={() => setDialog(null)}
        >
          <SpaceForm
            session={session}
            siteId={siteId}
            floors={floors}
            floorId={dialog.floorId}
            kind={dialog.spaceKind}
            onCancel={() => setDialog(null)}
            onDone={(message) => {
              setDialog(null);
              void afterChange(message);
            }}
          />
        </Modal>
      ) : null}

      {openSpace ? (
        <SpacePanel
          key={openSpace.space.id}
          session={session}
          siteId={siteId}
          floor={openSpace.floor}
          space={openSpace.space}
          floors={floors}
          canEdit={canEdit}
          onClose={() => setOpenSpaceId(null)}
          onChanged={(message, closePanel) => {
            if (closePanel) setOpenSpaceId(null);
            void afterChange(message);
          }}
        />
      ) : null}
    </div>
  );
}