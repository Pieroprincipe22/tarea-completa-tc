'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  errMsg,
  isRecord,
  normalizeList,
  tcGet,
  tcPatch,
  tcPost,
} from '@/lib/tc/api';
import { readTcSession, type TcSession } from '@/lib/tc/session';

type CompanyPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';
const PLANS: CompanyPlan[] = ['BASIC', 'PRO', 'ENTERPRISE'];

type CompanyRow = {
  id: string;
  name: string;
  plan: CompanyPlan;
  invoicePrefix: string | null;
  isActive: boolean;
  createdAt?: string | null;
  userCount: number;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asPlan(value: unknown): CompanyPlan {
  return value === 'PRO' || value === 'ENTERPRISE' ? value : 'BASIC';
}

function parseCompany(value: unknown): CompanyRow {
  if (!isRecord(value)) {
    return {
      id: '',
      name: 'Empresa',
      plan: 'BASIC',
      invoicePrefix: null,
      isActive: true,
      userCount: 0,
    };
  }
  const count = isRecord(value._count) ? value._count.userCompanies : undefined;
  return {
    id: asStr(value.id),
    name: asStr(value.name, 'Empresa sin nombre'),
    plan: asPlan(value.plan),
    invoicePrefix:
      typeof value.invoicePrefix === 'string' && value.invoicePrefix
        ? value.invoicePrefix
        : null,
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    userCount: typeof count === 'number' ? count : 0,
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

function planBadgeClass(plan: CompanyPlan): string {
  if (plan === 'ENTERPRISE') return 'border-violet-400/40 bg-violet-400/10 text-violet-200';
  if (plan === 'PRO') return 'border-sky-400/40 bg-sky-400/10 text-sky-200';
  return 'border-slate-400/30 bg-slate-400/10 text-slate-300';
}

const emptyForm = {
  companyName: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  plan: 'BASIC' as CompanyPlan,
  invoicePrefix: '',
};

export default function SuperAdminPage() {
  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Load<CompanyRow[]>>({ status: 'loading' });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const isSuperAdmin = useMemo(
    () => (session?.role ?? '').toUpperCase() === 'SUPER_ADMIN',
    [session],
  );

  const loadCompanies = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await tcGet(session, '/companies');
      if (res.code < 200 || res.code >= 300) {
        setState({ status: 'error', error: `Error ${res.code} al cargar empresas` });
        return;
      }
      const { items } = normalizeList(res.json);
      setState({ status: 'ok', data: items.map(parseCompany) });
    } catch (e) {
      setState({ status: 'error', error: errMsg(e) });
    }
  }, [session]);

  useEffect(() => {
    if (ready && isSuperAdmin) void loadCompanies();
  }, [ready, isSuperAdmin, loadCompanies]);

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    setFormError(null);
    setNotice(null);

    const companyName = form.companyName.trim();
    const ownerEmail = form.ownerEmail.trim();
    const ownerPassword = form.ownerPassword.trim();

    if (companyName.length < 2) {
      setFormError('El nombre de la empresa es obligatorio.');
      return;
    }
    if (!ownerEmail.includes('@')) {
      setFormError('Introduce un email válido para el administrador.');
      return;
    }
    if (ownerPassword.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await tcPost(session, '/companies', {
        companyName,
        ownerEmail,
        ownerName: form.ownerName.trim() || undefined,
        ownerPassword,
        plan: form.plan,
        invoicePrefix: form.invoicePrefix.trim() || undefined,
      });

      if (res.code < 200 || res.code >= 300) {
        const msg =
          isRecord(res.json) && typeof res.json.message === 'string'
            ? res.json.message
            : `Error ${res.code} al crear la empresa`;
        setFormError(msg);
        return;
      }

      setNotice(
        `Empresa "${companyName}" creada (${form.plan}). Credenciales del administrador — email: ${ownerEmail} · contraseña: ${ownerPassword}`,
      );
      setForm(emptyForm);
      setShowForm(false);
      await loadCompanies();
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlanChange(company: CompanyRow, plan: CompanyPlan) {
    if (plan === company.plan) return;
    setActionError(null);
    setBusyId(company.id);
    try {
      const res = await tcPatch(session, `/companies/${company.id}/plan`, { plan });
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo cambiar el plan (error ${res.code}).`);
        return;
      }
      await loadCompanies();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(company: CompanyRow) {
    setActionError(null);
    setBusyId(company.id);
    try {
      const res = await tcPatch(session, `/companies/${company.id}/status`, {
        isActive: !company.isActive,
      });
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo cambiar el estado (error ${res.code}).`);
        return;
      }
      await loadCompanies();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePrefixEdit(company: CompanyRow) {
    const input = window.prompt(
      `Prefijo de facturación para "${company.name}" (letras/números, máx. 8):`,
      company.invoicePrefix ?? '',
    );
    if (input === null) return;

    const prefix = input.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(prefix)) {
      setActionError('Prefijo inválido: solo letras y números, máximo 8 caracteres.');
      return;
    }

    setActionError(null);
    setBusyId(company.id);
    try {
      const res = await tcPatch(session, `/companies/${company.id}/invoice-prefix`, {
        invoicePrefix: prefix,
      });
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo cambiar el prefijo (error ${res.code}).`);
        return;
      }
      await loadCompanies();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) return <div className="p-8 text-slate-400">Cargando…</div>;

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-3xl border border-rose-400/30 bg-rose-400/5 p-8 text-center">
          <h1 className="text-xl font-black text-white">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Esta sección es exclusiva para administradores de plataforma (SUPER_ADMIN).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
            Plataforma
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
            Panel de administración
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Gestiona las empresas dadas de alta, sus planes y su estado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
            setNotice(null);
          }}
          className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
        >
          {showForm ? 'Cerrar' : '+ Nueva empresa'}
        </button>
      </header>

      {notice ? (
        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-200">
          {notice}
        </div>
      ) : null}

      {showForm ? (
        <section className="mb-6 rounded-3xl border border-slate-800/90 bg-slate-900/55 p-6">
          <h2 className="mb-4 text-lg font-black tracking-tight text-white">
            Nueva empresa
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre de la empresa">
              <input
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                placeholder="Hotel Miramar"
                className="tc-input"
              />
            </Field>

            <Field label="Plan">
              <select
                value={form.plan}
                onChange={(e) => setField('plan', e.target.value)}
                className="tc-input"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            <Field label="Prefijo de factura (ej. HR)">
              <input
                value={form.invoicePrefix}
                onChange={(e) =>
                  setField('invoicePrefix', e.target.value.toUpperCase())
                }
                placeholder="HR"
                maxLength={8}
                className="tc-input"
              />
            </Field>

            <Field label="Nombre del administrador (opcional)">
              <input
                value={form.ownerName}
                onChange={(e) => setField('ownerName', e.target.value)}
                placeholder="Gerente"
                className="tc-input"
              />
            </Field>

            <Field label="Email del administrador">
              <input
                value={form.ownerEmail}
                onChange={(e) => setField('ownerEmail', e.target.value)}
                placeholder="admin@empresa.com"
                className="tc-input"
              />
            </Field>

            <Field label="Contraseña (mín. 8 caracteres)">
              <input
                value={form.ownerPassword}
                onChange={(e) => setField('ownerPassword', e.target.value)}
                placeholder="••••••••"
                className="tc-input"
              />
            </Field>
          </div>

          {formError ? (
            <p className="mt-4 text-sm text-rose-300">{formError}</p>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleCreate()}
              className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-60"
            >
              {submitting ? 'Creando…' : 'Crear empresa'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
                setFormError(null);
              }}
              className="rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-black text-slate-300 transition hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-white">Empresas</h2>
          <button
            type="button"
            onClick={() => void loadCompanies()}
            className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-300 transition hover:bg-slate-800"
          >
            Recargar
          </button>
        </div>

        {actionError ? (
          <p className="mb-3 text-sm text-rose-300">{actionError}</p>
        ) : null}

        {state.status === 'loading' ? (
          <p className="py-8 text-center text-sm text-slate-400">Cargando empresas…</p>
        ) : null}

        {state.status === 'error' ? (
          <p className="py-8 text-center text-sm text-rose-300">{state.error}</p>
        ) : null}

        {state.status === 'ok' ? (
          state.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No hay empresas registradas todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Empresa</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Prefijo</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Usuarios</th>
                    <th className="px-3 py-3">Alta</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-3 py-3 font-bold text-white">{c.name}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${planBadgeClass(c.plan)}`}
                        >
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void handlePrefixEdit(c)}
                          title="Clic para editar el prefijo"
                          className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1 font-mono text-xs font-bold text-slate-200 transition hover:border-sky-400/50 hover:text-sky-200 disabled:opacity-50"
                        >
                          {c.invoicePrefix ?? '— sin prefijo —'}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            c.isActive
                              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                              : 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                          }`}
                        >
                          {c.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{c.userCount}</td>
                      <td className="px-3 py-3 text-slate-400">{formatDate(c.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={c.plan}
                            disabled={busyId === c.id}
                            onChange={(e) =>
                              void handlePlanChange(c, e.target.value as CompanyPlan)
                            }
                            className="rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-50"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={() => void handleToggleActive(c)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-black transition disabled:opacity-50 ${
                              c.isActive
                                ? 'border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20'
                                : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
                            }`}
                          >
                            {busyId === c.id ? '…' : c.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}