'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type ReportItem = {
  id: string;
  sortOrder?: number;
  title?: string;
  description?: string;
  status?: string;
  valueText?: string | null;
  valueChoice?: string | null;
  valueNumber?: number | null;
  notes?: string | null;
};

type ReportDetail = {
  id: string;
  performedAt?: string;
  state?: string;
  templateName?: string;
  templateDesc?: string;
  summary?: string | null;
  notes?: string | null;
  items: ReportItem[];
};

function formatDate(input?: string) {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString();
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asNum(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'ok' | 'warn' | 'bad' | 'muted';
}) {
  const cls =
    tone === 'ok'
      ? 'bg-green-600/20 text-green-200 ring-green-600/30'
      : tone === 'warn'
        ? 'bg-yellow-600/20 text-yellow-200 ring-yellow-600/30'
        : tone === 'bad'
          ? 'bg-red-600/20 text-red-200 ring-red-600/30'
          : 'bg-slate-600/20 text-slate-200 ring-slate-600/30';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function stateTone(state?: string): 'ok' | 'warn' | 'bad' | 'muted' {
  switch (state) {
    case 'COMPLETED':
    case 'FINAL':
      return 'ok';
    case 'DRAFT':
      return 'warn';
    case 'CANCELLED':
      return 'bad';
    default:
      return 'muted';
  }
}

function joinPath(base: string, suffix: string) {
  if (!base) return suffix;
  return base.endsWith('/') ? `${base}${suffix}` : `${base}/${suffix}`;
}

function itemValue(it: ReportItem): string {
  const candidates: Array<string | null | undefined> = [
    it.valueChoice,
    it.valueText,
    it.valueNumber != null ? String(it.valueNumber) : null,
    it.notes ? `📝 ${it.notes}` : null,
  ];

  return candidates.find((v) => v != null && String(v).trim() !== '') ?? '—';
}

function parseItem(raw: unknown): ReportItem {
  const o = asObj(raw);

  let valueNumber: number | null = null;
  const rawValueNumber = o.valueNumber;
  const rawValueText = o.valueText ?? o.value ?? o.resultValue ?? null;

  if (typeof rawValueNumber === 'number') {
    valueNumber = rawValueNumber;
  } else if (typeof rawValueText === 'string' && rawValueText.trim() !== '') {
    const parsed = Number(rawValueText);
    valueNumber = Number.isFinite(parsed) ? parsed : null;
  }

  return {
    id: String(o.id ?? ''),
    sortOrder: asNum(o.sortOrder) ?? asNum(o.itemOrder),
    title: asStr(o.title),
    description: asStr(o.description),
    status: asStr(o.status),
    valueText:
      typeof rawValueText === 'string'
        ? rawValueText
        : null,
    valueChoice:
      typeof o.valueChoice === 'string'
        ? o.valueChoice
        : null,
    valueNumber,
    notes:
      typeof o.notes === 'string'
        ? o.notes
        : typeof o.resultNotes === 'string'
          ? (o.resultNotes as string)
          : null,
  };
}

function parseItemsFromAny(json: unknown): ReportItem[] {
  const root = asObj(json);
  const rawItems = root.items ?? root.reportItems ?? root.maintenanceReportItems;

  const items = asArr(rawItems)
    .map(parseItem)
    .filter((item) => item.id);

  items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return items;
}

function parseDetail(json: unknown, fallbackId: string): ReportDetail {
  const root = asObj(json);

  return {
    id: String(root.id ?? fallbackId),
    performedAt:
      asStr(root.performedAt) ??
      asStr(root.completedAt) ??
      asStr(root.createdAt),
    state: asStr(root.state) ?? asStr(root.status),
    templateName:
      asStr(root.templateName) ??
      asStr(root.title) ??
      'Maintenance Report',
    templateDesc:
      asStr(root.templateDesc) ??
      asStr(root.description),
    summary:
      typeof root.summary === 'string'
        ? root.summary
        : typeof root.description === 'string'
          ? root.description
          : null,
    notes: typeof root.notes === 'string' ? root.notes : null,
    items: parseItemsFromAny(json),
  };
}

export default function MaintenanceReportDetailPage() {
  const params = useParams();
  const idRaw = (params as { id?: string | string[] })?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : String(idRaw ?? '');

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<LoadState<ReportDetail>>({ status: 'loading' });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!session) return;
    if (!id) {
      setState({ status: 'error', error: 'ID de reporte inválido.' });
      return;
    }

    let cancelled = false;

    (async () => {
      setState({ status: 'loading' });

      try {
        const paths = resolveCorePaths(session);
        const detailUrl = joinPath(paths.reports, id);
        const r = await tcGet(session, detailUrl);

        if (cancelled) return;

        if (r.code === 404) {
          setState({
            status: 'error',
            error: `No existe el reporte o endpoint: ${detailUrl}`,
          });
          return;
        }

        if (r.code === 401) {
          setState({
            status: 'error',
            error: '401 Unauthorized. Revisa tu sesión.',
          });
          return;
        }

        if (r.code === 403) {
          setState({
            status: 'error',
            error: '403 Forbidden (tenant). Revisa companyId/userId.',
          });
          return;
        }

        if (r.code < 200 || r.code >= 300) {
          setState({
            status: 'error',
            error: `HTTP ${r.code}`,
          });
          return;
        }

        let detail = parseDetail(r.json, id);

        if (detail.items.length === 0) {
          const itemsUrl = joinPath(detailUrl, 'items');
          const ri = await tcGet(session, itemsUrl);

          if (!cancelled && ri.code >= 200 && ri.code < 300) {
            const { items: listItems } = normalizeList<unknown>(ri.json);
            detail = {
              ...detail,
              items: parseItemsFromAny({ items: listItems }),
            };
          }
        }

        if (!cancelled) {
          setState({ status: 'ok', data: detail });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setState({ status: 'error', error: errMsg(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, session, id]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4 text-sm text-slate-400">
          Cargando sesión…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="text-sm text-red-200">
          Sin sesión tenant. Ve a{' '}
          <Link className="text-white underline" href="/login">
            /login
          </Link>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Report</h1>
          <p className="mt-1 text-sm text-slate-400">Detalle read-only.</p>
        </div>

        <Link
          href="/maintenance-reports"
          className="text-sm text-slate-300 hover:text-white"
        >
          ← Volver
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
        {state.status === 'loading' ? (
          <div className="text-sm text-slate-400">Cargando…</div>
        ) : state.status === 'error' ? (
          <div className="text-sm text-red-200">{state.error}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">
                  {state.data.templateName ?? 'Maintenance Report'}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Fecha:{' '}
                  <span className="text-slate-200">
                    {formatDate(state.data.performedAt)}
                  </span>{' '}
                  · ID: <span className="text-slate-200">{state.data.id}</span>
                </div>

                {state.data.templateDesc ? (
                  <div className="mt-2 text-sm text-slate-300">
                    {state.data.templateDesc}
                  </div>
                ) : null}

                {state.data.notes ? (
                  <div className="mt-2 text-sm text-slate-300">
                    Notas: {state.data.notes}
                  </div>
                ) : null}
              </div>

              <div>
                <Badge tone={stateTone(state.data.state)}>
                  {state.data.state ?? '—'}
                </Badge>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-white">Items</h2>

              {state.data.items.length === 0 ? (
                <div className="mt-2 text-sm text-slate-400">
                  Este reporte no trae items en la respuesta.
                </div>
              ) : (
                <div className="mt-3 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-300">
                      <tr className="border-b border-white/10">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Título</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Valor</th>
                      </tr>
                    </thead>

                    <tbody className="text-slate-100">
                      {state.data.items.map((it) => (
                        <tr key={it.id} className="border-b border-white/5">
                          <td className="py-2 pr-3">{it.sortOrder ?? '—'}</td>
                          <td className="py-2 pr-3">
                            <div className="text-white">{it.title ?? '—'}</div>
                            {it.description ? (
                              <div className="text-xs text-slate-400">
                                {it.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3">{it.status ?? '—'}</td>
                          <td className="py-2 pr-3">{itemValue(it)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}