'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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

type CompanyDetail = {
  id: string;
  name: string;
  plan: CompanyPlan;
  invoicePrefix: string | null;
  isActive: boolean;
  createdAt?: string | null;
};

type CompanyUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string | null;
};

type Load<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'TECHNICIAN' as 'TECHNICIAN' | 'ADMIN',
};

function asStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asPlan(value: unknown): CompanyPlan {
  return value === 'PRO' || value === 'ENTERPRISE' ? value : 'BASIC';
}

function parseCompany(value: unknown, fallbackId: string): CompanyDetail {
  if (!isRecord(value)) {
    return {
      id: fallbackId,
      name: 'Empresa',
      plan: 'BASIC',
      invoicePrefix: null,
      isActive: true,
    };
  }

  return {
    id: asStr(value.id, fallbackId),
    name: asStr(value.name, 'Empresa sin nombre'),
    plan: asPlan(value.plan),
    invoicePrefix:
      typeof value.invoicePrefix === 'string' && value.invoicePrefix
        ? value.invoicePrefix
        : null,
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
  };
}

function parseUser(value: unknown, companyId: string): CompanyUserRow | null {
  if (!isRecord(value)) return null;

  const id = asStr(value.id);
  if (!id) return null;

  const memberships = Array.isArray(value.memberships) ? value.memberships : [];
  const membership = memberships.find(
    (m) => isRecord(m) && asStr(m.companyId) === companyId,
  );
  const role = isRecord(membership)
    ? asStr(membership.role, asStr(value.role, 'TECHNICIAN'))
    : asStr(value.role, 'TECHNICIAN');

  return {
    id,
    name: asStr(value.name, 'Sin nombre'),
    email: asStr(value.email),
    role,
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
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

export default function SuperAdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const [session, setSession] = useState<TcSession | null>(null);
  const [ready, setReady] = useState(false);

  const [companyState, setCompanyState] = useState<Load<CompanyDetail>>({
    status: 'loading',
  });
  const [usersState, setUsersState] = useState<Load<CompanyUserRow[]>>({
    status: 'loading',
  });

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  const isSuperAdmin = useMemo(
    () => (session?.role ?? '').toUpperCase() === 'SUPER_ADMIN',
    [session],
  );

  // Sesión "impersonada": mismas credenciales, pero apuntando a la empresa
  // objetivo. El backend resuelve esto vía el bypass de plataforma en
  // TenantGuard (solo funciona porque el usuario real es SUPER_ADMIN).
  const targetSession = useMemo<TcSession | null>(() => {
    if (!session) return null;
    return { ...session, companyId };
  }, [session, companyId]);

  const loadCompany = useCallback(async () => {
    if (!targetSession) return;
    setCompanyState({ status: 'loading' });
    try {
      const res = await tcGet(targetSession, `/companies/${companyId}`);
      if (res.code < 200 || res.code >= 300) {
        setCompanyState({
          status: 'error',
          error: `Error ${res.code} al cargar la empresa`,
        });
        return;
      }
      setCompanyState({ status: 'ok', data: parseCompany(res.json, companyId) });
    } catch (e) {
      setCompanyState({ status: 'error', error: errMsg(e) });
    }
  }, [targetSession, companyId]);

  const loadUsers = useCallback(async () => {
    if (!targetSession) return;
    setUsersState({ status: 'loading' });
    try {
      const res = await tcGet(targetSession, '/company-users');
      if (res.code < 200 || res.code >= 300) {
        setUsersState({
          status: 'error',
          error: `Error ${res.code} al cargar los usuarios`,
        });
        return;
      }
      const { items } = normalizeList(res.json);
      const parsed = items
        .map((item) => parseUser(item, companyId))
        .filter((item): item is CompanyUserRow => item !== null);
      setUsersState({ status: 'ok', data: parsed });
    } catch (e) {
      setUsersState({ status: 'error', error: errMsg(e) });
    }
  }, [targetSession, companyId]);

  useEffect(() => {
    if (ready && isSuperAdmin) {
      void loadCompany();
      void loadUsers();
    }
  }, [ready, isSuperAdmin, loadCompany, loadUsers]);

  async function handlePlanChange(plan: CompanyPlan) {
    if (companyState.status !== 'ok' || plan === companyState.data.plan) return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await tcPatch(targetSession, `/companies/${companyId}/plan`, {
        plan,
      });
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo cambiar el plan (error ${res.code}).`);
        return;
      }
      await loadCompany();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    if (companyState.status !== 'ok') return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await tcPatch(targetSession, `/companies/${companyId}/status`, {
        isActive: !companyState.data.isActive,
      });
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo cambiar el estado (error ${res.code}).`);
        return;
      }
      await loadCompany();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function handlePrefixEdit() {
    if (companyState.status !== 'ok') return;
    const input = window.prompt(
      'Prefijo de facturación (letras/números, máx. 8):',
      companyState.data.invoicePrefix ?? '',
    );
    if (input === null) return;

    const prefix = input.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(prefix)) {
      setActionError('Prefijo inválido: solo letras y números, máximo 8 caracteres.');
      return;
    }

    setActionError(null);
    setBusy(true);
    try {
      const res = await tcPatch(
        targetSession,
        `/companies/${companyId}/invoice-prefix`,
        { invoicePrefix: prefix },
      );
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo cambiar el prefijo (error ${res.code}).`);
        return;
      }
      await loadCompany();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser() {
    setUserFormError(null);
    setUserNotice(null);

    const name = userForm.name.trim();
    const email = userForm.email.trim().toLowerCase();
    const password = userForm.password;

    if (!name) {
      setUserFormError('El nombre es obligatorio.');
      return;
    }
    if (!email.includes('@')) {
      setUserFormError('Introduce un email válido.');
      return;
    }
    if (password.length < 6) {
      setUserFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await tcPost(targetSession, '/company-users', {
        name,
        email,
        password,
        role: userForm.role,
      });

      if (res.code < 200 || res.code >= 300) {
        const msg =
          isRecord(res.json) && typeof res.json.message === 'string'
            ? res.json.message
            : `Error ${res.code} al crear el usuario`;
        setUserFormError(msg);
        return;
      }

      setUserNotice(
        `Usuario "${name}" creado (${userForm.role}) — email: ${email} · contraseña: ${password}`,
      );
      setUserForm(emptyUserForm);
      setShowUserForm(false);
      await loadUsers();
    } catch (e) {
      setUserFormError(errMsg(e));
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleToggleUserActive(user: CompanyUserRow) {
    setActionError(null);
    setBusyUserId(user.id);
    try {
      const action = user.isActive ? 'deactivate' : 'activate';
      const res = await tcPatch(
        targetSession,
        `/company-users/${user.id}/${action}`,
      );
      if (res.code < 200 || res.code >= 300) {
        setActionError(`No se pudo actualizar el usuario (error ${res.code}).`);
        return;
      }
      await loadUsers();
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusyUserId(null);
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
      <Link
        href="/super-admin"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-500 transition hover:text-sky-300"
      >
        ← Volver a empresas
      </Link>

      {companyState.status === 'loading' ? (
        <p className="py-8 text-center text-sm text-slate-400">Cargando empresa…</p>
      ) : null}

      {companyState.status === 'error' ? (
        <p className="py-8 text-center text-sm text-rose-300">{companyState.error}</p>
      ) : null}

      {companyState.status === 'ok' ? (
        <>
          <header className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
              Plataforma · Configurar empresa
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              {companyState.data.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Alta desde {formatDate(companyState.data.createdAt)}
            </p>
          </header>

          {actionError ? (
            <p className="mb-4 text-sm text-rose-300">{actionError}</p>
          ) : null}

          <section className="mb-6 grid gap-4 rounded-3xl border border-slate-800/90 bg-slate-900/55 p-6 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
                Plan
              </p>
              <select
                value={companyState.data.plan}
                disabled={busy}
                onChange={(e) => void handlePlanChange(e.target.value as CompanyPlan)}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50 ${planBadgeClass(companyState.data.plan)}`}
              >
                {PLANS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-slate-200">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
                Estado
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleToggleActive()}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-black transition disabled:opacity-50 ${
                  companyState.data.isActive
                    ? 'border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20'
                    : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
                }`}
              >
                {busy
                  ? '…'
                  : companyState.data.isActive
                    ? 'Activa · clic para desactivar'
                    : 'Inactiva · clic para activar'}
              </button>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
                Prefijo de facturación
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePrefixEdit()}
                title="Clic para editar el prefijo"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 font-mono text-sm font-bold text-slate-200 transition hover:border-sky-400/50 hover:text-sky-200 disabled:opacity-50"
              >
                {companyState.data.invoicePrefix ?? '— sin prefijo —'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800/90 bg-slate-900/55 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-white">
                Usuarios de esta empresa
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowUserForm((v) => !v);
                  setUserFormError(null);
                }}
                className="rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-sky-400"
              >
                {showUserForm ? 'Cerrar' : '+ Nuevo usuario'}
              </button>
            </div>

            {userNotice ? (
              <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-200">
                {userNotice}
              </div>
            ) : null}

            {showUserForm ? (
              <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">
                      Nombre
                    </span>
                    <input
                      value={userForm.name}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Nombre completo"
                      className="tc-input"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">
                      Email
                    </span>
                    <input
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="usuario@empresa.com"
                      className="tc-input"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">
                      Contraseña inicial
                    </span>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) =>
                        setUserForm((f) => ({ ...f, password: e.target.value }))
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="tc-input"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">
                      Rol
                    </span>
                    <select
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm((f) => ({
                          ...f,
                          role: e.target.value as 'TECHNICIAN' | 'ADMIN',
                        }))
                      }
                      className="tc-input"
                    >
                      <option value="TECHNICIAN">Técnico</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </label>
                </div>

                {userFormError ? (
                  <p className="mt-4 text-sm text-rose-300">{userFormError}</p>
                ) : null}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={creatingUser}
                    onClick={() => void handleCreateUser()}
                    className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-60"
                  >
                    {creatingUser ? 'Creando…' : 'Crear usuario'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false);
                      setUserForm(emptyUserForm);
                      setUserFormError(null);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-black text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {usersState.status === 'loading' ? (
              <p className="py-8 text-center text-sm text-slate-400">Cargando usuarios…</p>
            ) : null}

            {usersState.status === 'error' ? (
              <p className="py-8 text-center text-sm text-rose-300">{usersState.error}</p>
            ) : null}

            {usersState.status === 'ok' ? (
              usersState.data.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Esta empresa todavía no tiene usuarios.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-black uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Nombre</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Rol</th>
                        <th className="px-3 py-3">Estado</th>
                        <th className="px-3 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersState.data.map((u) => (
                        <tr key={u.id} className="border-b border-slate-800/60 last:border-0">
                          <td className="px-3 py-3 font-bold text-white">{u.name}</td>
                          <td className="px-3 py-3 text-slate-300">{u.email}</td>
                          <td className="px-3 py-3 text-slate-300">{u.role}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                u.isActive
                                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                  : 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                              }`}
                            >
                              {u.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              disabled={busyUserId === u.id}
                              onClick={() => void handleToggleUserActive(u)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-black transition disabled:opacity-50 ${
                                u.isActive
                                  ? 'border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20'
                                  : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
                              }`}
                            >
                              {busyUserId === u.id
                                ? '…'
                                : u.isActive
                                  ? 'Desactivar'
                                  : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
