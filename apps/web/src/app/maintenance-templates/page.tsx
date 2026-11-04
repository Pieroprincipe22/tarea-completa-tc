'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  normalizeList,
  tcDelete,
  tcGet,
  tcPatch,
  tcPost,
} from '@/lib/tc/api';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';
import {
  apiMessages,
  countSections,
  parseTemplate,
  type Template,
} from '@/lib/tc/templates';
import { PlusIcon } from '@/components/templates/TemplateIcons';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: Template[] }
  | { status: 'error'; error: string };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

// Para buscar sin importar mayúsculas ni tildes.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function MaintenanceTemplatesPage() {
  const router = useRouter();
  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const canEdit = isAdminRole(session?.role);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    setState({ status: 'loading' });
    try {
      const res = await tcGet<unknown>(
        session,
        `/maintenance-templates${showArchived ? '?includeArchived=true' : ''}`,
      );
      if (res.code < 200 || res.code >= 300) {
        setState({
          status: 'error',
          error: apiMessages(
            res.json,
            'No se pudieron cargar las plantillas.',
          )[0],
        });
        return;
      }
      const rows = normalizeList(res.json)
        .items.map(parseTemplate)
        .filter((t): t is Template => t !== null);
      setState({ status: 'ok', data: rows });
    } catch (err) {
      setState({ status: 'error', error: errMsg(err) });
    }
  }, [session, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const visible = useMemo(() => {
    if (state.status !== 'ok') return [];
    const q = normalize(search.trim());
    if (!q) return state.data;
    return state.data.filter((t) =>
      normalize(
        `${t.name} ${t.category ?? ''} ${t.description ?? ''}`,
      ).includes(q),
    );
  }, [state, search]);

  async function onDuplicate(template: Template) {
    if (!session) return;
    setBusyId(template.id);
    setErrors([]);
    try {
      const res = await tcPost<unknown>(
        session,
        `/maintenance-templates/${template.id}/duplicate`,
      );
      const copy =
        res.code >= 200 && res.code < 300 ? parseTemplate(res.json) : null;
      if (!copy) {
        setErrors(apiMessages(res.json, 'No se pudo duplicar la plantilla.'));
        return;
      }
      router.push(`/maintenance-templates/${copy.id}`);
    } catch (err) {
      setErrors([errMsg(err)]);
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(
    template: Template,
    request: () => Promise<{ code: number; json: unknown }>,
    okMessage: string,
  ) {
    setBusyId(template.id);
    setErrors([]);
    try {
      const res = await request();
      if (res.code < 200 || res.code >= 300) {
        setErrors(apiMessages(res.json, 'No se pudo cambiar la plantilla.'));
        return;
      }
      setNotice(okMessage);
      await load();
    } catch (err) {
      setErrors([errMsg(err)]);
    } finally {
      setBusyId(null);
    }
  }

  async function onArchive(template: Template) {
    if (!session) return;
    const ok = window.confirm(
      `¿Archivar «${template.name}»?\n\nYa no se podrá usar en partes nuevos. Los partes que ya están hechos no cambian, y puedes restaurarla cuando quieras.`,
    );
    if (!ok) return;
    await changeStatus(
      template,
      () => tcDelete<unknown>(session, `/maintenance-templates/${template.id}`),
      'Plantilla archivada.',
    );
  }

  async function onRestore(template: Template) {
    if (!session) return;
    await changeStatus(
      template,
      () =>
        tcPatch<unknown>(session, `/maintenance-templates/${template.id}`, {
          isActive: true,
        }),
      'Plantilla restaurada.',
    );
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

  return (
    <div className="tc-page">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
            Plantillas
          </p>
          <h1 className="tc-title mt-1">Plantillas de mantenimiento</h1>
          <p className="tc-subtitle mt-1 max-w-2xl">
            Las hojas que rellenan tus técnicos en cada mantenimiento: qué
            revisar, qué medir y qué fotos hacer, según el tipo de equipo.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2 self-start">
            <Link href="/maintenance-templates/library" className="tc-button">
              Plantillas de partida
            </Link>
            <Link
              href="/maintenance-templates/new"
              className="tc-button-primary gap-1.5"
            >
              <PlusIcon className="h-4 w-4" />
              Nueva plantilla
            </Link>
          </div>
        ) : null}
      </header>

      {notice ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {notice}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {errors.join(' ')}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          aria-label="Buscar plantillas"
          className="tc-input sm:max-w-sm"
          placeholder="Buscar por nombre o tipo de equipo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Mostrar archivadas
        </label>
      </div>

      {state.status === 'loading' ? (
        <div className="tc-panel p-6 text-sm text-muted">
          Cargando plantillas…
        </div>
      ) : state.status === 'error' ? (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-6 text-sm text-danger">
          {state.error}
        </div>
      ) : state.data.length === 0 ? (
        <div className="tc-panel px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-ink">
            {showArchived
              ? 'No hay plantillas'
              : 'Todavía no tienes plantillas'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Crea la hoja de mantenimiento de un tipo de equipo (un split, una
            enfriadora, un cuadro eléctrico…) y tus técnicos la tendrán lista en
            cada parte.
          </p>
          {canEdit ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link
                href="/maintenance-templates/library"
                className="tc-button-primary"
              >
                Empezar con una plantilla de partida
              </Link>
              <Link
                href="/maintenance-templates/new"
                className="tc-button gap-1.5"
              >
                <PlusIcon className="h-4 w-4" />
                Crear desde cero
              </Link>
            </div>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        <div className="tc-panel p-6 text-sm text-muted">
          Ninguna plantilla coincide con «{search.trim()}».
        </div>
      ) : (
        <div className="tc-table-wrap overflow-x-auto">
          <table className="tc-table min-w-[720px]">
            <thead>
              <tr>
                <th>Plantilla</th>
                <th>Tipo de equipo</th>
                <th>Puntos</th>
                <th>Modificada</th>
                <th>
                  <span className="block text-right">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((template) => {
                const sections = countSections(template.items);
                const busy = busyId === template.id;
                return (
                  <tr
                    key={template.id}
                    className={template.isActive ? '' : 'opacity-70'}
                  >
                    <td className="max-w-[360px]">
                      <Link
                        href={`/maintenance-templates/${template.id}`}
                        className="font-medium text-ink hover:text-accent"
                      >
                        {template.name}
                      </Link>
                      {!template.isActive ? (
                        <span className="ml-2 rounded-full border border-line-strong bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                          Archivada
                        </span>
                      ) : null}
                      {template.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {template.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="text-ink-2">{template.category ?? '—'}</td>
                    <td className="whitespace-nowrap text-ink-2">
                      {template.items.length}
                      {sections > 0 ? (
                        <span className="text-subtle">
                          {' '}
                          · {sections} secc{sections === 1 ? 'ión' : 'iones'}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap text-ink-2">
                      {formatDate(template.updatedAt)}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/maintenance-templates/${template.id}`}
                          className="tc-button px-3 py-1.5 text-xs"
                        >
                          {canEdit ? 'Editar' : 'Ver'}
                        </Link>
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className="tc-button px-3 py-1.5 text-xs"
                              onClick={() => void onDuplicate(template)}
                              disabled={busy}
                            >
                              Duplicar
                            </button>
                            {template.isActive ? (
                              <button
                                type="button"
                                className="tc-button px-3 py-1.5 text-xs text-danger"
                                onClick={() => void onArchive(template)}
                                disabled={busy}
                              >
                                Archivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="tc-button px-3 py-1.5 text-xs"
                                onClick={() => void onRestore(template)}
                                disabled={busy}
                              >
                                Restaurar
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}