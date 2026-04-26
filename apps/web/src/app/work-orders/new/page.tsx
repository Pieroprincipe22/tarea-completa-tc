'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
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

type SiteOption = {
  id: string;
  name: string;
  customerId?: string | null;
  customer?: CustomerOption | null;
};

type AssetOption = {
  id: string;
  name: string;
  code?: string | null;
  internalCode?: string | null;
  serialNumber?: string | null;
  siteId?: string | null;
  customerId?: string | null;
  site?: {
    id: string;
    name: string;
    customerId?: string | null;
  } | null;
};

type TechnicianOption = {
  id: string;
  userId?: string;
  name: string;
  email?: string | null;
  role?: string | null;
  isActive?: boolean;
};

type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

type FormState = {
  title: string;
  description: string;
  customerId: string;
  siteId: string;
  assetId: string;
  assignedToId: string;
  priority: WorkOrderPriority;
  scheduledAt: string;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'error'; error: string };

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  customerId: '',
  siteId: '',
  assetId: '',
  assignedToId: '',
  priority: 'MEDIUM',
  scheduledAt: '',
};

const PRIORITY_OPTIONS: Array<{
  value: WorkOrderPriority;
  label: string;
}> = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseCustomer(value: unknown): CustomerOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  return { id, name };
}

function parseSite(value: unknown): SiteOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  const customer = parseCustomer(value.customer);

  return {
    id,
    name,
    customerId: asNullableStr(value.customerId) ?? customer?.id ?? null,
    customer,
  };
}

function parseAsset(value: unknown): AssetOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  const name = asStr(value.name);

  if (!id || !name) return null;

  const site = isRecord(value.site)
    ? {
        id: asStr(value.site.id),
        name: asStr(value.site.name),
        customerId: asNullableStr(value.site.customerId),
      }
    : null;

  return {
    id,
    name,
    code: asNullableStr(value.code),
    internalCode: asNullableStr(value.internalCode),
    serialNumber: asNullableStr(value.serialNumber),
    siteId: asNullableStr(value.siteId) ?? site?.id ?? null,
    customerId: asNullableStr(value.customerId) ?? site?.customerId ?? null,
    site: site?.id && site?.name ? site : null,
  };
}

function parseTechnician(value: unknown): TechnicianOption | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id) || asStr(value.userId);
  const userId = asStr(value.userId) || id;
  const email = asNullableStr(value.email);
  const name = asStr(value.name) || email || '';
  const role = asNullableStr(value.role);
  const isActive =
    typeof value.isActive === 'boolean' ? value.isActive : undefined;

  if (!id || !name) return null;

  return {
    id,
    userId,
    name,
    email,
    role,
    isActive,
  };
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeDateTimeLocal(value: string): string | undefined {
  const normalized = value.trim();

  if (!normalized) return undefined;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

function getAssetCode(asset: AssetOption): string {
  return asset.code ?? asset.internalCode ?? asset.serialNumber ?? 'Sin código';
}

function getTechnicianLabel(technician: TechnicianOption): string {
  if (technician.email && technician.email !== technician.name) {
    return `${technician.name} · ${technician.email}`;
  }

  return technician.name;
}

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);

  const [prefillAssetId, setPrefillAssetId] = useState('');
  const [technicianWarning, setTechnicianWarning] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setPrefillAssetId(searchParams.get('assetId') ?? '');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!session) {
      setLoadState({ status: 'ok' });
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadState({ status: 'loading' });
        setErrorMessage(null);
        setTechnicianWarning(null);

        const [
          customersResponse,
          sitesResponse,
          assetsResponse,
          techniciansResponse,
        ] = await Promise.all([
          tcGet<unknown>(session, paths.customers),
          tcGet<unknown>(session, paths.sites),
          tcGet<unknown>(session, paths.assets),
          tcGet<unknown>(session, paths.technicians),
        ]);

        if (cancelled) return;

        if (customersResponse.code < 200 || customersResponse.code >= 300) {
          setLoadState({
            status: 'error',
            error: `No se pudieron cargar los clientes. HTTP ${customersResponse.code}`,
          });
          return;
        }

        if (sitesResponse.code < 200 || sitesResponse.code >= 300) {
          setLoadState({
            status: 'error',
            error: `No se pudieron cargar los sites. HTTP ${sitesResponse.code}`,
          });
          return;
        }

        if (assetsResponse.code < 200 || assetsResponse.code >= 300) {
          setLoadState({
            status: 'error',
            error: `No se pudieron cargar los activos. HTTP ${assetsResponse.code}`,
          });
          return;
        }

        const customerItems = normalizeList<unknown>(
          customersResponse.json,
        ).items;
        const siteItems = normalizeList<unknown>(sitesResponse.json).items;
        const assetItems = normalizeList<unknown>(assetsResponse.json).items;

        const parsedCustomers = customerItems
          .map(parseCustomer)
          .filter((item): item is CustomerOption => !!item);

        const parsedSites = siteItems
          .map(parseSite)
          .filter((item): item is SiteOption => !!item);

        const parsedAssets = assetItems
          .map(parseAsset)
          .filter((item): item is AssetOption => !!item);

        setCustomers(parsedCustomers);
        setSites(parsedSites);
        setAssets(parsedAssets);

        if (techniciansResponse.code >= 200 && techniciansResponse.code < 300) {
          const technicianItems = normalizeList<unknown>(
            techniciansResponse.json,
          ).items;

          const loadedTechnicians = technicianItems
            .map(parseTechnician)
            .filter((item): item is TechnicianOption => !!item)
            .filter((item) => item.isActive !== false);

          setTechnicians(loadedTechnicians);

          if (loadedTechnicians.length === 0) {
            setTechnicianWarning(
              'No hay técnicos activos vinculados a esta empresa. Puedes crear la orden sin asignarla.',
            );
          }
        } else {
          setTechnicians([]);
          setTechnicianWarning(
            `No se pudieron cargar técnicos automáticamente. HTTP ${techniciansResponse.code}`,
          );
        }

        setLoadState({ status: 'ok' });
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            status: 'error',
            error: errMsg(error),
          });
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [
    mounted,
    paths.assets,
    paths.customers,
    paths.sites,
    paths.technicians,
    session,
  ]);

  useEffect(() => {
    if (!prefillAssetId || assets.length === 0) return;

    setForm((current) => {
      if (current.assetId) return current;

      const asset = assets.find((item) => item.id === prefillAssetId);
      if (!asset) return current;

      return {
        ...current,
        assetId: asset.id,
        siteId: asset.siteId ?? current.siteId,
        customerId: asset.customerId ?? current.customerId,
      };
    });
  }, [assets, prefillAssetId]);

  const filteredSites = useMemo(() => {
    if (!form.customerId) return sites;

    return sites.filter((site) => site.customerId === form.customerId);
  }, [form.customerId, sites]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (form.siteId) return asset.siteId === form.siteId;
      if (form.customerId) return asset.customerId === form.customerId;

      return true;
    });
  }, [assets, form.customerId, form.siteId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCustomerChange(customerId: string) {
    setForm((current) => ({
      ...current,
      customerId,
      siteId: '',
      assetId: '',
    }));
  }

  function handleSiteChange(siteId: string) {
    const selectedSite = sites.find((site) => site.id === siteId);

    setForm((current) => ({
      ...current,
      siteId,
      assetId: '',
      customerId: selectedSite?.customerId ?? current.customerId,
    }));
  }

  function handleAssetChange(assetId: string) {
    const selectedAsset = assets.find((asset) => asset.id === assetId);

    setForm((current) => ({
      ...current,
      assetId,
      siteId: selectedAsset?.siteId ?? current.siteId,
      customerId: selectedAsset?.customerId ?? current.customerId,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setErrorMessage('Necesitas iniciar sesión para crear una orden de trabajo.');
      return;
    }

    if (!form.title.trim()) {
      setErrorMessage('El título de la orden es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const payload = {
        title: form.title.trim(),
        description: optionalString(form.description),
        customerId: optionalString(form.customerId),
        siteId: optionalString(form.siteId),
        assetId: optionalString(form.assetId),
        assignedToId: optionalString(form.assignedToId),
        priority: form.priority,
        scheduledAt: normalizeDateTimeLocal(form.scheduledAt),
      };

      const response = await tcPost<unknown>(session, paths.workOrders, payload);

      if (response.code < 200 || response.code >= 300) {
        setErrorMessage(`No se pudo crear la orden. HTTP ${response.code}`);
        return;
      }

      router.push('/work-orders');
      router.refresh();
    } catch (error) {
      setErrorMessage(`No se pudo crear la orden: ${errMsg(error)}`);
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
          <p className="text-sm font-medium text-slate-500">
            Nueva orden de trabajo
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Sesión no encontrada
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para crear órdenes de trabajo necesitas iniciar sesión y tener una
            empresa activa.
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Órdenes de trabajo
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Nueva orden de trabajo
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Crea una orden vinculada a cliente, site, activo y técnico
                asignado.
              </p>
            </div>

            <Link
              href="/work-orders"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a órdenes
            </Link>
          </div>
        </section>

        {loadState.status === 'error' ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {loadState.error}
          </div>
        ) : null}

        {technicianWarning ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            {technicianWarning}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Título *
              </span>

              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Ejemplo: Revisión de fan coil habitación 407"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Cliente
              </span>

              <select
                value={form.customerId}
                onChange={(event) => handleCustomerChange(event.target.value)}
                disabled={loadState.status === 'loading'}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                <option value="">Sin cliente específico</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Site / ubicación
              </span>

              <select
                value={form.siteId}
                onChange={(event) => handleSiteChange(event.target.value)}
                disabled={loadState.status === 'loading'}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                <option value="">Sin site específico</option>
                {filteredSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.customer?.name ? ` · ${site.customer.name}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Activo / máquina
              </span>

              <select
                value={form.assetId}
                onChange={(event) => handleAssetChange(event.target.value)}
                disabled={loadState.status === 'loading'}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                <option value="">Sin activo específico</option>
                {filteredAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} · {getAssetCode(asset)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Técnico asignado
              </span>

              <select
                value={form.assignedToId}
                onChange={(event) =>
                  updateField('assignedToId', event.target.value)
                }
                disabled={loadState.status === 'loading'}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              >
                <option value="">Sin asignar</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {getTechnicianLabel(technician)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Prioridad
              </span>

              <select
                value={form.priority}
                onChange={(event) =>
                  updateField(
                    'priority',
                    event.target.value as WorkOrderPriority,
                  )
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Fecha programada
              </span>

              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  updateField('scheduledAt', event.target.value)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Descripción
              </span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="Describe el trabajo a realizar, síntomas, instrucciones de acceso, materiales o prioridad operativa..."
                rows={6}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/work-orders"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSaving || loadState.status === 'loading'}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Guardando...' : 'Crear orden'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
