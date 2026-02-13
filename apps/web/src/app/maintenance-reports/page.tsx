'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

type MaintenanceReport = {
  id: string;
  performedAt?: string;
  state?: string;
  templateName?: string;
};

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function formatDate(input?: string) {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString();
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'bad' | 'muted' }) {
  const cls =
    tone === 'ok'
      ? 'bg-green-600/20 text-green-200 ring-green-600/30'
      : tone === 'warn'
        ? 'bg-yellow-600/20 text-yellow-200 ring-yellow-600/30'
        : tone === 'bad'
          ? 'bg-red-600/20 text-red-200 ring-red-600/30'
          : 'bg-slate-600/20 text-slate-200 ring-slate-600/30';

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}>{children}</span>;
}

export default function MaintenanceReportsPage() {
  const session = useMemo<TcSession | null>(() => readTcSession(), []);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState<MaintenanceReport[]>>({ status: 'loading' });

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      setState({ status: 'loading' });
      try {
        const paths = await resolveCorePaths(session);
        const r = await tcGet(session, paths.reports);

        if (cancelled) return;

        if (r.code === 404) {
          setState({ status: 'error', error: `Endpoint no existe: ${paths.reports}` });
          return;
        }
        if (r.code === 401) {
          setState({ status: 'error', error: '401 Unauthorized. Revisa tu sesión (tc.*) o tu AuthGate.' });
          return;
        }
        if (r.code === 403) {
          setState({ status: 'error', error: '403 Forbidden. No perteneces a la company (UserCompany).' });
          return;
        }

        const { items } = normalizeList<MaintenanceReport>(r.json);

        // Orden: performedAt desc (si existe)
        items.sort((a, b) => {
          const da = a.performedAt ? new Date(a.performedAt).getTime() : 0;
          const db = b.performedAt ? new Date(b.performedAt).getTime() : 0;
          return db - da;
        });

        setState({ status: 'ok', data: items });
      } catch (e: unknown) {
        if (!cancelled) setState({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, reloadKey]);

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Maintenance Reports</h1>
            <p className="mt-1 text-sm text-slate-400">Listado read-only.</p>
          </div>
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            ← Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
          <div className="text-sm text-red-200">
            Sin sesión tenant (localStorage). Ve a{' '}
            <Link className="text-white underline" href="/login">
              /login
            </Link>{' '}
            y configura <span className="text-white">tc.*</span>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Maintenance Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Listado read-only.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl bg-slate-900/60 ring-1 ring-white/10 px-3 py-2 text-sm text-white hover:opacity-95"
            onClick={() => setReloadKey((x) => x + 1)}
          >
            Refresh
          </button>
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
        {state.status === 'loading' ? (
          <div className="text-sm text-slate-400">Cargando…</div>
        ) : state.status === 'error' ? (
          <div className="text-sm text-red-200">{state.error}</div>
        ) : state.data.length === 0 ? (
          <div className="text-sm text-slate-400">No hay reports todavía.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-300">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>

              <tbody className="text-slate-100">
                {state.data.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">{formatDate(r.performedAt)}</td>
                    <td className="py-2 pr-3">{r.templateName || '—'}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={r.state === 'FINAL' ? 'ok' : r.state === 'DRAFT' ? 'warn' : 'muted'}>
                        {r.state || '—'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Link className="text-slate-300 hover:text-white" href={`/maintenance-reports/${r.id}`}>
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
