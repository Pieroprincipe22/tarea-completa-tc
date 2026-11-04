'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TemplatePreview, {
  previewFromTemplate,
} from '@/components/templates/TemplatePreview';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import { errMsg, tcGet, tcPost } from '@/lib/tc/api';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';
import {
  apiMessages,
  countSections,
  parseLibrary,
  parseTemplate,
  type LibraryTemplate,
} from '@/lib/tc/templates';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: LibraryTemplate[] }
  | { status: 'error'; error: string };

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function summary(template: LibraryTemplate): string {
  const items = template.items;
  const parts = [
    plural(items.length, 'punto', 'puntos'),
    plural(countSections(items), 'sección', 'secciones'),
  ];
  const measurements = items.filter((i) => i.type === 'NUMBER').length;
  if (measurements > 0)
    parts.push(plural(measurements, 'medición', 'mediciones'));
  return parts.join(' · ');
}

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [open, setOpen] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUse = isAdminRole(session?.role);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!session || !canUse) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await tcGet<unknown>(
          session,
          '/maintenance-templates/library',
        );
        if (cancelled) return;
        if (res.code < 200 || res.code >= 300) {
          setState({
            status: 'error',
            error: apiMessages(
              res.json,
              'No se pudieron cargar las plantillas de partida.',
            )[0],
          });
          return;
        }
        setState({ status: 'ok', data: parseLibrary(res.json) });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', error: errMsg(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, canUse]);

  async function onUse(template: LibraryTemplate) {
    if (!session || busyKey) return;
    setBusyKey(template.key);
    setError(null);
    try {
      const res = await tcPost<unknown>(
        session,
        `/maintenance-templates/library/${encodeURIComponent(template.key)}`,
      );
      const created =
        res.code >= 200 && res.code < 300 ? parseTemplate(res.json) : null;
      if (!created) {
        setError(
          apiMessages(res.json, 'No se pudo copiar la plantilla.').join(' '),
        );
        setBusyKey(null);
        return;
      }
      router.push(`/maintenance-templates/${created.id}?copiada=1`);
    } catch (err) {
      setError(errMsg(err));
      setBusyKey(null);
    }
  }

  if (!ready) {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  if (!session || !canUse) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <h1 className="text-lg font-semibold text-ink">
            Plantillas de partida
          </h1>
          <p className="mt-2 text-sm text-muted">
            {session
              ? 'Solo el administrador de tu empresa puede añadir plantillas.'
              : 'Tu sesión ha caducado.'}
          </p>
          <Link
            href={session ? '/maintenance-templates' : '/login'}
            className="tc-button mt-4"
          >
            {session ? 'Volver a las plantillas' : 'Iniciar sesión'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-page max-w-5xl">
      <header className="mb-6">
        <Link
          href="/maintenance-templates"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Plantillas
        </Link>
        <h1 className="tc-title mt-2">Plantillas de partida</h1>
        <p className="tc-subtitle mt-1 max-w-2xl">
          Hojas de mantenimiento ya preparadas por tipo de equipo. Copia la que
          necesites a tu empresa y adáptala: lo que cambies solo te afecta a ti.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="tc-panel p-6 text-sm text-muted">
          Cargando plantillas de partida…
        </div>
      ) : state.status === 'error' ? (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-6 text-sm text-danger">
          {state.error}
        </div>
      ) : state.data.length === 0 ? (
        <div className="tc-panel p-6 text-sm text-muted">
          Ahora mismo no hay plantillas de partida disponibles.
        </div>
      ) : (
        <ul className="space-y-4">
          {state.data.map((template) => {
            const expanded = open === template.key;
            const busy = busyKey === template.key;
            return (
              <li key={template.key} className="tc-panel overflow-hidden">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    {template.category ? (
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
                        {template.category}
                      </p>
                    ) : null}
                    <h2 className="mt-1 text-base font-semibold text-ink">
                      {template.name}
                    </h2>
                    {template.description ? (
                      <p className="mt-1 text-sm text-muted">
                        {template.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-subtle">
                      {summary(template)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      className="tc-button"
                      aria-expanded={expanded}
                      aria-controls={`preview-${template.key}`}
                      onClick={() => setOpen(expanded ? null : template.key)}
                    >
                      {expanded ? 'Ocultar puntos' : 'Ver puntos'}
                    </button>
                    <button
                      type="button"
                      className="tc-button-primary"
                      onClick={() => void onUse(template)}
                      disabled={busyKey !== null}
                    >
                      {busy ? 'Copiando…' : 'Usar esta plantilla'}
                    </button>
                  </div>
                </div>
                {expanded ? (
                  <div
                    id={`preview-${template.key}`}
                    className="border-t border-line bg-surface-2 p-4 sm:p-5"
                  >
                    <TemplatePreview
                      sections={previewFromTemplate({
                        id: template.key,
                        name: template.name,
                        category: template.category,
                        description: template.description,
                        isActive: true,
                        updatedAt: null,
                        items: template.items,
                      })}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}