'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import { errMsg, normalizeList, resolveCorePaths, tcFetch, tcGet } from '@/lib/tc/api';

type OptionItem = {
  id: string;
  name: string;
  customerId?: string;
  siteId?: string;
};

type TemplateItem = {
  id: string;
  name: string;
};

type LoadStatus = 'idle' | 'loading' | 'ok' | 'error';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseTemplateItem(value: unknown): TemplateItem | null {
  const obj = asRecord(value);
  const id = asString(obj.id);
  const name = asString(obj.title) ?? asString(obj.name);

  if (!id || !name) return null;

  return { id, name };
}

function parseOptionItem(value: unknown): OptionItem | null {
  const obj = asRecord(value);
  const site = asRecord(obj.site);

  const id = asString(obj.id);
  const name = asString(obj.name) ?? asString(obj.title);

  if (!id || !name) return null;

  return {
    id,
    name,
    customerId: asString(obj.customerId) ?? asString(site.customerId),
    siteId: asString(obj.siteId) ?? asString(site.id),
  };
}

export default function NewMaintenanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession] = useState<TcSession | null>(null);
  const [mounted, setMounted] = useState(false);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [customers, setCustomers] = useState<OptionItem[]>([]);
  const [sites, setSites] = useState<OptionItem[]>([]);
  const [assets, setAssets] = useState<OptionItem[]>([]);

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState('');

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  const [workOrderId, setWorkOrderId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [notes, setNotes] = useState('');

  const qpWorkOrderId = searchParams.get('workOrderId')?.trim() ?? '';
  const qpCustomerId = searchParams.get('customerId')?.trim() ?? '';
  const qpSiteId = searchParams.get('siteId')?.trim() ?? '';
  const qpAssetId = searchParams.get('assetId')?.trim() ?? '';

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  useEffect(() => {
    if (!mounted) return;

    setWorkOrderId(qpWorkOrderId);
    if (qpCustomerId) setCustomerId(qpCustomerId);
    if (qpSiteId) setSiteId(qpSiteId);
    if (qpAssetId) setAssetId(qpAssetId);
  }, [mounted, qpWorkOrderId, qpCustomerId, qpSiteId, qpAssetId]);

  useEffect(() => {
    if (!mounted) return;
    if (!session) {
      setLoadStatus('error');
      setLoadError('No hay sesión tenant. Ve a /login.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadStatus('loading');
        setLoadError('');

        const paths = resolveCorePaths(session);

        const [templatesRes, customersRes, sitesRes, assetsRes] = await Promise.all([
          tcGet<unknown>(session, paths.templates),
          tcGet<unknown>(session, paths.customers),
          tcGet<unknown>(session, paths.sites),
          tcGet<unknown>(session, paths.assets),
        ]);

        if (cancelled) return;

        if (templatesRes.code < 200 || templatesRes.code >= 300) {
          throw new Error(`No se pudieron cargar templates (${templatesRes.code})`);
        }
        if (customersRes.code < 200 || customersRes.code >= 300) {
          throw new Error(`No se pudieron cargar customers (${customersRes.code})`);
        }
        if (sitesRes.code < 200 || sitesRes.code >= 300) {
          throw new Error(`No se pudieron cargar sites (${sitesRes.code})`);
        }
        if (assetsRes.code < 200 || assetsRes.code >= 300) {
          throw new Error(`No se pudieron cargar assets (${assetsRes.code})`);
        }

        const templatesItems = normalizeList<unknown>(templatesRes.json).items
          .map(parseTemplateItem)
          .filter((item): item is TemplateItem => item !== null);

        const customerItems = normalizeList<unknown>(customersRes.json).items
          .map(parseOptionItem)
          .filter((item): item is OptionItem => item !== null);

        const siteItems = normalizeList<unknown>(sitesRes.json).items
          .map(parseOptionItem)
          .filter((item): item is OptionItem => item !== null);

        const assetItems = normalizeList<unknown>(assetsRes.json).items
          .map(parseOptionItem)
          .filter((item): item is OptionItem => item !== null);

        setTemplates(templatesItems);
        setCustomers(customerItems);
        setSites(siteItems);
        setAssets(assetItems);

        setLoadStatus('ok');
      } catch (e: unknown) {
        if (cancelled) return;
        setLoadStatus('error');
        setLoadError(errMsg(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, session]);

  const filteredSites = useMemo(() => {
    if (!customerId) return sites;
    return sites.filter((s) => s.customerId === customerId);
  }, [sites, customerId]);

  const filteredAssets = useMemo(() => {
    if (!siteId) return assets;
    return assets.filter((a) => a.siteId === siteId);
  }, [assets, siteId]);

  const backHref = workOrderId ? `/work-orders/${workOrderId}` : '/maintenance-reports';

  const lockCustomer = !!workOrderId && !!customerId;
  const lockSite = !!workOrderId && !!siteId;
  const lockAsset = !!workOrderId && !!assetId;

  function onChangeCustomer(value: string) {
    setCustomerId(value);
    setSiteId('');
    setAssetId('');
  }

  function onChangeSite(value: string) {
    setSiteId(value);
    setAssetId('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!session) {
      setSubmitStatus('error');
      setSubmitError('No hay sesión tenant.');
      return;
    }

    if (!templateId || !customerId || !siteId || !assetId) {
      setSubmitStatus('error');
      setSubmitError('Template, Customer, Site y Asset son obligatorios.');
      return;
    }

    try {
      setSubmitStatus('saving');
      setSubmitError('');

      const paths = resolveCorePaths(session);

      const res = await tcFetch<{ id?: string; message?: string }>(session, {
        method: 'POST',
        path: paths.reports,
        body: {
          templateId,
          customerId,
          siteId,
          assetId,
          workOrderId: workOrderId || undefined,
          notes: notes.trim() || undefined,
        },
      });

      if (res.code < 200 || res.code >= 300) {
        const msg =
          typeof res.json === 'object' &&
          res.json !== null &&
          'message' in res.json &&
          typeof (res.json as { message?: unknown }).message === 'string'
            ? (res.json as { message: string }).message
            : `Error HTTP ${res.code}`;
        throw new Error(msg);
      }

      const newId =
        typeof res.json === 'object' &&
        res.json !== null &&
        'id' in res.json &&
        typeof (res.json as { id?: unknown }).id === 'string'
          ? (res.json as { id: string }).id
          : '';

      if (!newId) {
        throw new Error('El backend creó el reporte pero no devolvió un id válido.');
      }

      router.push(`/maintenance-reports/${newId}`);
    } catch (e: unknown) {
      setSubmitStatus('error');
      setSubmitError(errMsg(e));
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4 text-sm text-slate-400">
          Cargando sesión…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">New Maintenance Report</h1>
            <p className="mt-1 text-sm text-slate-400">Crear reporte desde template.</p>
          </div>
          <Link href={backHref} className="text-sm text-slate-300 hover:text-white">
            ← Volver
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4 text-sm text-red-200">
          No hay sesión tenant. Ve a <Link href="/login" className="underline text-white">/login</Link>.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {workOrderId ? 'Nuevo parte de trabajo' : 'New Maintenance Report'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {workOrderId
              ? 'Crear parte técnico vinculado a una work order.'
              : 'Crear reporte desde un template existente.'}
          </p>
        </div>

        <Link href={backHref} className="text-sm text-slate-300 hover:text-white">
          ← Volver
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-5">
        {workOrderId ? (
          <div className="mb-5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            Este parte quedará vinculado a la work order <span className="font-mono">{workOrderId}</span>.
          </div>
        ) : null}

        {loadStatus === 'loading' ? (
          <div className="text-sm text-slate-400">Cargando catálogos…</div>
        ) : loadStatus === 'error' ? (
          <div className="text-sm text-red-200">{loadError}</div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Template</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Selecciona un template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Customer</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                value={customerId}
                onChange={(e) => onChangeCustomer(e.target.value)}
                disabled={lockCustomer}
              >
                <option value="">Selecciona un customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Site</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                value={siteId}
                onChange={(e) => onChangeSite(e.target.value)}
                disabled={lockSite || !customerId}
              >
                <option value="">Selecciona un site</option>
                {filteredSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Asset</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                disabled={lockAsset || !siteId}
              >
                <option value="">Selecciona un asset</option>
                {filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Notes</label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas iniciales del reporte"
              />
            </div>

            {submitStatus === 'error' && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitStatus === 'saving'}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {submitStatus === 'saving'
                  ? 'Creating…'
                  : workOrderId
                    ? 'Crear parte'
                    : 'Create Report'}
              </button>

              <Link
                href={backHref}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}