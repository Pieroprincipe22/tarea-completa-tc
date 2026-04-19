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
  title?: string;
  createdAt?: string;
  completedAt?: string;
  status?: string;
  workOrderId?: string;
  customerName?: string;
  siteName?: string;
  assetName?: string;
  technicianName?: string;
};

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseReport(value: unknown): MaintenanceReport {
  const obj = asRecord(value);
  const template = asRecord(obj.template);
  const customer = asRecord(obj.customer);
  const site = asRecord(obj.site);
  const asset = asRecord(obj.asset);
  const assignedTechnician = asRecord(obj.assignedTechnician);

  return {
    id: asString(obj.id) ?? '',
    performedAt:
      asString(obj.performedAt) ??
      asString(obj.completedAt) ??
      asString(obj.createdAt),
    state: asString(obj.state),
    templateName:
      asString(obj.templateName) ??
      asString(template.title) ??
      asString(template.name) ??
      asString(obj.title),
    title: asString(obj.title),
    createdAt: asString(obj.createdAt),
    completedAt: asString(obj.completedAt),
    status: asString(obj.status),
    workOrderId: asString(obj.workOrderId),
    customerName: asString(customer.name),
    siteName: asString(site.name),
    assetName: asString(asset.name),
    technicianName: asString(assignedTechnician.name),
  };
}

function formatDate(input?: string) {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString('es-ES');
}

function normalizeStatus(status?: string): string {
  return String(status ?? '').trim().toUpperCase();
}

function statusLabel(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'DRAFT':
      return 'Borrador';
    case 'ASSIGNED':
      return 'Asignado';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'SUBMITTED':
      return 'Enviado por técnico';
    case 'COMPLETED':
      return 'Completado';
    case 'APPROVED':
      return 'Aprobado';
    case 'REJECTED':
      return 'Rechazado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status || '—';
  }
}

function badgeTone(
  status?: string,
): 'ok' | 'warn' | 'bad' | 'info' | 'muted' {
  switch (normalizeStatus(status)) {
    case 'APPROVED':
      return 'ok';
    case 'SUBMITTED':
    case 'COMPLETED':
      return 'info';
    case 'DRAFT':
    case 'ASSIGNED':
    case 'IN_PROGRESS':
    case 'REJECTED':
      return 'warn';
    case 'CANCELLED':
      return 'bad';
    default:
      return 'muted';
  }
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted';
}) {
  const cls =
    tone === 'ok'
      ? 'bg-emerald-600/20 text-emerald-200 ring-emerald-600/30'
      : tone === 'warn'
        ? 'bg-yellow-600/20 text-yellow-200 ring-yellow-600/30'
        : tone === 'bad'
          ? 'bg-rose-600/20 text-rose-200 ring-rose-600/30'
          : tone === 'info'
            ? 'bg-sky-600/20 text-sky-200 ring-sky-600/30'
            : 'bg-slate-600/20 text-slate-200 ring-slate-600/30';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/10">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-500">{helper}</div>
    </div>
  );
}

function ReportSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: MaintenanceReport[];
}) {
  return (
    <section className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>

        <Badge tone={items.length > 0 ? 'info' : 'muted'}>
          {items.length} {items.length === 1 ? 'parte' : 'partes'}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">
          No hay registros en este bloque.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {report.templateName || report.title || 'Parte de trabajo'}
                    </h3>

                    <Badge tone={badgeTone(report.status)}>
                      {statusLabel(report.status)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <span className="text-slate-500">Cliente:</span>{' '}
                      {report.customerName || '—'}
                    </div>
                    <div>
                      <span className="text-slate-500">Site:</span>{' '}
                      {report.siteName || '—'}
                    </div>
                    <div>
                      <span className="text-slate-500">Activo:</span>{' '}
                      {report.assetName || '—'}
                    </div>
                    <div>
                      <span className="text-slate-500">Técnico:</span>{' '}
                      {report.technicianName || '—'}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                    <div>Creado: {formatDate(report.createdAt)}</div>
                    <div>Última fecha útil: {formatDate(report.performedAt)}</div>
                    <div>Completado: {formatDate(report.completedAt)}</div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {report.workOrderId ? (
                    <Link
                      href={`/work-orders/${report.workOrderId}`}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                    >
                      Ver orden
                    </Link>
                  ) : null}

                  <Link
                    href={`/maintenance-reports/${report.id}`}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Abrir parte
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MaintenanceReportsPage() {
  const [session, setSession] = useState<TcSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState<MaintenanceReport[]>>({
    status: 'loading',
  });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({ status: 'error', error: 'Sin sesión tenant. Ve a /login.' });
      return;
    }

    let cancelled = false;

    (async () => {
      setState({ status: 'loading' });

      try {
        const paths = resolveCorePaths(session);
        const r = await tcGet(session, paths.reports);

        if (cancelled) return;

        if (r.code === 404) {
          setState({
            status: 'error',
            error: `Endpoint no existe: ${paths.reports}`,
          });
          return;
        }

        if (r.code === 401) {
          setState({
            status: 'error',
            error: '401 Unauthorized. Revisa tu sesión y vuelve a iniciar.',
          });
          return;
        }

        if (r.code === 403) {
          setState({
            status: 'error',
            error: '403 Forbidden. El usuario no pertenece a la company.',
          });
          return;
        }

        if (r.code < 200 || r.code >= 300) {
          setState({
            status: 'error',
            error: `HTTP ${r.code} cargando partes de trabajo.`,
          });
          return;
        }

        const rawItems = normalizeList<unknown>(r.json).items;
        const items = rawItems.map(parseReport).filter((item) => item.id);

        items.sort((a, b) => {
          const da = a.performedAt ? new Date(a.performedAt).getTime() : 0;
          const db = b.performedAt ? new Date(b.performedAt).getTime() : 0;
          return db - da;
        });

        setState({ status: 'ok', data: items });
      } catch (e: unknown) {
        if (!cancelled) {
          setState({ status: 'error', error: errMsg(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, mounted, reloadKey]);

  const grouped = useMemo(() => {
    if (state.status !== 'ok') {
      return {
        pendingTechnician: [] as MaintenanceReport[],
        pendingReview: [] as MaintenanceReport[],
        pendingInvoice: [] as MaintenanceReport[],
        cancelled: [] as MaintenanceReport[],
      };
    }

    const pendingTechnician: MaintenanceReport[] = [];
    const pendingReview: MaintenanceReport[] = [];
    const pendingInvoice: MaintenanceReport[] = [];
    const cancelled: MaintenanceReport[] = [];

    for (const item of state.data) {
      const status = normalizeStatus(item.status);

      if (
        status === 'DRAFT' ||
        status === 'ASSIGNED' ||
        status === 'IN_PROGRESS' ||
        status === 'REJECTED'
      ) {
        pendingTechnician.push(item);
        continue;
      }

      if (status === 'SUBMITTED' || status === 'COMPLETED') {
        pendingReview.push(item);
        continue;
      }

      if (status === 'APPROVED') {
        pendingInvoice.push(item);
        continue;
      }

      if (status === 'CANCELLED') {
        cancelled.push(item);
      }
    }

    return {
      pendingTechnician,
      pendingReview,
      pendingInvoice,
      cancelled,
    };
  }, [state]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-2xl bg-slate-900/60 p-4 text-sm text-slate-400 ring-1 ring-white/10">
          Cargando sesión…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Partes de trabajo</h1>
            <p className="mt-1 text-sm text-slate-400">
              Panel administrativo de partes técnicos.
            </p>
          </div>
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            ← Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-white/10">
          <div className="text-sm text-red-200">
            Sin sesión tenant. Ve a{' '}
            <Link className="text-white underline" href="/login">
              /login
            </Link>
            .
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Partes de trabajo</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestión separada de partes técnicos, revisión y facturación pendiente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/maintenance-reports/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            + Crear parte de trabajo
          </Link>

          <button
            type="button"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
            onClick={() => setReloadKey((x) => x + 1)}
          >
            Actualizar
          </button>

          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            ← Dashboard
          </Link>
        </div>
      </div>

      {state.status === 'error' ? (
        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {state.error}
        </div>
      ) : null}

      {state.status === 'ok' ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pendientes técnico"
            value={grouped.pendingTechnician.length}
            helper="Partes en borrador, asignados, en progreso o rechazados."
          />
          <MetricCard
            label="Pendientes de revisión"
            value={grouped.pendingReview.length}
            helper="Partes ya enviados por técnico y pendientes de revisar."
          />
          <MetricCard
            label="Pendientes de facturar"
            value={grouped.pendingInvoice.length}
            helper="Partes aprobados por admin y listos para valoración/factura."
          />
          <MetricCard
            label="Cancelados"
            value={grouped.cancelled.length}
            helper="Partes anulados o cerrados sin continuidad."
          />
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {state.status === 'loading' ? (
          <div className="rounded-2xl bg-slate-900/60 p-4 text-sm text-slate-400 ring-1 ring-white/10">
            Cargando partes de trabajo…
          </div>
        ) : state.status === 'ok' && state.data.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/10">
            <div className="text-sm text-slate-400">
              No hay partes todavía en esta company.
            </div>

            <Link
              href="/maintenance-reports/new"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Crear primer parte
            </Link>
          </div>
        ) : state.status === 'ok' ? (
          <>
            <ReportSection
              title="Pendientes del técnico"
              description="Partes creados por administración que todavía debe completar o corregir el técnico."
              items={grouped.pendingTechnician}
            />

            <ReportSection
              title="Enviados por técnico / pendientes de revisión"
              description="Partes ya entregados por el técnico y listos para revisión administrativa."
              items={grouped.pendingReview}
            />

            <ReportSection
              title="Aprobados / pendientes de facturar"
              description="Partes validados por administración y pendientes de valoración económica o factura."
              items={grouped.pendingInvoice}
            />

            <ReportSection
              title="Cancelados"
              description="Partes cerrados sin continuidad operativa."
              items={grouped.cancelled}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}