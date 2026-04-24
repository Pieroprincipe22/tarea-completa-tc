'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPost,
} from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type SiteOption = {
  id: string;
  name: string;
  customer?: {
    id: string;
    name: string;
  } | null;
};

type FormState = {
  siteId: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  internalCode: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
  installationAt: string;
  location: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  siteId: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  internalCode: '',
  status: 'ACTIVE',
  installationAt: '',
  location: '',
  notes: '',
};

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseSite(value: unknown): SiteOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  const customer = isRecord(value.customer)
    ? {
        id: asStr(value.customer.id),
        name: asStr(value.customer.name),
      }
    : null;

  return {
    id,
    name,
    customer: customer?.id && customer?.name ? customer : null,
  };
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
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
      setIsLoadingSites(false);
      return;
    }

    let cancelled = false;

    async function loadSites() {
      try {
        setIsLoadingSites(true);
        setErrorMessage(null);

        const response = await tcGet<unknown>(session, paths.sites);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          setErrorMessage(`No se pudieron cargar los sites. HTTP ${response.code}`);
          setSites([]);
          return;
        }

        const { items } = normalizeList<unknown>(response.json);
        const rows = items.map(parseSite).filter((site): site is SiteOption => !!site);

        setSites(rows);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(`No se pudieron cargar los sites: ${errMsg(error)}`);
          setSites([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSites(false);
        }
      }
    }

    void loadSites();

    return () => {
      cancelled = true;
    };
  }, [mounted, paths.sites, session]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setErrorMessage('Necesitas iniciar sesión para crear un activo.');
      return;
    }

    if (!form.siteId) {
      setErrorMessage('Selecciona un site para vincular el activo.');
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage('El nombre del activo es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = {
        siteId: form.siteId,
        name: form.name.trim(),
        category: optionalString(form.category),
        brand: optionalString(form.brand),
        model: optionalString(form.model),
        serialNumber: optionalString(form.serialNumber),
        internalCode: optionalString(form.internalCode),
        status: form.status,
        installationAt: optionalString(form.installationAt),
        location: optionalString(form.location),
        notes: optionalString(form.notes),
      };

      const response = await tcPost<unknown>(session, paths.assets, payload);

      if (response.code < 200 || response.code >= 300) {
        setErrorMessage(`No se pudo crear el activo. HTTP ${response.code}`);
        return;
      }

      setSuccessMessage('Activo creado correctamente.');
      router.push('/assets');
      router.refresh();
    } catch (error) {
      setErrorMessage(`No se pudo crear el activo: ${errMsg(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Cargando sesión...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Nuevo activo</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Sesión no encontrada</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para crear activos necesitas iniciar sesión y tener una empresa activa.
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
              <p className="text-sm font-medium text-slate-500">Activos</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Nuevo activo
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Registra equipos, máquinas o instalaciones vinculadas a un site operativo.
              </p>
            </div>

            <Link
              href="/assets"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a activos
            </Link>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Site *</span>
              <select
                value={form.siteId}
                onChange={(event) => updateField('siteId', event.target.value)}
                disabled={isLoadingSites || sites.length === 0}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingSites ? 'Cargando sites...' : 'Selecciona un site'}
                </option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}{site.customer?.name ? ` · ${site.customer.name}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Nombre del activo *</span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ejemplo: Fan coil habitación 204"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Categoría</span>
              <input
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
                placeholder="Climatización, bomba, caldera..."
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Estado</span>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value as FormState['status'])}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="MAINTENANCE">En mantenimiento</option>
                <option value="RETIRED">Retirado</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Marca</span>
              <input
                value={form.brand}
                onChange={(event) => updateField('brand', event.target.value)}
                placeholder="Daikin, Mitsubishi, Wilo..."
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Modelo</span>
              <input
                value={form.model}
                onChange={(event) => updateField('model', event.target.value)}
                placeholder="Modelo del equipo"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Número de serie</span>
              <input
                value={form.serialNumber}
                onChange={(event) => updateField('serialNumber', event.target.value)}
                placeholder="Serie del fabricante"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Código interno</span>
              <input
                value={form.internalCode}
                onChange={(event) => updateField('internalCode', event.target.value)}
                placeholder="Código interno o etiqueta"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Fecha de instalación</span>
              <input
                type="date"
                value={form.installationAt}
                onChange={(event) => updateField('installationAt', event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Ubicación específica</span>
              <input
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                placeholder="Sala técnica, planta, habitación..."
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Notas</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Observaciones técnicas, acceso, mantenimiento recomendado..."
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

          {sites.length === 0 && !isLoadingSites ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No hay sites disponibles. Primero crea un cliente y un site para poder vincular este activo.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/assets"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSaving || isLoadingSites || sites.length === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Guardando...' : 'Crear activo'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
