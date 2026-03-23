'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  isTechnicianSession,
  readTcSession,
  resolveHomePath,
  resolveWorkOrdersPath,
  type TcSession,
} from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  normalizeList,
  resolveCorePaths,
  tcGet,
  tcPost,
} from '@/lib/tc/api';

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type CustomerOption = {
  id: string;
  name: string;
};

type SiteOption = {
  id: string;
  name: string;
  address?: string | null;
  customerId?: string | null;
};

type AssetOption = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  siteId?: string | null;
  customerId?: string | null;
};

type TechnicianOption = {
  id: string;
  name: string;
  email?: string | null;
};

type WorkOrderForm = {
  title: string;
  description: string;
  customerId: string;
  siteId: string;
  assetId: string;
  assignedToUserId: string;
  priority: '' | '1' | '2' | '3' | '4';
  scheduledAt: string;
};

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function apiErrorMessage(json: unknown, fallback: string): string {
  if (typeof json === 'string' && json.trim()) return json;

  if (isRecord(json)) {
    const message = json.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const parts = message.filter((x): x is string => typeof x === 'string' && !!x.trim());
      if (parts.length) return parts.join(' · ');
    }

    const error = json.error;
    if (typeof error === 'string' && error.trim()) {
      return `${error}: ${fallback}`;
    }
  }

  return fallback;
}

function parseCustomer(x: unknown): CustomerOption | null {
  if (!isRecord(x)) return null;

  const id = asStr(x.id);
  const name = asStr(x.name);

  if (!id || !name) return null;

  return { id, name };
}

function parseSite(x: unknown): SiteOption | null {
  if (!isRecord(x)) return null;

  const id = asStr(x.id);
  const name = asStr(x.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    address: asNullableStr(x.address),
    customerId: asNullableStr(x.customerId),
  };
}

function parseAsset(x: unknown): AssetOption | null {
  if (!isRecord(x)) return null;

  const id = asStr(x.id);
  const name = asStr(x.name);

  if (!id || !name) return null;

  const nestedSite = isRecord(x.site) ? x.site : null;

  return {
    id,
    name,
    brand: asNullableStr(x.brand),
    model: asNullableStr(x.model),
    serialNumber: asNullableStr(x.serialNumber) ?? asNullableStr(x.serial),
    siteId: asNullableStr(x.siteId) ?? asNullableStr(nestedSite?.id),
    customerId: asNullableStr(x.customerId) ?? asNullableStr(nestedSite?.customerId),
  };
}

function parseTechnician(x: unknown): TechnicianOption | null {
  if (!isRecord(x)) return null;

  const id = asStr(x.id);
  const name = asStr(x.name);
  const email = asNullableStr(x.email);

  if (!id || !name) return null;

  return { id, name, email };
}

function inputToIso(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [catalogState, setCatalogState] = useState<
    Load<{
      customers: CustomerOption[];
      sites: SiteOption[];
      assets: AssetOption[];
      technicians: TechnicianOption[];
    }>
  >({ status: 'loading' });

  const [form, setForm] = useState<WorkOrderForm>({
    title: '',
    description: '',
    customerId: '',
    siteId: '',
    assetId: '',
    assignedToUserId: '',
    priority: '',
    scheduledAt: '',
  });

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted || !session) return;

    if (isTechnicianSession(session)) {
      router.replace(resolveWorkOrdersPath(session));
    }
  }, [mounted, router, session]);

  useEffect(() => {
    if (!mounted || !session) return;
    if (isTechnicianSession(session)) return;

    let cancelled = false;

    (async () => {
      try {
        setCatalogState({ status: 'loading' });

        const [customersRes, sitesRes, assetsRes, techniciansRes] = await Promise.all([
          tcGet<unknown>(session, paths.customers),
          tcGet<unknown>(session, paths.sites),
          tcGet<unknown>(session, paths.assets),
          tcGet<unknown>(session, `${paths.workOrders}/meta/technicians`),
        ]);

        if (cancelled) return;

        const responses = [customersRes, sitesRes, assetsRes, techniciansRes];
        const failed = responses.find((r) => r.code < 200 || r.code >= 300);

        if (failed) {
          setCatalogState({
            status: 'error',
            error: apiErrorMessage(failed.json, `HTTP ${failed.code}`),
          });
          return;
        }

        const customers = normalizeList<unknown>(customersRes.json).items
          .map(parseCustomer)
          .filter((x): x is CustomerOption => !!x)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        const sites = normalizeList<unknown>(sitesRes.json).items
          .map(parseSite)
          .filter((x): x is SiteOption => !!x)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        const assets = normalizeList<unknown>(assetsRes.json).items
          .map(parseAsset)
          .filter((x): x is AssetOption => !!x)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        const technicians = normalizeList<unknown>(techniciansRes.json).items
          .map(parseTechnician)
          .filter((x): x is TechnicianOption => !!x)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        setCatalogState({
          status: 'ok',
          data: {
            customers,
            sites,
            assets,
            technicians,
          },
        });
      } catch (e) {
        if (!cancelled) {
          setCatalogState({
            status: 'error',
            error: errMsg(e),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, session, paths.assets, paths.customers, paths.sites, paths.workOrders]);

  const filteredSites = useMemo(() => {
    if (catalogState.status !== 'ok') return [];
    if (!form.customerId) return catalogState.data.sites;
    return catalogState.data.sites.filter((site) => site.customerId === form.customerId);
  }, [catalogState, form.customerId]);

  const filteredAssets = useMemo(() => {
    if (catalogState.status !== 'ok') return [];

    if (form.siteId) {
      return catalogState.data.assets.filter((asset) => asset.siteId === form.siteId);
    }

    if (form.customerId) {
      return catalogState.data.assets.filter((asset) => asset.customerId === form.customerId);
    }

    return catalogState.data.assets;
  }, [catalogState, form.customerId, form.siteId]);

  useEffect(() => {
    if (!form.siteId) return;
    const exists = filteredSites.some((site) => site.id === form.siteId);
    if (!exists) {
      setForm((prev) => ({
        ...prev,
        siteId: '',
        assetId: '',
      }));
    }
  }, [filteredSites, form.siteId]);

  useEffect(() => {
    if (!form.assetId) return;
    const exists = filteredAssets.some((asset) => asset.id === form.assetId);
    if (!exists) {
      setForm((prev) => ({
        ...prev,
        assetId: '',
      }));
    }
  }, [filteredAssets, form.assetId]);

  function updateField<K extends keyof WorkOrderForm>(key: K, value: WorkOrderForm[K]) {
    setForm((prev) => {
      if (key === 'customerId') {
        return {
          ...prev,
          customerId: value as WorkOrderForm[K] & string,
          siteId: '',
          assetId: '',
        };
      }

      if (key === 'siteId') {
        return {
          ...prev,
          siteId: value as WorkOrderForm[K] & string,
          assetId: '',
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError('');

    if (!session) {
      setSubmitError('No hay sesión activa.');
      return;
    }

    if (!form.title.trim()) {
      setSubmitError('El título es obligatorio.');
      return;
    }

    if (!form.customerId) {
      setSubmitError('Debes seleccionar un customer.');
      return;
    }

    if (!form.siteId) {
      setSubmitError('Debes seleccionar un site.');
      return;
    }

    try {
      setSubmitting(true);

      const body: Record<string, unknown> = {
        title: form.title.trim(),
        customerId: form.customerId,
        siteId: form.siteId,
      };

      const description = form.description.trim();
      if (description) body.description = description;
      if (form.assetId) body.assetId = form.assetId;
      if (form.assignedToUserId) body.assignedToUserId = form.assignedToUserId;
      if (form.priority) body.priority = Number(form.priority);

      const scheduledAtIso = inputToIso(form.scheduledAt);
      if (scheduledAtIso) body.scheduledAt = scheduledAtIso;

      const r = await tcPost<unknown>(session, paths.workOrders, body);

      if (r.code < 200 || r.code >= 300) {
        setSubmitError(apiErrorMessage(r.json, `HTTP ${r.code}`));
        return;
      }

      let newId = '';

      if (isRecord(r.json) && typeof r.json.id === 'string') {
        newId = r.json.id;
      }

      if (newId) {
        router.push(`/work-orders/${newId}`);
        return;
      }

      router.push(resolveWorkOrdersPath(session));
    } catch (e) {
      setSubmitError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p>Cargando sesión…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="mb-4 text-3xl font-semibold">New Work Order</h1>
        <p className="mb-4">Sin sesión tenant. Ve a /login.</p>
        <Link className="underline" href="/login">
          Ir a /login
        </Link>
      </main>
    );
  }

  if (isTechnicianSession(session)) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p>Redirigiendo al panel técnico…</p>
      </main>
    );
  }

  const backHref = resolveWorkOrdersPath(session);
  const homeHref = resolveHomePath(session);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Nueva Work Order</h1>
          <p className="mt-1 text-sm text-slate-400">
            Crea una orden de trabajo y asígnala opcionalmente a un técnico.
          </p>
        </div>

        <div className="flex gap-4 text-sm">
          <Link className="underline" href={homeHref}>
            Dashboard
          </Link>
          <Link className="underline" href={backHref}>
            Volver a Work Orders
          </Link>
        </div>
      </div>

      {catalogState.status === 'loading' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p>Cargando catálogos…</p>
        </div>
      ) : catalogState.status === 'error' ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
          <p>{catalogState.error}</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 md:grid-cols-4">
            <div>
              <div className="text-slate-400">Customers</div>
              <div className="mt-1 font-medium">{catalogState.data.customers.length}</div>
            </div>
            <div>
              <div className="text-slate-400">Sites</div>
              <div className="mt-1 font-medium">{catalogState.data.sites.length}</div>
            </div>
            <div>
              <div className="text-slate-400">Assets</div>
              <div className="mt-1 font-medium">{catalogState.data.assets.length}</div>
            </div>
            <div>
              <div className="text-slate-400">Technicians</div>
              <div className="mt-1 font-medium">{catalogState.data.technicians.length}</div>
            </div>
          </div>

          <form
            className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            onSubmit={onSubmit}
          >
            <section className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Título *
                </label>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Ej: Revisar fuga en cuarto de bombas"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Descripción
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe el trabajo a realizar"
                />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Customer *
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.customerId}
                  onChange={(e) => updateField('customerId', e.target.value)}
                >
                  <option value="">Selecciona un customer</option>
                  {catalogState.data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Site *
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.siteId}
                  onChange={(e) => updateField('siteId', e.target.value)}
                  disabled={!form.customerId}
                >
                  <option value="">
                    {form.customerId ? 'Selecciona un site' : 'Primero selecciona customer'}
                  </option>
                  {filteredSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                      {site.address ? ` — ${site.address}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Asset
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.assetId}
                  onChange={(e) => updateField('assetId', e.target.value)}
                  disabled={!form.customerId}
                >
                  <option value="">Sin asset</option>
                  {filteredAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                      {asset.brand || asset.model
                        ? ` — ${[asset.brand, asset.model].filter(Boolean).join(' ')}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Técnico asignado
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.assignedToUserId}
                  onChange={(e) => updateField('assignedToUserId', e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {catalogState.data.technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                      {tech.email ? ` — ${tech.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Prioridad
                </label>
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.priority}
                  onChange={(e) =>
                    updateField('priority', e.target.value as WorkOrderForm['priority'])
                  }
                >
                  <option value="">Sin prioridad</option>
                  <option value="1">1 - Baja</option>
                  <option value="2">2 - Media</option>
                  <option value="3">3 - Alta</option>
                  <option value="4">4 - Urgente</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Programado para
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  value={form.scheduledAt}
                  onChange={(e) => updateField('scheduledAt', e.target.value)}
                />
              </div>
            </section>

            {submitError ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 md:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-slate-100 px-4 py-2 font-medium text-slate-900 disabled:opacity-60"
              >
                {submitting ? 'Creando…' : 'Crear Work Order'}
              </button>

              <Link
                href={backHref}
                className="rounded-xl border border-slate-700 px-4 py-2 text-center hover:bg-slate-800"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </>
      )}
    </main>
  );
}