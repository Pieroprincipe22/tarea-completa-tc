'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { errMsg, resolveCorePaths, tcPost } from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type FormState = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  notes: '',
};

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export default function NewCustomerPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setErrorMessage('Necesitas iniciar sesión para crear un cliente.');
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage('El nombre del cliente es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = {
        name: form.name.trim(),
        email: optionalString(form.email),
        phone: optionalString(form.phone),
        notes: optionalString(form.notes),
      };

      const response = await tcPost<unknown>(session, paths.customers, payload);

      if (response.code < 200 || response.code >= 300) {
        setErrorMessage(`No se pudo crear el cliente. HTTP ${response.code}`);
        return;
      }

      setSuccessMessage('Cliente creado correctamente.');
      router.push('/customers');
      router.refresh();
    } catch (error) {
      setErrorMessage(`No se pudo crear el cliente: ${errMsg(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-2 px-4 py-6 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-muted">
            Cargando sesión...
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-surface-2 px-4 py-6 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-line bg-surface p-8 shadow-sm">
          <p className="text-sm font-medium text-muted">Nuevo cliente</p>

          <h1 className="mt-1 text-2xl font-bold text-ink">
            Sesión no encontrada
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            Para crear clientes necesitas iniciar sesión y tener una empresa
            activa.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover"
          >
            Ir a login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-2 px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Clientes</p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Nuevo cliente
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Registra un cliente para poder crear sites, activos, órdenes de
                trabajo y mantenimiento asociado.
              </p>
            </div>

            <Link
              href="/customers"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
            >
              Volver a clientes
            </Link>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-ink-2">
                Nombre del cliente *
              </span>

              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ejemplo: Hotel Sol, Comunidad Norte, Cliente Industrial..."
                className="h-11 rounded-lg border border-line bg-surface px-4 text-sm outline-none transition placeholder:text-subtle focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-2">
                Email
              </span>

              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="cliente@empresa.com"
                className="h-11 rounded-lg border border-line bg-surface px-4 text-sm outline-none transition placeholder:text-subtle focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-2">
                Teléfono
              </span>

              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+34 600 000 000"
                className="h-11 rounded-lg border border-line bg-surface px-4 text-sm outline-none transition placeholder:text-subtle focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-ink-2">
                Notas
              </span>

              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Observaciones del cliente, condiciones, horarios, contacto principal..."
                rows={5}
                className="rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none transition placeholder:text-subtle focus:border-accent"
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 rounded-lg border border-success/30 bg-success-soft p-4 text-sm text-success">
              {successMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/customers"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent-hover"
            >
              {isSaving ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}