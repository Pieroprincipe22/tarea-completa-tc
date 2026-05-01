'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import {
  errMsg,
  getCount,
  isRecord,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';

type Health = {
  ok: boolean;
};

type TenantPing = {
  ok: true;
  companyId: string;
  userId: string;
  role: string;
};

type Counts = {
  customers: number;
  sites: number;
  assets: number;
};

type LoadState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string; code?: number };

function parseHealth(value: unknown): Health | null {
  if (!isRecord(value)) return null;

  return typeof value.ok === 'boolean' ? { ok: value.ok } : null;
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
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-slate-100">{value}</p>

      {helper ? (
        <p className="mt-2 text-sm leading-6 text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        ok
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
      }`}
    >
      {text}
    </span>
  );
}

function QuickAccessCard({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-800/70"
    >
      <h3 className="text-xl font-black text-slate-100">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>

      <span className="mt-5 inline-flex text-sm font-black text-sky-300 group-hover:underline">
        {label} →
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [health, setHealth] = useState<LoadState<Health>>({
    status: 'idle',
  });
  const [tenant, setTenant] = useState<LoadState<TenantPing>>({
    status: 'idle',
  });
  const [counts, setCounts] = useState<LoadState<Counts>>({
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

    async function loadDashboard() {
      if (!session) return;

      try {
        const response = await tcGet(session, paths.health);
        const parsed = parseHealth(response.json);

        if (!cancelled) {
          if (response.code >= 200 && response.code < 300 && parsed) {
            setHealth({ status: 'ok', data: parsed });
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
          setHealth({ status: 'error', error: errMsg(error) });
        }
      }

      try {
        const response = await tcGet(session, paths.tenantPing);
        const parsed = parseTenant(response.json);

        if (!cancelled) {
          if (response.code >= 200 && response.code < 300 && parsed) {
            setTenant({ status: 'ok', data: parsed });
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
          setTenant({ status: 'error', error: errMsg(error) });
        }
      }

      try {
        const [customers, sites, assets] = await Promise.all([
          getCount(session, paths.customers),
          getCount(session, paths.sites),
          getCount(session, paths.assets),
        ]);

        if (!cancelled) {
          setCounts({
            status: 'ok',
            data: {
              customers,
              sites,
              assets,
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setCounts({ status: 'error', error: errMsg(error) });
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        Cargando dashboard…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-black">Dashboard</h1>

          <p className="mt-2 text-slate-400">
            Tu panel principal del sistema.
          </p>

          <p className="mt-4 text-sm text-rose-300">Sin sesión tenant.</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
            >
              Ir a /login
            </Link>

            <button
              type="button"
              onClick={() => setSession(readTcSession())}
              className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Releer sesión
            </button>
          </div>
        </section>
      </main>
    );
  }

  const apiOk = health.status === 'ok' && health.data.ok;
  const tenantOk = tenant.status === 'ok' && tenant.data.ok === true;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                Plataforma operativa
              </p>

              <h1 className="mt-4 text-3xl font-black">
                Bienvenido a TC Mantenimiento
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Administra reportes, órdenes de trabajo, técnicos, clientes,
                inventario, pedidos y el flujo operativo de tu empresa desde un
                solo panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/maintenance-reports"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Ver partes
              </Link>

              <Link
                href="/work-orders"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
              >
                Ver work orders
              </Link>

              <Link
                href="/inventory"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
              >
                Inventario y pedidos
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Clientes"
            value={counts.status === 'ok' ? String(counts.data.customers) : '—'}
            helper="Clientes registrados en el tenant."
          />

          <MetricCard
            label="Sites"
            value={counts.status === 'ok' ? String(counts.data.sites) : '—'}
            helper="Ubicaciones técnicas de clientes."
          />

          <MetricCard
            label="Activos"
            value={counts.status === 'ok' ? String(counts.data.assets) : '—'}
            helper="Equipos, máquinas y activos registrados."
          />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black">Sesión activa</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Usuario
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-100">
                    {session.email ?? session.name ?? session.userId}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Empresa
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-100">
                    {session.companyName ?? session.companyId}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Rol
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-100">
                    {session.role ?? (tenant.status === 'ok' ? tenant.data.role : '—')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-black text-slate-100">
                Estado del sistema
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill
                  ok={apiOk}
                  text={
                    health.status === 'ok'
                      ? 'API operativa'
                      : health.status === 'loading'
                        ? 'API verificando'
                        : 'API con incidencia'
                  }
                />

                <StatusPill
                  ok={tenantOk}
                  text={
                    tenant.status === 'ok'
                      ? 'Tenant válido'
                      : tenant.status === 'loading'
                        ? 'Tenant verificando'
                        : 'Tenant inválido'
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black">Accesos rápidos</h2>

          <p className="mt-2 text-sm leading-7 text-slate-400">
            Atajos a los módulos principales del sistema.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickAccessCard
              title="Partes de trabajo"
              description="Crear, revisar y abrir reportes técnicos enviados por los técnicos."
              href="/maintenance-reports"
              label="Abrir partes"
            />

            <QuickAccessCard
              title="Nueva revisión"
              description="Generar un parte de trabajo desde una plantilla operativa."
              href="/new"
              label="Crear reporte"
            />

            <QuickAccessCard
              title="Work Orders"
              description="Listado, detalle, asignación de técnicos y control de estados."
              href="/work-orders"
              label="Abrir órdenes"
            />

            <QuickAccessCard
              title="Inventario y pedidos"
              description="Almacén, pedidos técnicos, movimientos, compras y reposiciones."
              href="/inventory"
              label="Abrir inventario"
            />

            <QuickAccessCard
              title="Clientes"
              description="Gestión de clientes, sites, ubicaciones y datos operativos."
              href="/customers"
              label="Abrir clientes"
            />

            <QuickAccessCard
              title="Técnicos"
              description="Control de técnicos, usuarios operativos y asignaciones."
              href="/technicians"
              label="Abrir técnicos"
            />
          </div>
        </section>
      </div>
    </main>
  );
}