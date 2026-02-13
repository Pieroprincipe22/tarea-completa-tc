'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_API_BASE, readTcSession, type TcSession, TC_LS_KEYS } from '@/lib/tc/session';
import { errMsg, getCount, isRecord, normalizeList, resolveCorePaths, tcGet, type TcApiPaths } from '@/lib/tc/api';

type LoadState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string; code?: number };

type TenantPing = { ok: true; companyId: string; userId: string; role: string };
type Health = { ok: boolean };

type MaintenanceReport = { id: string; performedAt?: string; state?: string; templateName?: string };
type MaintenanceTemplate = { id: string; name?: string; isActive?: boolean };

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

function StatCard({
  title,
  value,
  href,
  note,
}: {
  title: string;
  value: React.ReactNode;
  href?: string;
  note?: string;
}) {
  const body = (
    <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4 shadow-sm">
      <div className="text-sm text-slate-300">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {note ? <div className="mt-2 text-xs text-slate-400">{note}</div> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block hover:opacity-95 active:opacity-90 transition">
      {body}
    </Link>
  ) : (
    body
  );
}

function formatDate(input?: string) {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString();
}

function parseHealth(json: unknown): Health | null {
  if (!isRecord(json)) return null;
  return typeof json.ok === 'boolean' ? { ok: json.ok } : null;
}

function parseTenantPing(json: unknown): TenantPing | null {
  if (!isRecord(json)) return null;
  if (json.ok !== true) return null;

  const companyId = json.companyId;
  const userId = json.userId;
  const role = json.role;

  if (typeof companyId !== 'string' || typeof userId !== 'string' || typeof role !== 'string') return null;
  return { ok: true, companyId, userId, role };
}

export default function DashboardPage() {
  const [session, setSession] = useState<TcSession | null>(() => readTcSession());
  const ready = useMemo(() => !!session, [session]);

  const [paths, setPaths] = useState<LoadState<TcApiPaths>>({ status: 'idle' });
  const [health, setHealth] = useState<LoadState<Health>>({ status: 'idle' });
  const [tenant, setTenant] = useState<LoadState<TenantPing>>({ status: 'idle' });

  const [customersCount, setCustomersCount] = useState<LoadState<number>>({ status: 'idle' });
  const [sitesCount, setSitesCount] = useState<LoadState<number>>({ status: 'idle' });
  const [assetsCount, setAssetsCount] = useState<LoadState<number>>({ status: 'idle' });

  const [reports, setReports] = useState<LoadState<MaintenanceReport[]>>({ status: 'idle' });
  const [templates, setTemplates] = useState<LoadState<MaintenanceTemplate[]>>({ status: 'idle' });

  useEffect(() => {
    if (!ready || !session) return;

    let cancelled = false;

    (async () => {
      setPaths({ status: 'loading' });
      setHealth({ status: 'loading' });
      setTenant({ status: 'loading' });
      setCustomersCount({ status: 'loading' });
      setSitesCount({ status: 'loading' });
      setAssetsCount({ status: 'loading' });
      setReports({ status: 'loading' });
      setTemplates({ status: 'loading' });

      let resolved: TcApiPaths;
      try {
        resolved = await resolveCorePaths(session);
        if (!cancelled) setPaths({ status: 'ok', data: resolved });
      } catch (e: unknown) {
        if (!cancelled) setPaths({ status: 'error', error: errMsg(e) });
        return;
      }

      try {
        const r = await tcGet(session, '/health');
        const parsed = parseHealth(r.json);
        if (!cancelled) {
          if (r.code >= 200 && r.code < 300 && parsed) setHealth({ status: 'ok', data: parsed });
          else setHealth({ status: 'error', error: 'Respuesta inválida de /health', code: r.code });
        }
      } catch (e: unknown) {
        if (!cancelled) setHealth({ status: 'error', error: errMsg(e) });
      }

      try {
        const r = await tcGet(session, '/tenant/ping');
        const parsed = parseTenantPing(r.json);
        if (!cancelled) {
          if (r.code >= 200 && r.code < 300 && parsed) setTenant({ status: 'ok', data: parsed });
          else
            setTenant({
              status: 'error',
              error: r.code === 403 ? 'No perteneces a la company (403)' : 'Tenant inválido',
              code: r.code,
            });
        }
      } catch (e: unknown) {
        if (!cancelled) setTenant({ status: 'error', error: errMsg(e) });
      }

      try {
        const [c, s, a] = await Promise.all([
          getCount(session, resolved.customers),
          getCount(session, resolved.sites),
          getCount(session, resolved.assets),
        ]);
        if (!cancelled) {
          setCustomersCount({ status: 'ok', data: c });
          setSitesCount({ status: 'ok', data: s });
          setAssetsCount({ status: 'ok', data: a });
        }
      } catch (e: unknown) {
        const m = errMsg(e);
        if (!cancelled) {
          setCustomersCount({ status: 'error', error: m });
          setSitesCount({ status: 'error', error: m });
          setAssetsCount({ status: 'error', error: m });
        }
      }

      try {
        const r = await tcGet(session, resolved.reports);
        if (!cancelled) {
          if (r.code === 404) setReports({ status: 'error', error: `Endpoint reports no disponible: ${resolved.reports}`, code: 404 });
          else {
            const { items } = normalizeList<MaintenanceReport>(r.json);
            setReports({ status: 'ok', data: items.slice(0, 5) });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setReports({ status: 'error', error: errMsg(e) });
      }

      try {
        const r = await tcGet(session, resolved.templates);
        if (!cancelled) {
          if (r.code === 404) setTemplates({ status: 'error', error: `Endpoint templates no disponible: ${resolved.templates}`, code: 404 });
          else {
            const { items } = normalizeList<MaintenanceTemplate>(r.json);
            setTemplates({ status: 'ok', data: items.slice(0, 5) });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setTemplates({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  const reportsOk = reports.status === 'ok' ? reports.data : [];
  const templatesOk = templates.status === 'ok' ? templates.data : [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">KPIs + actividad reciente.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className="rounded-xl bg-slate-900/60 ring-1 ring-white/10 px-3 py-2 text-sm text-white hover:opacity-95" href="/customers">
            Customers
          </Link>
          <Link className="rounded-xl bg-slate-900/60 ring-1 ring-white/10 px-3 py-2 text-sm text-white hover:opacity-95" href="/maintenance-reports">
            Reports
          </Link>
          <Link className="rounded-xl bg-slate-900/60 ring-1 ring-white/10 px-3 py-2 text-sm text-white hover:opacity-95" href="/maintenance-templates">
            Templates
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
        {!session ? (
          <div className="text-sm text-slate-300">
            No hay sesión en localStorage. Debes tener:
            <div className="mt-2 grid gap-1 text-xs text-slate-400">
              <div>- {TC_LS_KEYS.apiBase} (ej: {DEFAULT_API_BASE})</div>
              <div>- {TC_LS_KEYS.companyId}</div>
              <div>- {TC_LS_KEYS.userId}</div>
            </div>

            <div className="mt-3 flex gap-2">
              <Link className="rounded-xl bg-slate-800/60 ring-1 ring-white/10 px-3 py-2 text-xs text-white hover:opacity-95" href="/login">
                Ir a /login
              </Link>
              <button
                className="rounded-xl bg-slate-800/60 ring-1 ring-white/10 px-3 py-2 text-xs text-white hover:opacity-95"
                onClick={() => setSession(readTcSession())}
                type="button"
              >
                Releer sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-300">
              <div>
                API: <span className="text-white">{session.apiBase}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                companyId: <span className="text-slate-200">{session.companyId}</span> · userId:{' '}
                <span className="text-slate-200">{session.userId}</span>
              </div>
              {paths.status === 'ok' ? (
                <div className="mt-2 text-xs text-slate-500">
                  Endpoints: customers={paths.data.customers}, sites={paths.data.sites}, assets={paths.data.assets}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {health.status === 'ok' ? <Badge tone="ok">API OK</Badge> : health.status === 'loading' ? <Badge tone="muted">API…</Badge> : <Badge tone="bad">API FAIL</Badge>}
              {tenant.status === 'ok' ? <Badge tone="ok">Tenant OK · {tenant.data.role}</Badge> : tenant.status === 'loading' ? <Badge tone="muted">Tenant…</Badge> : <Badge tone="bad">Tenant FAIL</Badge>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Customers" href="/customers" value={customersCount.status === 'ok' ? customersCount.data : customersCount.status === 'loading' ? '…' : '—'} note={customersCount.status === 'error' ? customersCount.error : undefined} />
        <StatCard title="Sites" href="/sites" value={sitesCount.status === 'ok' ? sitesCount.data : sitesCount.status === 'loading' ? '…' : '—'} note={sitesCount.status === 'error' ? sitesCount.error : undefined} />
        <StatCard title="Assets" href="/assets" value={assetsCount.status === 'ok' ? assetsCount.data : assetsCount.status === 'loading' ? '…' : '—'} note={assetsCount.status === 'error' ? assetsCount.error : undefined} />
        <StatCard title="Reports (recientes)" href="/maintenance-reports" value={reportsOk.length} note={reports.status === 'error' ? reports.error : undefined} />
        <StatCard title="Templates (recientes)" href="/maintenance-templates" value={templatesOk.length} note={templates.status === 'error' ? templates.error : undefined} />
        <StatCard title="WorkOrders" value="Siguiente" note="Cuando esto sea usable, arrancamos Paso 32." />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Últimos Reports</h2>
            <Link className="text-xs text-slate-300 hover:text-white" href="/maintenance-reports">
              Ver todos →
            </Link>
          </div>

          <div className="mt-3">
            {reports.status === 'loading' ? (
              <div className="text-sm text-slate-400">Cargando…</div>
            ) : reports.status === 'error' ? (
              <div className="text-sm text-red-200">{reports.error}</div>
            ) : reportsOk.length === 0 ? (
              <div className="text-sm text-slate-400">Sin datos todavía.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {reportsOk.map((r) => (
                  <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">{r.templateName || 'Maintenance Report'}</div>
                      <div className="text-xs text-slate-400">{formatDate(r.performedAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={r.state === 'FINAL' ? 'ok' : r.state === 'DRAFT' ? 'warn' : 'muted'}>{r.state || '—'}</Badge>
                      <Link className="text-xs text-slate-300 hover:text-white" href={`/maintenance-reports/${r.id}`}>
                        Abrir
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Últimos Templates</h2>
            <Link className="text-xs text-slate-300 hover:text-white" href="/maintenance-templates">
              Ver todos →
            </Link>
          </div>

          <div className="mt-3">
            {templates.status === 'loading' ? (
              <div className="text-sm text-slate-400">Cargando…</div>
            ) : templates.status === 'error' ? (
              <div className="text-sm text-red-200">{templates.error}</div>
            ) : templatesOk.length === 0 ? (
              <div className="text-sm text-slate-400">Sin datos todavía.</div>
            ) : (
              <ul className="divide-y divide-white/10">
                {templatesOk.map((t) => (
                  <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">{t.name || 'Maintenance Template'}</div>
                      <div className="text-xs text-slate-400">{t.isActive === false ? 'Inactivo' : 'Activo'}</div>
                    </div>
                    <Link className="text-xs text-slate-300 hover:text-white" href={`/maintenance-templates/${t.id}`}>
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
