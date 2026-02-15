'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, getCount, isRecord, resolveCorePaths, tcGet } from '@/lib/tc/api';

type Health = { ok: boolean };
type TenantPing = { ok: true; companyId: string; userId: string; role: string };

type Load<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string; code?: number };

function parseHealth(x: unknown): Health | null {
  if (!isRecord(x)) return null;
  const ok = x.ok;
  return typeof ok === 'boolean' ? { ok } : null;
}

function parseTenant(x: unknown): TenantPing | null {
  if (!isRecord(x)) return null;
  if (x.ok !== true) return null;
  const companyId = x.companyId;
  const userId = x.userId;
  const role = x.role;
  if (typeof companyId !== 'string' || typeof userId !== 'string' || typeof role !== 'string')
    return null;
  return { ok: true, companyId, userId, role };
}

export default function DashboardPage() {
  const [session, setSession] = useState<TcSession | null>(null);

  const [health, setHealth] = useState<Load<Health>>({ status: 'idle' });
  const [tenant, setTenant] = useState<Load<TenantPing>>({ status: 'idle' });
  const [counts, setCounts] = useState<Load<{ customers: number; sites: number; assets: number }>>({
    status: 'idle',
  });

  useEffect(() => {
    setSession(readTcSession());
  }, []);

  const ready = useMemo(() => !!session, [session]);

  useEffect(() => {
    if (!ready || !session) return;

    let cancelled = false;
    const paths = resolveCorePaths(session);

    setHealth({ status: 'loading' });
    setTenant({ status: 'loading' });
    setCounts({ status: 'loading' });

    (async () => {
      try {
        const r = await tcGet(session, paths.health);
        const parsed = parseHealth(r.json);
        if (!cancelled) {
          if (r.code >= 200 && r.code < 300 && parsed) setHealth({ status: 'ok', data: parsed });
          else setHealth({ status: 'error', error: 'Respuesta inválida /health', code: r.code });
        }
      } catch (e) {
        if (!cancelled) setHealth({ status: 'error', error: errMsg(e) });
      }

      try {
        const r = await tcGet(session, paths.tenantPing);
        const parsed = parseTenant(r.json);
        if (!cancelled) {
          if (r.code >= 200 && r.code < 300 && parsed) setTenant({ status: 'ok', data: parsed });
          else
            setTenant({
              status: 'error',
              error: r.code === 403 ? '403 Not a member' : 'Tenant inválido',
              code: r.code,
            });
        }
      } catch (e) {
        if (!cancelled) setTenant({ status: 'error', error: errMsg(e) });
      }

      try {
        const [customers, sites, assets] = await Promise.all([
          getCount(session, paths.customers),
          getCount(session, paths.sites),
          getCount(session, paths.assets),
        ]);
        if (!cancelled) setCounts({ status: 'ok', data: { customers, sites, assets } });
      } catch (e) {
        if (!cancelled) setCounts({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-200">Sin sesión tenant.</p>
          <div className="mt-3 flex gap-3">
            <Link className="underline" href="/login">
              Ir a /login
            </Link>
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
              type="button"
              onClick={() => setSession(readTcSession())}
            >
              Releer sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm text-slate-300">API</div>
          <div className="mt-1 font-medium">
            {health.status === 'ok' ? 'OK' : health.status === 'loading' ? '...' : 'FAIL'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm text-slate-300">Tenant</div>
          <div className="mt-1 font-medium">
            {tenant.status === 'ok'
              ? `OK · ${tenant.data.role}`
              : tenant.status === 'loading'
                ? '...'
                : 'FAIL'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm text-slate-300">Counts</div>
          <div className="mt-1 font-medium">
            {counts.status === 'ok'
              ? `${counts.data.customers} customers · ${counts.data.sites} sites · ${counts.data.assets} assets`
              : counts.status === 'loading'
                ? '...'
                : 'FAIL'}
          </div>
        </div>
      </div>
    </div>
  );
}
