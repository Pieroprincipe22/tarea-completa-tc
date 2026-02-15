'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, isRecord, resolveCorePaths, tcGet } from '@/lib/tc/api';

type TemplateItem = {
  id: string;
  sortOrder: number;
  label: string;
  type: string;
  required: boolean;
  unit: string | null;
  hint: string | null;
};

type TemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  intervalDays: number | null;
  items: TemplateItem[];
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function asNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function joinPath(base: string, id: string) {
  return base.endsWith('/') ? `${base}${id}` : `${base}/${id}`;
}

function prettyHttp(code: number) {
  if (code === 401) return '401 Unauthorized. Revisa tu sesión (companyId/userId).';
  if (code === 403) return '403 Forbidden (tenant). No eres miembro (UserCompany).';
  if (code === 404) return '404 Not Found. No existe el template.';
  return `HTTP ${code}`;
}

export default function MaintenanceTemplateDetailPage() {
  const session = useMemo(() => readTcSession(), []);
  const params = useParams<{ id: string }>();
  const id = String((params as { id?: string })?.id ?? '');

  const [state, setState] = useState<Load<TemplateDetail>>({ status: 'loading' });

  useEffect(() => {
    if (!session || !id) return;

    let cancelled = false;

    (async () => {
      try {
        setState({ status: 'loading' });

        const paths = resolveCorePaths(session);
        const url = joinPath(paths.templates, id);

        const r = await tcGet<unknown>(session, url);

        if (cancelled) return;
        if (r.code < 200 || r.code >= 300) {
          setState({ status: 'error', error: prettyHttp(r.code) });
          return;
        }

        if (!isRecord(r.json)) {
          setState({ status: 'error', error: 'Respuesta inválida (no es objeto).' });
          return;
        }

        const root = r.json;

        const rawItems = isRecord(root) ? (root.items as unknown) : undefined;
        const items = asArr(rawItems).map((it): TemplateItem => {
          if (!isRecord(it)) {
            return {
              id: '',
              sortOrder: 0,
              label: '',
              type: '',
              required: false,
              unit: null,
              hint: null,
            };
          }
          return {
            id: asStr(it.id),
            sortOrder: asNum(it.sortOrder, 0),
            label: asStr(it.label, '—'),
            type: asStr(it.type, '—'),
            required: asBool(it.required, false),
            unit: (typeof it.unit === 'string' ? it.unit : null),
            hint: (typeof it.hint === 'string' ? it.hint : null),
          };
        });

        items.sort((a, b) => a.sortOrder - b.sortOrder);

        const detail: TemplateDetail = {
          id: asStr(root.id, id),
          name: asStr(root.name, 'Maintenance Template'),
          description: (typeof root.description === 'string' ? root.description : null),
          isActive: asBool(root.isActive, true),
          intervalDays: (typeof root.intervalDays === 'number' ? root.intervalDays : null),
          items,
        };

        setState({ status: 'ok', data: detail });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, id]);

  if (!session) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Maintenance Template</h1>
        <p className="text-sm text-slate-300">Sin sesión tenant. Ve a /login.</p>
        <Link className="underline" href="/login">
          Ir a /login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link className="underline" href="/maintenance-templates">
          ← Volver
        </Link>
        <Link className="underline" href="/dashboard">
          Dashboard
        </Link>
      </div>

      {state.status === 'loading' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          Cargando…
        </div>
      ) : state.status === 'error' ? (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 text-red-200">
          {state.error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h1 className="text-xl font-semibold">{state.data.name}</h1>
            <div className="mt-2 text-sm text-slate-300">
              ID: {state.data.id}
              {state.data.intervalDays != null ? ` · IntervalDays: ${state.data.intervalDays}` : null}
              {' · '}
              {state.data.isActive ? 'Activo' : 'Inactivo'}
            </div>
            {state.data.description ? (
              <p className="mt-3 text-sm text-slate-200">{state.data.description}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="font-semibold">Items</h2>

            {state.data.items.length === 0 ? (
              <p className="mt-2 text-sm text-slate-300">Este template no trae items.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-300">
                    <tr>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Label</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Req</th>
                      <th className="text-left py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.items.map((it) => (
                      <tr key={it.id} className="border-t border-slate-800">
                        <td className="py-2">{it.sortOrder || '—'}</td>
                        <td className="py-2">
                          <div className="font-medium">{it.label}</div>
                          {it.hint ? (
                            <div className="text-xs text-slate-400">{it.hint}</div>
                          ) : null}
                        </td>
                        <td className="py-2">{it.type}</td>
                        <td className="py-2">{it.required ? 'Sí' : 'No'}</td>
                        <td className="py-2">{it.unit ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
