'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TemplateEditor from '@/components/templates/TemplateEditor';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';
import { emptyDraft } from '@/lib/tc/templates';

export default function NewMaintenanceTemplatePage() {
  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);

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

  if (!session || !isAdminRole(session.role)) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <h1 className="text-lg font-semibold text-ink">Nueva plantilla</h1>
          <p className="mt-2 text-sm text-muted">
            Solo el administrador de tu empresa puede crear plantillas.
          </p>
          <Link href="/maintenance-templates" className="tc-button mt-4">
            Volver a las plantillas
          </Link>
        </div>
      </div>
    );
  }

  return <TemplateEditor session={session} initial={emptyDraft()} />;
}