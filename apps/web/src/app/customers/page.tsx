'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
} from '@/lib/tc/api';
import {
  readTcSession,
  resolveHomePath,
  type TcSession,
} from '@/lib/tc/session';

type CustomerRow = {
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

type CustomerFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const EMPTY_CUSTOMERS: CustomerRow[] = [];

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseCustomer(value: unknown): CustomerRow {
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

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getStatusLabel(customer: CustomerRow): string {
  return customer.isActive ? 'Activo' : 'Inactivo';
}

function getStatusClass(customer: CustomerRow): string {
  return customer.isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-slate-50 text-slate-600';
}

export default function CustomersPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);
  const homePath = useMemo(() => resolveHomePath(session), [session]);

  const [state, setState] = useState<Load<CustomerRow[]>>({
    status: 'loading',
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setState({ status: 'ok', data: [] });
      return;
    }

    let cancelled = false;

    async function loadCustomers() {
      try {
        setState({ status: 'loading' });

        const response = await tcGet<unknown>(session, paths.customers);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setState({
            status: 'error',
            error: `No se pudieron cargar los clientes. HTTP ${response.code}`,
          });
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items
          .map(parseCustomer)
          .filter((customer) => customer.id);

        setState({ status: 'ok', data: rows });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.customers, session]);

  const customers = state.status === 'ok' ? state.data : EMPTY_CUSTOMERS;

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && customer.isActive) ||
        (filter === 'INACTIVE' && !customer.isActive);

      const searchableText = [
        customer.name,
        customer.email,
        customer.phone,
        customer.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [customers, filter, search]);

  const activeCount = customers.filter((customer) => customer.isActive).length;
  const inactiveCount = customers.filter((customer) => !customer.isActive).length;
  const withEmailCount = customers.filter((customer) => customer.email).length;

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Cargando sesión...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Clientes</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Sesión no encontrada
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para ver los clientes necesitas iniciar sesión y tener una empresa
            activa.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes</p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Gestión de clientes
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta y organiza los clientes de la empresa para vincular
                sites, activos, órdenes de trabajo y mantenimiento.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={homePath}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al dashboard
              </Link>

              <Link
                href="/customers/new"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Nuevo cliente
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total clientes
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {customers.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Activos</p>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Inactivos</p>
            <p className="mt-3 text-3xl font-bold text-slate-600">
              {inactiveCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Con email</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {withEmailCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Listado de clientes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredCustomers.length} resultado
                {filteredCustomers.length === 1 ? '' : 's'} encontrado
                {filteredCustomers.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, email, teléfono..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 sm:w-80"
              />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as CustomerFilter)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>
          </div>

          {state.status === 'loading' ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                Cargando clientes...
              </p>
            </div>
          ) : state.status === 'error' ? (
            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {state.error}
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No hay clientes para mostrar.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Crea un cliente nuevo o cambia los filtros de búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Cliente
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Email
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Teléfono
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">
                      Creado
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-semibold text-slate-950">
                          {customer.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {customer.notes?.trim()
                            ? customer.notes
                            : 'Sin notas registradas'}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {customer.email ?? '—'}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {customer.phone ?? '—'}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            customer,
                          )}`}
                        >
                          {getStatusLabel(customer)}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-4 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}