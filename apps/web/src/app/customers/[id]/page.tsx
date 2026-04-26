'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { errMsg, isRecord, resolveCorePaths, tcGet } from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type CustomerDetail = {
  id: string;
  companyId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseCustomer(value: unknown): CustomerDetail {
  if (!isRecord(value)) {
    return {
      id: '',
      name: 'Cliente sin nombre',
      isActive: true,
    };
  }

  return {
    id: asStr(value.id),
    companyId: asStr(value.companyId) || undefined,
    name: asStr(value.name, 'Cliente sin nombre'),
    email: asNullableStr(value.email),
    phone: asNullableStr(value.phone),
    notes: asNullableStr(value.notes),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: asNullableStr(value.createdAt),
    updatedAt: asNullableStr(value.updatedAt),
  };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusLabel(customer: CustomerDetail): string {
  return customer.isActive ? 'Activo' : 'Inactivo';
}

function getStatusClass(customer: CustomerDetail): string {
  return customer.isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-600';
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value?.trim() ? value : '—'}
      </p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();

  const customerId = useMemo(() => {
    const rawId = params?.id;

    if (Array.isArray(rawId)) return rawId[0] ?? '';
    if (typeof rawId === 'string') return rawId;

    return '';
  }, [params]);

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [state, setState] = useState<Load<CustomerDetail>>({
    status: 'loading',
  });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({
        status: 'error',
        error: 'Sesión no encontrada. Inicia sesión para ver este cliente.',
      });
      return;
    }

    if (!customerId) {
      setState({
        status: 'error',
        error: 'ID de cliente no válido.',
      });
      return;
    }

    let cancelled = false;

    async function loadCustomer() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(
          session,
          `${paths.customers}/${customerId}`,
        );

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error:
              response.code === 404
                ? 'Cliente no encontrado.'
                : `No se pudo cargar el cliente. HTTP ${response.code}`,
          });
          return;
        }

        const customer = parseCustomer(response.json);

        if (!customer.id) {
          setState({
            status: 'error',
            error: 'La API respondió un cliente sin ID.',
          });
          return;
        }

        setState({ status: 'ok', data: customer });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadCustomer();

    return () => {
      cancelled = true;
    };
  }, [customerId, mounted, paths.customers, session]);

  if (!mounted || state.status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargando cliente...
          </p>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Detalle de cliente
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            No se pudo cargar el cliente
          </h1>

          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {state.error}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/customers"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a clientes
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ir a login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const customer = state.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Detalle de cliente
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {customer.name}
                </h1>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                    customer,
                  )}`}
                >
                  {getStatusLabel(customer)}
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta la información principal del cliente y usa sus acciones
                relacionadas para crear sites, activos u órdenes de trabajo.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/customers"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver a clientes
              </Link>

              <Link
                href="/sites/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Crear site
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="Email" value={customer.email} />
          <DetailCard label="Teléfono" value={customer.phone} />
          <DetailCard label="Estado" value={getStatusLabel(customer)} />
          <DetailCard label="Creado" value={formatDateTime(customer.createdAt)} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">
              Información del cliente
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DetailCard label="Nombre" value={customer.name} />
              <DetailCard label="Email" value={customer.email} />
              <DetailCard label="Teléfono" value={customer.phone} />
              <DetailCard label="Estado" value={getStatusLabel(customer)} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Trazabilidad</h2>

            <div className="mt-5 space-y-4">
              <DetailCard
                label="Creado"
                value={formatDateTime(customer.createdAt)}
              />
              <DetailCard
                label="Actualizado"
                value={formatDateTime(customer.updatedAt)}
              />
              <DetailCard label="ID del cliente" value={customer.id} />
              <DetailCard label="ID de empresa" value={customer.companyId} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Notas</h2>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {customer.notes?.trim()
              ? customer.notes
              : 'Este cliente no tiene notas registradas.'}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Acciones relacionadas
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/sites/new"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Crear site para este cliente
            </Link>

            <Link
              href="/sites"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver sites
            </Link>

            <Link
              href="/work-orders/new"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Crear orden de trabajo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}