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
  return typeof x.ok === 'boolean' ? { ok: x.ok } : null;
}

function parseTenant(x: unknown): TenantPing | null {
  if (!isRecord(x)) return null;
  if (x.ok !== true) return null;

  const companyId = x.companyId;
  const userId = x.userId;
  const role = x.role;

  if (
    typeof companyId !== 'string' ||
    typeof userId !== 'string' ||
    typeof role !== 'string'
  ) {
    return null;
  }

  return { ok: true, companyId, userId, role };
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="tc-panel p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {helper ? <div className="mt-2 text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

function StatusPill({
  ok,
  text,
}: {
  ok: boolean;
  text: string;
}) {
  return (
    <span
      className={
        ok
          ? 'inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300'
          : 'inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300'
      }
    >
      {text}
    </span>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const [health, setHealth] = useState<Load<Health>>({ status: 'idle' });
  const [tenant, setTenant] = useState<Load<TenantPing>>({ status: 'idle' });
  const [counts, setCounts] = useState<Load<{ customers: number; sites: number; assets: number }>>({
    status: 'idle',
  });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  const ready = useMemo(() => mounted && !!session, [mounted, session]);

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
          if (r.code >= 200 && r.code < 300 && parsed) {
            setHealth({ status: 'ok', data: parsed });
          } else {
            setHealth({ status: 'error', error: 'Respuesta inválida /health', code: r.code });
          }
        }
      } catch (e) {
        if (!cancelled) setHealth({ status: 'error', error: errMsg(e) });
      }

      try {
        const r = await tcGet(session, paths.tenantPing);
        const parsed = parseTenant(r.json);

        if (!cancelled) {
          if (r.code >= 200 && r.code < 300 && parsed) {
            setTenant({ status: 'ok', data: parsed });
          } else {
            setTenant({
              status: 'error',
              error: r.code === 403 ? '403 Not a member' : 'Tenant inválido',
              code: r.code,
            });
          }
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

        if (!cancelled) {
          setCounts({ status: 'ok', data: { customers, sites, assets } });
        }
      } catch (e) {
        if (!cancelled) setCounts({ status: 'error', error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="tc-panel p-6">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-white/5" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="tc-title">Dashboard</h1>
          <p className="tc-subtitle mt-2">Tu panel principal del sistema.</p>
        </div>

        <div className="tc-panel p-6">
          <p className="text-sm text-slate-200">Sin sesión tenant.</p>
          <div className="mt-4 flex gap-3">
            <Link className="tc-button-primary" href="/login">
              Ir a /login
            </Link>
            <button
              className="tc-button"
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

  const apiOk = health.status === 'ok' && health.data.ok;
  const tenantOk = tenant.status === 'ok' && tenant.data.ok === true;

  return (
    <div className="space-y-6">
      <section className="tc-panel overflow-hidden p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              Plataforma operativa
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Bienvenido a TC Mantenimiento
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Administra reportes, órdenes de trabajo y el flujo técnico de tu empresa
              desde un solo panel.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="tc-button-primary" href="/maintenance-reports">
                Ver reports
              </Link>
              <Link className="tc-button" href="/work-orders">
                Ver work orders
              </Link>
            </div>
          </div>

          <div className="tc-panel-soft p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Sesión activa
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-slate-500">Usuario</div>
                <div className="mt-1 font-medium text-white">
                  {session.email ?? session.name ?? session.userId}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Company</div>
                <div className="mt-1 font-medium text-white">
                  {session.companyName ?? session.companyId}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Role</div>
                <div className="mt-1 font-medium text-white">
                  {session.role ?? (tenant.status === 'ok' ? tenant.data.role : '—')}
                </div>
              </div>

              <div className="pt-2">
                <StatusPill ok={apiOk} text={apiOk ? 'API OK' : 'API pendiente'} />
              </div>

              <div>
                <StatusPill
                  ok={tenantOk}
                  text={tenantOk ? 'Tenant válido' : 'Tenant pendiente'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Customers"
          value={
            counts.status === 'ok'
              ? String(counts.data.customers)
              : counts.status === 'loading'
                ? '...'
                : '—'
          }
          helper="Clientes activos cargados desde la API"
        />

        <MetricCard
          label="Sites"
          value={
            counts.status === 'ok'
              ? String(counts.data.sites)
              : counts.status === 'loading'
                ? '...'
                : '—'
          }
          helper="Sedes registradas para operación"
        />

        <MetricCard
          label="Assets"
          value={
            counts.status === 'ok'
              ? String(counts.data.assets)
              : counts.status === 'loading'
                ? '...'
                : '—'
          }
          helper="Equipos disponibles en el tenant"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="tc-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Estado del sistema</h2>
              <p className="mt-1 text-sm text-slate-400">
                Verificación rápida de conexión y contexto tenant.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="tc-panel-soft p-4">
              <div className="text-xs text-slate-500">Health</div>
              <div className="mt-2 text-base font-medium text-white">
                {health.status === 'ok'
                  ? 'Operativo'
                  : health.status === 'loading'
                    ? 'Verificando...'
                    : 'Con incidencias'}
              </div>
            </div>

            <div className="tc-panel-soft p-4">
              <div className="text-xs text-slate-500">Tenant</div>
              <div className="mt-2 text-base font-medium text-white">
                {tenant.status === 'ok'
                  ? tenant.data.role
                  : tenant.status === 'loading'
                    ? 'Verificando...'
                    : 'Inválido'}
              </div>
            </div>
          </div>
        </div>

        <div className="tc-panel p-6">
          <h2 className="text-lg font-semibold text-white">Accesos rápidos</h2>
          <p className="mt-1 text-sm text-slate-400">
            Atajos a los módulos principales del sistema.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/maintenance-reports"
              className="tc-panel-soft p-4 transition hover:bg-white/[0.04]"
            >
              <div className="text-sm font-medium text-white">Maintenance Reports</div>
              <div className="mt-1 text-xs text-slate-400">
                Crear, revisar y abrir reportes.
              </div>
            </Link>

            <Link
              href="/maintenance-reports/new"
              className="tc-panel-soft p-4 transition hover:bg-white/[0.04]"
            >
              <div className="text-sm font-medium text-white">Nuevo reporte</div>
              <div className="mt-1 text-xs text-slate-400">
                Generar un reporte desde template.
              </div>
            </Link>

            <Link
              href="/work-orders"
              className="tc-panel-soft p-4 transition hover:bg-white/[0.04]"
            >
              <div className="text-sm font-medium text-white">Work Orders</div>
              <div className="mt-1 text-xs text-slate-400">
                Listado y detalle de órdenes de trabajo.
              </div>
            </Link>

            <Link
              href="/login"
              className="tc-panel-soft p-4 transition hover:bg-white/[0.04]"
            >
              <div className="text-sm font-medium text-white">Cambiar sesión</div>
              <div className="mt-1 text-xs text-slate-400">
                Volver al login y probar otro usuario.
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}