'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPost,
} from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type CustomerOption = {
  id: string;
  name: string;
};

type FormState = {
  customerId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  customerId: '',
  name: '',
  address: '',
  city: '',
  country: 'España',
  notes: '',
};

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseCustomer(value: unknown): CustomerOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return { id, name };
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export default function NewSitePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setIsLoadingCustomers(false);
      return;
    }

    let cancelled = false;

    async function loadCustomers() {
      try {
        setIsLoadingCustomers(true);
        setErrorMessage(null);

        const response = await tcGet<unknown>(session, paths.customers);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setErrorMessage(
            `No se pudieron cargar los clientes. HTTP ${response.code}`,
          );
          setCustomers([]);
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items
          .map(parseCustomer)
          .filter((customer): customer is CustomerOption => !!customer);

        setCustomers(rows);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(`No se pudieron cargar los clientes: ${errMsg(error)}`);
          setCustomers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCustomers(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.customers, session]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setErrorMessage('Necesitas iniciar sesión para crear un site.');
      return;
    }

    if (!form.customerId) {
      setErrorMessage('Selecciona un cliente para vincular el site.');
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage('El nombre del site es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = {
        customerId: form.customerId,
        name: form.name.trim(),
        address: optionalString(form.address),
        city: optionalString(form.city),
        country: optionalString(form.country),
        notes: optionalString(form.notes),
      };

      const response = await tcPost<unknown>(session, paths.sites, payload);

      if (response.code < 200 || response.code >= 300) {
        setErrorMessage(`No se pudo crear el site. HTTP ${response.code}`);
        return;
      }

      setSuccessMessage('Site creado correctamente.');
      router.push('/sites');
      router.refresh();
    } catch (error) {
      setErrorMessage(`No se pudo crear el site: ${errMsg(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
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
          <p className="text-sm font-medium text-slate-500">Nuevo site</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Sesión no encontrada
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para crear sites necesitas iniciar sesión y tener una empresa activa.
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Sites</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Nuevo site / ubicación
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Registra una ubicación operativa del cliente, como hotel,
                edificio, planta, sala técnica, local u oficina.
              </p>
            </div>

            <Link
              href="/sites"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a sites
            </Link>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Cliente *
              </span>

              <select
                value={form.customerId}
                onChange={(event) =>
                  updateField('customerId', event.target.value)
                }
                disabled={isLoadingCustomers || customers.length === 0}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingCustomers
                    ? 'Cargando clientes...'
                    : 'Selecciona un cliente'}
                </option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Nombre del site *
              </span>

              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ejemplo: Hotel Sol - Edificio Principal"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Dirección
              </span>

              <input
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="Calle, número, zona..."
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Ciudad
              </span>

              <input
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                placeholder="Madrid, Barcelona, Málaga..."
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                País
              </span>

              <input
                value={form.country}
                onChange={(event) => updateField('country', event.target.value)}
                placeholder="España"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Notas
              </span>

              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Observaciones de acceso, recepción, horarios, contacto interno, restricciones..."
                rows={5}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {customers.length === 0 && !isLoadingCustomers ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No hay clientes disponibles. Primero crea un cliente para poder
              vincular este site.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/sites"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSaving || isLoadingCustomers || customers.length === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Guardando...' : 'Crear site'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}