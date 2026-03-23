'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { errMsg, isRecord, normalizeList, resolveCorePaths, tcFetch, tcGet } from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type CustomerOption = {
  id: string;
  name: string;
};

type SiteOption = {
  id: string;
  name: string;
  customerId?: string | null;
};

type AssetOption = {
  id: string;
  name: string;
  siteId?: string | null;
  customerId?: string | null;
};

type TechnicianOption = {
  id: string;
  name: string;
  email?: string | null;
};

type FormState = {
  title: string;
  description: string;
  customerId: string;
  siteId: string;
  assetId: string;
  assignedToUserId: string;
  priority: string;
  scheduledAt: string;
};

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
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
    customerId: typeof x.customerId === 'string' ? x.customerId : null,
  };
}

function parseAsset(x: unknown): AssetOption | null {
  if (!isRecord(x)) return null;
  const id = asStr(x.id);
  const name = asStr(x.name);
  if (!id || !name) return null;

  const siteId = typeof x.siteId === 'string' ? x.siteId : null;
  const customerId =
    typeof x.customerId === 'string'
      ? x.customerId
      : isRecord(x.site) && typeof x.site.customerId === 'string'
      ? x.site.customerId
      : null;

  return {
    id,
    name,
    siteId,
    customerId,
  };
}

function parseTechnician(x: unknown): TechnicianOption | null {
  if (!isRecord(x)) return null;
  const id = asStr(x.id);
  const name = asStr(x.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    email: typeof x.email === 'string' ? x.email : null,
  };
}

function toIsoDateTime(localValue: string): string | undefined {
  if (!localValue) return undefined;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function httpError(code: number, payload: unknown): string {
  if (isRecord(payload)) {
    const message = payload.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
    const error = payload.error;
    if (typeof error === 'string') return `${code} ${error}`;
  }
  return `HTTP ${code}`;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [session, setSession] = useState<TcSession | null>(null);
  const [mounted, setMounted] = useState(false);

  const paths = useMemo(() => resolveCorePaths(session), [session]);

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    customerId: '',
    siteId: '',
    assetId: '',
    assignedToUserId: '',
    priority: '',
    scheduledAt: '',
  });

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  const [metaError, setMetaError] = useState<string>('');
  const [submitState, setSubmitState] = useState<
    | { status: 'idle'; message: '' }
    | { status: 'saving'; message: string }
    | { status: 'error'; message: string }
  >({ status: 'idle', message: '' });

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    (async () => {
      try {
        setMetaError('');
        setLoadingCustomers(true);
        setLoadingTechnicians(true);

        const [customersRes, techsRes] = await Promise.all([
          tcGet(session, paths.customers),
          tcGet(session, `${paths.workOrders}/meta/technicians`),
        ]);

        if (cancelled) return;

        if (customersRes.code >= 200 && customersRes.code < 300) {
          const { items } = normalizeList(customersRes.json);
          setCustomers(items.map(parseCustomer).filter((x): x is CustomerOption => !!x));
        } else {
          throw new Error(httpError(customersRes.code, customersRes.json));
        }

        if (techsRes.code >= 200 && techsRes.code < 300) {
          const techItems = Array.isArray(techsRes.json)
            ? techsRes.json
            : normalizeList(techsRes.json).items;

          setTechnicians(
            techItems.map(parseTechnician).filter((x): x is TechnicianOption => !!x),
          );
        } else {
          throw new Error(httpError(techsRes.code, techsRes.json));
        }
      } catch (e) {
        if (!cancelled) setMetaError(errMsg(e));
      } finally {
        if (!cancelled) {
          setLoadingCustomers(false);
          setLoadingTechnicians(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, paths.customers, paths.workOrders]);

  useEffect(() => {
    if (!session || !form.customerId) {
      setSites([]);
      setForm((prev) => ({ ...prev, siteId: '', assetId: '' }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingSites(true);

        const qs = new URLSearchParams();
        qs.set('customerId', form.customerId);

        const response = await tcGet(session, `${paths.sites}?${qs.toString()}`);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          throw new Error(httpError(response.code, response.json));
        }

        const { items } = normalizeList(response.json);
        const parsed = items.map(parseSite).filter((x): x is SiteOption => !!x);

        setSites(parsed);
      } catch {
        if (!cancelled) {
          setSites([]);
        }
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, form.customerId, paths.sites]);

  useEffect(() => {
    if (!session || !form.siteId) {
      setAssets([]);
      setForm((prev) => ({ ...prev, assetId: '' }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingAssets(true);

        const qs = new URLSearchParams();
        qs.set('siteId', form.siteId);

        const response = await tcGet(session, `${paths.assets}?${qs.toString()}`);

        if (cancelled) return;

        if (response.code < 200 || response.code >= 300) {
          throw new Error(httpError(response.code, response.json));
        }

        const { items } = normalizeList(response.json);
        const parsed = items.map(parseAsset).filter((x): x is AssetOption => !!x);

        setAssets(parsed);
      } catch {
        if (!cancelled) {
          setAssets([]);
        }
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, form.siteId, paths.assets]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!session) {
      setSubmitState({ status: 'error', message: 'No hay sesión activa.' });
      return;
    }

    if (!form.title.trim()) {
      setSubmitState({ status: 'error', message: 'El título es obligatorio.' });
      return;
    }

    if (!form.customerId) {
      setSubmitState({ status: 'error', message: 'Selecciona un cliente.' });
      return;
    }

    if (!form.siteId) {
      setSubmitState({ status: 'error', message: 'Selecciona un site.' });
      return;
    }

    try {
      setSubmitState({ status: 'saving', message: 'Creando work order...' });

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        customerId: form.customerId,
        siteId: form.siteId,
        assetId: form.assetId || undefined,
        assignedToUserId: form.assignedToUserId || undefined,
        priority: form.priority ? Number(form.priority) : undefined,
        scheduledAt: toIsoDateTime(form.scheduledAt),
      };

      const response = await tcFetch(session, {
        method: 'POST',
        path: paths.workOrders,
        body: payload,
      });

      if (response.code < 200 || response.code >= 300) {
        throw new Error(httpError(response.code, response.json));
      }

      const createdId =
        isRecord(response.json) && typeof response.json.id === 'string'
          ? response.json.id
          : '';

      if (createdId) {
        router.push(`/work-orders/${createdId}`);
        return;
      }

      router.push('/work-orders');
    } catch (e) {
      setSubmitState({
        status: 'error',
        message: errMsg(e),
      });
    }
  }

  if (!mounted) {
    return <div className="p-6 text-slate-300">Cargando sesión…</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-slate-100">
        <h1 className="text-3xl font-semibold">New Work Order</h1>
        <p className="mt-3 text-slate-400">No hay sesión tenant. Ve a /login.</p>
        <Link className="mt-4 inline-block underline" href="/login">
          Ir a /login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 text-slate-100">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            <Link href="/work-orders" className="underline">
              Work Orders
            </Link>{' '}
            / Nueva orden
          </p>
          <h1 className="mt-2 text-3xl font-semibold">New Work Order</h1>
          <p className="mt-2 text-slate-400">
            Crear orden operativa desde administración y asignar técnico por nombre.
          </p>
        </div>

        <Link
          href="/work-orders"
          className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
        >
          ← Volver
        </Link>
      </div>

      {metaError ? (
        <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          Error cargando datos auxiliares: {metaError}
        </div>
      ) : null}

      {submitState.status === 'error' ? (
        <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {submitState.message}
        </div>
      ) : null}

      {submitState.status === 'saving' ? (
        <div className="mb-4 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-sky-200">
          {submitState.message}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Título *</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ej. Fuga de agua en cuarto técnico"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Descripción</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Detalles operativos, alcance y contexto..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Cliente *</span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.customerId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  customerId: e.target.value,
                  siteId: '',
                  assetId: '',
                }))
              }
              disabled={loadingCustomers}
            >
              <option value="">
                {loadingCustomers ? 'Cargando clientes...' : 'Selecciona cliente'}
              </option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Site *</span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.siteId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  siteId: e.target.value,
                  assetId: '',
                }))
              }
              disabled={!form.customerId || loadingSites}
            >
              <option value="">
                {!form.customerId
                  ? 'Selecciona cliente primero'
                  : loadingSites
                  ? 'Cargando sites...'
                  : 'Selecciona site'}
              </option>
              {sites.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Asset</span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.assetId}
              onChange={(e) => setForm((prev) => ({ ...prev, assetId: e.target.value }))}
              disabled={!form.siteId || loadingAssets}
            >
              <option value="">
                {!form.siteId
                  ? 'Selecciona site primero'
                  : loadingAssets
                  ? 'Cargando assets...'
                  : 'Sin asset / opcional'}
              </option>
              {assets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Técnico asignado</span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.assignedToUserId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  assignedToUserId: e.target.value,
                }))
              }
              disabled={loadingTechnicians}
            >
              <option value="">
                {loadingTechnicians ? 'Cargando técnicos...' : 'Sin asignar'}
              </option>
              {technicians.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.email ? ` — ${item.email}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Prioridad</span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Sin prioridad</option>
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
              <option value="4">Urgent</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Programado para</span>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              value={form.scheduledAt}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))
              }
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitState.status === 'saving'}
            className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-2 font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
          >
            {submitState.status === 'saving' ? 'Guardando...' : 'Crear work order'}
          </button>

          <Link
            href="/work-orders"
            className="rounded-xl border border-slate-700 px-5 py-2 hover:bg-slate-800"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}