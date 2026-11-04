'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import TemplateEditor from '@/components/templates/TemplateEditor';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import TemplatePreview, {
  previewFromTemplate,
} from '@/components/templates/TemplatePreview';
import { errMsg, tcGet } from '@/lib/tc/api';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';
import {
  apiMessages,
  parseTemplate,
  templateToDraft,
  type Template,
} from '@/lib/tc/templates';

type Load =
  | { status: 'loading' }
  | { status: 'ok'; data: Template }
  | { status: 'error'; error: string };

export default function MaintenanceTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');

  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<Load>({ status: 'loading' });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const current = readTcSession();
    setSession(current);

    // Al venir de "Crear plantilla" o de una plantilla de partida se avisa
    // de que ya está guardada.
    const query = new URLSearchParams(window.location.search);
    if (query.get('creada') === '1') {
      setNotice('Plantilla creada. Ya la pueden usar tus técnicos.');
      window.history.replaceState(null, '', window.location.pathname);
    } else if (query.get('copiada') === '1') {
      setNotice(
        'Plantilla copiada en tu empresa. Revisa los puntos y adáptalos a tus equipos: los cambios solo te afectan a ti.',
      );
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!current || !id) {
      setState({
        status: 'error',
        error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await tcGet<unknown>(
          current,
          `/maintenance-templates/${id}`,
        );
        if (cancelled) return;
        const template =
          res.code >= 200 && res.code < 300 ? parseTemplate(res.json) : null;
        if (!template) {
          setState({
            status: 'error',
            error:
              res.code === 404
                ? 'Esta plantilla no existe o es de otra empresa.'
                : apiMessages(res.json, 'No se pudo cargar la plantilla.')[0],
          });
          return;
        }
        setState({ status: 'ok', data: template });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', error: errMsg(err) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando plantilla…</p>
      </div>
    );
  }

  if (state.status === 'error' || !session) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-danger">
            {state.status === 'error' ? state.error : 'Tu sesión ha caducado.'}
          </p>
          <Link href="/maintenance-templates" className="tc-button mt-4">
            Volver a las plantillas
          </Link>
        </div>
      </div>
    );
  }

  const template = state.data;

  // El administrador la edita; el técnico la consulta.
  if (isAdminRole(session.role)) {
    return (
      <TemplateEditor
        key={template.id}
        session={session}
        templateId={template.id}
        initial={templateToDraft(template)}
        archived={!template.isActive}
        notice={notice}
      />
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
        <h1 className="tc-title mt-2">{template.name}</h1>
        {template.category || template.description ? (
          <p className="tc-subtitle mt-1">
            {[template.category, template.description]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </header>
      <TemplatePreview sections={previewFromTemplate(template)} />
    </div>
  );
}