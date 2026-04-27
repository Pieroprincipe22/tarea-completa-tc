'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  getCount,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';
import {
  isAdminSession,
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type Health = {
  ok: boolean;
};

type TenantPing = {
  ok: true;
  companyId: string;
  userId: string;
  role: string;
};

type DashboardCounts = {
  customers: number;
  sites: number;
  assets: number;
  reports: number;
  pendingReports: number;
  workOrders: number;
};

type MaintenanceReportRow = {
  id: string;
  status?: string | null;
  summary?: string | null;
  recommendations?: string | null;
};

type Load<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string; code?: number };

function parseHealth(value: unknown): Health | null {
  if (!isRecord(value)) return null;

  return typeof value.ok === 'boolean'
    ? {
        ok: value.ok,
      }
    : null;
}

function parseTenant(value: unknown): TenantPing | null {
  if (!isRecord(value)) return null;

  if (value.ok !== true) return null;

  const companyId = value.companyId;
  const userId = value.userId;
  const role = value.role;

  if (
    typeof companyId !== 'string' ||
    typeof userId !== 'string' ||
    typeof role !== 'string'
  ) {
    return null;
  }

  return {
    ok: true,
    companyId,
    userId,
    role,
  };
}

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseReport(value: unknown): MaintenanceReportRow | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);

  if (!id) return null;

  return {
    id,
    status: asNullableStr(value.status),
    summary: asNullableStr(value.summary),
    recommendations: asNullableStr(value.recommendations),
  };
}

function normalizeStatus(status?: string | null): string {
  return String(status ?? '').trim().toUpperCase();
}

function MetricCard({
  label,
  value,
  helper,
  href,
}: {
  label: string;
  value: string | number;
  helper?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 transition hover:border-sky-500/40">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
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
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        ok
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
      }`}
    >
      {text}
    </span>
  );
}

function QuickAction({
  title,
  description,
  href,
  badge,
  tone = 'default',
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60'
      : tone === 'success'
        ? 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/60'
        : 'border-white/10 bg-slate-950/40 hover:border-sky-500/50';

  return (
    <Link
      href={href}
      className={`block rounded-3xl border p-5 transition ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {badge ? (
          <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-200">
            {badge}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);

  const [health, setHealth] = useState<Load<Health>>({
    status: 'idle',
  });
  const [tenant, setTenant] = useState<Load<TenantPing>>({
    status: 'idle',
  });
  const [counts, setCounts] = useState<Load<DashboardCounts>>({
    status: 'idle',
  });

  const [reloadKey, setReloadKey] = useState(0);

  const ready = useMemo(() => mounted && !!session, [mounted, session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!ready || !session) return;

    const activeSession = session;
    const paths = resolveCorePaths(activeSession);

    let cancelled = false;

    async function loadDashboard() {
      setHealth({ status: 'loading' });
      setTenant({ status: 'loading' });
      setCounts({ status: 'loading' });

      try {
        const response = await tcGet(activeSession, paths.health);
        const parsed = parseHealth(response.json);

        if (!cancelled) {
          if (response.code >= 200 && response.code < 300 && parsed) {
            setHealth({
              status: 'ok',
              data: parsed,
            });
          } else {
            setHealth({
              status: 'error',
              error: 'Respuesta inválida /health',
              code: response.code,
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setHealth({
            status: 'error',
            error: errMsg(error),
          });
        }
      }

      try {
        const response = await tcGet(activeSession, paths.tenantPing);
        const parsed = parseTenant(response.json);

        if (!cancelled) {
          if (response.code >= 200 && response.code < 300 && parsed) {
            setTenant({
              status: 'ok',
              data: parsed,
            });
          } else {
            setTenant({
              status: 'error',
              error: response.code === 403 ? '403 Not a member' : 'Tenant inválido',
              code: response.code,
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setTenant({
            status: 'error',
            error: errMsg(error),
          });
        }
      }

      try {
        const [
          customers,
          sites,
          assets,
          workOrders,
          reportsResponse,
        ] = await Promise.all([
          getCount(activeSession, paths.customers),
          getCount(activeSession, paths.sites),
          getCount(activeSession, paths.assets),
          getCount(activeSession, paths.workOrders),
          tcGet(activeSession, paths.reports),
        ]);

        if (cancelled) return;

        let reports = 0;
        let pendingReports = 0;

        if (reportsResponse.code >= 200 && reportsResponse.code < 300) {
          const { items } = normalizeList<unknown>(reportsResponse.json);
          const parsedReports = items
            .map(parseReport)
            .filter((item): item is MaintenanceReportRow => !!item);

          reports = parsedReports.length;
          pendingReports = parsedReports.filter(
            (report) => normalizeStatus(report.status) === 'SUBMITTED',
          ).length;
        }

        setCounts({
          status: 'ok',
          data: {
            customers,
            sites,
            assets,
            workOrders,
            reports,
            pendingReports,
          },
        });
      } catch (error) {
        if (!cancelled) {
          setCounts({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [ready, reloadKey, session]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Cargando dashboard...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black">Sin sesión</h1>
          <p className="mt-2 text-sm">
            No hay una sesión activa para cargar el panel principal.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
            >
              Ir a login
            </Link>

            <button
              type="button"
              onClick={() => setSession(readTcSession())}
              className="inline-flex rounded-2xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Releer sesión
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!isAdminSession(session)) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <section className="mx-auto max-w-5xl rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
          <h1 className="text-2xl font-black">Panel no disponible para este rol</h1>
          <p className="mt-2 text-sm">
            Tu sesión actual no tiene rol administrador. Vuelve a tu panel
            correspondiente.
          </p>

          <Link
            href={homePath}
            className="mt-5 inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
          >
            Ir a mi panel
          </Link>
        </section>
      </main>
    );
  }

  const apiOk = health.status === 'ok' && health.data.ok;
  const tenantOk = tenant.status === 'ok' && tenant.data.ok === true;

  const dashboardCounts =
    counts.status === 'ok'
      ? counts.data
      : {
          customers: 0,
          sites: 0,
          assets: 0,
          reports: 0,
          pendingReports: 0,
          workOrders: 0,
        };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Plataforma operativa
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Bienvenido a TC Mantenimiento
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Administra clientes, activos, órdenes de trabajo, partes técnicos
                y revisión operativa desde un solo panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Actualizar
              </button>

              <Link
                href="/admin/dashboard/maintenance-reports"
                className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
              >
                Partes pendientes
              </Link>

              <Link
                href="/work-orders"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Work orders
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Usuario
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {session.email ?? session.name ?? session.userId}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {session.name ?? 'Sesión administrativa'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Empresa
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {session.companyName ?? session.companyId}
            </p>
            <p className="mt-1 text-xs text-slate-500">{session.companyId}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Rol
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {session.role ?? (tenant.status === 'ok' ? tenant.data.role : '—')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill
                ok={apiOk}
                text={
                  health.status === 'loading'
                    ? 'API verificando'
                    : apiOk
                      ? 'API operativa'
                      : 'API con incidencia'
                }
              />
              <StatusPill
                ok={tenantOk}
                text={
                  tenant.status === 'loading'
                    ? 'Tenant verificando'
                    : tenantOk
                      ? 'Tenant válido'
                      : 'Tenant inválido'
                }
              />
            </div>
          </div>
        </section>

        {counts.status === 'error' ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm font-semibold text-rose-200">
            No se pudieron cargar todas las métricas: {counts.error}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Clientes"
            value={dashboardCounts.customers}
            helper="Clientes registrados"
            href="/customers"
          />
          <MetricCard
            label="Sites"
            value={dashboardCounts.sites}
            helper="Ubicaciones"
            href="/sites"
          />
          <MetricCard
            label="Activos"
            value={dashboardCounts.assets}
            helper="Máquinas / equipos"
            href="/assets"
          />
          <MetricCard
            label="Work orders"
            value={dashboardCounts.workOrders}
            helper="Órdenes de trabajo"
            href="/work-orders"
          />
          <MetricCard
            label="Partes"
            value={dashboardCounts.reports}
            helper="Partes técnicos"
            href="/maintenance-reports"
          />
          <MetricCard
            label="Pendientes"
            value={dashboardCounts.pendingReports}
            helper="Por revisar"
            href="/admin/dashboard/maintenance-reports"
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div>
            <h2 className="text-xl font-black">Accesos rápidos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Atajos a los módulos principales del sistema.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <QuickAction
              title="Partes pendientes de revisión"
              description="Bandeja donde administración revisa diagnóstico, incidencias, recomendaciones y piezas a pedir."
              href="/admin/dashboard/maintenance-reports"
              badge={`${dashboardCounts.pendingReports}`}
              tone="warning"
            />

            <QuickAction
              title="Todos los partes"
              description="Listado general de partes de trabajo, historial y revisiones anteriores."
              href="/maintenance-reports"
              badge={`${dashboardCounts.reports}`}
            />

            <QuickAction
              title="Work orders"
              description="Listado, creación, asignación y seguimiento de órdenes de trabajo."
              href="/work-orders"
              badge={`${dashboardCounts.workOrders}`}
            />

            <QuickAction
              title="Clientes"
              description="Gestión de clientes, empresas, contactos y datos principales."
              href="/customers"
            />

            <QuickAction
              title="Activos"
              description="Máquinas, equipos, ubicaciones, códigos internos y datos técnicos."
              href="/assets"
            />

            <QuickAction
              title="Personal / técnicos"
              description="Gestión de usuarios, técnicos, encargados y roles operativos."
              href="/admin/personal"
              tone="success"
            />
          </div>
        </section>
      </div>
    </main>
  );
}