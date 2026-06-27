'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SVGProps,
} from 'react';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import {
  errMsg,
  getCount,
  isRecord,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';

type IconProps = SVGProps<SVGSVGElement>;

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
  reports: number;
  workOrders: number;
};

type LoadState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string; code?: number };

type MetricTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

const metricToneClasses: Record<
  MetricTone,
  {
    icon: string;
    glow: string;
  }
> = {
  sky: {
    icon: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
    glow: 'rgba(14,165,233,0.12)',
  },
  emerald: {
    icon: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    glow: 'rgba(16,185,129,0.12)',
  },
  amber: {
    icon: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
    glow: 'rgba(245,158,11,0.12)',
  },
  rose: {
    icon: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    glow: 'rgba(244,63,94,0.12)',
  },
  violet: {
    icon: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
    glow: 'rgba(139,92,246,0.12)',
  },
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

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

function formatRole(role?: string | null): string {
  const normalized = String(role ?? '').trim().toUpperCase();

  if (!normalized) return '—';

  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    SUPER_ADMIN: 'Super administrador',
    TECHNICIAN: 'Técnico',
    MANAGER: 'Supervisor',
    USER: 'Usuario',
  };

  return labels[normalized] ?? normalized;
}

function getInitials(session: TcSession): string {
  const base = session.name || session.email || session.userId || 'TC';

  const words = base
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return initials || 'TC';
}

function ActivityIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 12h4l2.5-7 5 14L17 12h4" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      <path d="M18 8.5a3 3 0 0 1 2.5 3" />
      <path d="M20.5 19a5 5 0 0 0-3-4.5" />
    </svg>
  );
}

function LocationIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <path d="M12 10.5h.01" />
    </svg>
  );
}

function CubeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" />
      <path d="M4.8 7.4 12 11.5l7.2-4.1" />
      <path d="M12 11.5V21" />
    </svg>
  );
}

function DocumentIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function ClipboardIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" />
      <path d="M9 4h6v4H9V4Z" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function WarehouseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3.5 10.2 12 4l8.5 6.2" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M8 20v-7h8v7" />
      <path d="M10 16h4" />
    </svg>
  );
}

function WrenchIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14.7 6.3a4 4 0 0 0 5 5L11 20l-4-4 8.7-8.7Z" />
      <path d="M7 16 4.5 18.5a1.8 1.8 0 0 0 0 2.5 1.8 1.8 0 0 0 2.5 0L9.5 18.5" />
    </svg>
  );
}

function ShieldIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3 19 6v5c0 5-3.1 8.4-7 10-3.9-1.6-7-5-7-10V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-4" />
    </svg>
  );
}

function ChevronIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function RefreshIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 11a8 8 0 0 0-14.9-4" />
      <path d="M5 3v4h4" />
      <path d="M4 13a8 8 0 0 0 14.9 4" />
      <path d="M19 21v-4h-4" />
    </svg>
  );
}

function StatusPill({
  ok,
  loading,
  text,
}: {
  ok: boolean;
  loading?: boolean;
  text: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black',
        loading && 'border-sky-400/40 bg-sky-400/10 text-sky-200',
        !loading &&
          ok &&
          'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
        !loading &&
          !ok &&
          'border-rose-400/40 bg-rose-400/10 text-rose-300',
      )}
    >
      <span
        className={cx(
          'h-1.5 w-1.5 rounded-full',
          loading && 'bg-sky-300',
          !loading && ok && 'bg-emerald-300',
          !loading && !ok && 'bg-rose-300',
        )}
      />
      {text}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  tone: MetricTone;
  href?: string;
}) {
  const toneClass = metricToneClasses[tone];

  const content = (
    <div
      className={cx(
        'group relative h-full overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.30)] transition duration-200',
        href &&
          'hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/75',
      )}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at top left, ${toneClass.glow}, transparent 38%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
            {label}
          </p>

          <p className="mt-4 text-4xl font-black tracking-tight text-white">
            {value}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-400">{helper}</p>
        </div>

        <div
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
            toneClass.icon,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

function QuickAccessCard({
  title,
  description,
  href,
  label,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/45 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.25)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/45 hover:bg-slate-900/70"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_38%)] opacity-80" />

      <div className="relative flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-black tracking-tight text-white">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-sky-300 group-hover:text-sky-200">
            {label}
            <ChevronIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SessionInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}

function SystemStatusCard({
  health,
  tenant,
}: {
  health: LoadState<Health>;
  tenant: LoadState<TenantPing>;
}) {
  const apiOk = health.status === 'ok' && health.data.ok;
  const tenantOk = tenant.status === 'ok' && tenant.data.ok === true;

  const healthLoading = health.status === 'idle' || health.status === 'loading';
  const tenantLoading = tenant.status === 'idle' || tenant.status === 'loading';

  let healthText = 'API verificando';

  if (health.status === 'ok') {
    healthText = 'API operativa';
  }

  if (health.status === 'error') {
    healthText = `API con incidencia${health.code ? ` · ${health.code}` : ''}`;
  }

  let tenantText = 'Tenant verificando';

  if (tenant.status === 'ok') {
    tenantText = 'Tenant válido';
  }

  if (tenant.status === 'error') {
    tenantText = `Tenant inválido${tenant.code ? ` · ${tenant.code}` : ''}`;
  }

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-950/60 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
          <ShieldIcon className="h-6 w-6" />
        </div>

        <div>
          <p className="text-sm font-black text-white">Estado del sistema</p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Validación de API, sesión tenant y permisos operativos.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusPill ok={apiOk} loading={healthLoading} text={healthText} />

        <StatusPill
          ok={tenantOk}
          loading={tenantLoading}
          text={tenantText}
        />
      </div>

      {health.status === 'error' ? (
        <p className="mt-4 text-xs leading-5 text-rose-300">
          API: {health.error}
        </p>
      ) : null}

      {tenant.status === 'error' ? (
        <p className="mt-2 text-xs leading-5 text-rose-300">
          Tenant: {tenant.error}
        </p>
      ) : null}
    </div>
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

    async function safeCount(path: string): Promise<number> {
      try {
        return await getCount(session, path);
      } catch {
        return 0;
      }
    }

    async function loadDashboard() {
      setHealth({ status: 'loading' });
      setTenant({ status: 'loading' });
      setCounts({ status: 'loading' });

      try {
        const response = await tcGet(session, paths.health);
        const parsed = parseHealth(response.json);

        if (!cancelled) {
          if (response.code >= 200 && response.code < 300 && parsed) {
            setHealth({ status: 'ok', data: parsed });
          } else {
            setHealth({
              status: 'error',
              error: 'Respuesta inválida en /health',
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
              error:
                response.code === 403
                  ? '403 · Usuario sin membresía activa'
                  : 'Respuesta tenant inválida',
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
        const [customers, sites, assets, reports, workOrders] =
          await Promise.all([
            safeCount(paths.customers),
            safeCount(paths.sites),
            safeCount(paths.assets),
            safeCount(paths.reports),
            safeCount(paths.workOrders),
          ]);

        if (!cancelled) {
          setCounts({
            status: 'ok',
            data: {
              customers,
              sites,
              assets,
              reports,
              workOrders,
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
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-[0_25px_80px_rgba(2,6,23,0.35)]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-400">
            TC Mantenimiento
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            Dashboard
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-400">
            Tu panel principal del sistema. Para ver la operación necesitas una
            sesión tenant activa.
          </p>

          <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-200">
            Sin sesión tenant activa.
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
            >
              Ir a login
            </Link>

            <button
              type="button"
              onClick={() => setSession(readTcSession())}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              <RefreshIcon className="h-4 w-4" />
              Releer sesión
            </button>
          </div>
        </section>
      </main>
    );
  }

  const displayName = session.name ?? session.email ?? session.userId;
  const companyName = session.companyName ?? session.companyId;
  const role = session.role ?? (tenant.status === 'ok' ? tenant.data.role : '');

  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/45 bg-slate-900/70 p-8 shadow-[0_0_90px_rgba(14,165,233,0.13)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_35%),linear-gradient(135deg,rgba(2,6,23,0.15),rgba(2,132,199,0.08))]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Plataforma operativa
              </p>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
                Panel principal
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
                Controla clientes, sites, activos, partes de trabajo, órdenes,
                técnicos e inventario desde un solo punto operativo.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/maintenance-reports"
                  className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Ver partes
                </Link>

                <Link
                  href="/work-orders"
                  className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Ver órdenes
                </Link>

                <Link
                  href="/inventory"
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
                >
                  Inventario
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/80 bg-slate-950/65 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-sky-400/25 bg-sky-500/10 text-2xl font-black text-sky-300">
                  {getInitials(session)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">
                    {displayName}
                  </p>

                  <p className="mt-1 truncate text-sm text-slate-400">
                    {companyName}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <SessionInfoCard label="Rol" value={formatRole(role)} />
                <SessionInfoCard label="Empresa" value={companyName} />
                <SessionInfoCard label="API" value={session.apiBase} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Clientes"
            value={counts.status === 'ok' ? String(counts.data.customers) : '—'}
            helper="Empresas registradas."
            icon={<UsersIcon className="h-7 w-7" />}
            tone="sky"
            href="/customers"
          />

          <MetricCard
            label="Sites"
            value={counts.status === 'ok' ? String(counts.data.sites) : '—'}
            helper="Ubicaciones técnicas."
            icon={<LocationIcon className="h-7 w-7" />}
            tone="emerald"
            href="/sites"
          />

          <MetricCard
            label="Activos"
            value={counts.status === 'ok' ? String(counts.data.assets) : '—'}
            helper="Equipos registrados."
            icon={<CubeIcon className="h-7 w-7" />}
            tone="violet"
            href="/assets"
          />

          <MetricCard
            label="Partes"
            value={counts.status === 'ok' ? String(counts.data.reports) : '—'}
            helper="Reportes técnicos."
            icon={<DocumentIcon className="h-7 w-7" />}
            tone="amber"
            href="/maintenance-reports"
          />

          <MetricCard
            label="Órdenes"
            value={counts.status === 'ok' ? String(counts.data.workOrders) : '—'}
            helper="Trabajos operativos."
            icon={<ClipboardIcon className="h-7 w-7" />}
            tone="rose"
            href="/work-orders"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-6">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Accesos rápidos
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Módulos principales
              </h2>

              <p className="mt-2 text-sm leading-7 text-slate-400">
                Atajos para entrar directamente a las pantallas que más se usan
                en la operación diaria.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <QuickAccessCard
                title="Partes de trabajo"
                description="Crear, revisar y abrir reportes enviados por técnicos."
                href="/maintenance-reports"
                label="Abrir partes"
                icon={<DocumentIcon className="h-6 w-6" />}
              />

              <QuickAccessCard
                title="Nueva revisión"
                description="Generar un parte técnico desde una plantilla operativa."
                href="/new"
                label="Crear reporte"
                icon={<ActivityIcon className="h-6 w-6" />}
              />

              <QuickAccessCard
                title="Work Orders"
                description="Asignación de técnicos, estados y seguimiento de órdenes."
                href="/work-orders"
                label="Abrir órdenes"
                icon={<WrenchIcon className="h-6 w-6" />}
              />

              <QuickAccessCard
                title="Inventario"
                description="Almacén, pedidos, movimientos, compras y reposición."
                href="/inventory"
                label="Abrir inventario"
                icon={<WarehouseIcon className="h-6 w-6" />}
              />

              <QuickAccessCard
                title="Clientes"
                description="Gestión de clientes, contratos, sites y ubicaciones."
                href="/customers"
                label="Abrir clientes"
                icon={<UsersIcon className="h-6 w-6" />}
              />

              <QuickAccessCard
                title="Técnicos"
                description="Usuarios operativos, técnicos y estructura del equipo."
                href="/technicians"
                label="Abrir técnicos"
                icon={<ShieldIcon className="h-6 w-6" />}
              />
            </div>
          </div>

          <div className="space-y-6">
            <SystemStatusCard health={health} tenant={tenant} />

            <div className="rounded-3xl border border-slate-800/90 bg-slate-900/35 p-6">
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-sky-400">
                Operación
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Flujo recomendado
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm font-black text-white">
                    1. Parte técnico
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    El técnico registra diagnóstico, materiales y observaciones.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm font-black text-white">
                    2. Orden de trabajo
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Administración revisa, aprueba y asigna el trabajo.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm font-black text-white">
                    3. Inventario
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Se controlan pedidos, almacén y reposición de materiales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}