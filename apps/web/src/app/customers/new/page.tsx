'use client';

import Link from 'next/link';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChevronLeftIcon } from '@/components/templates/TemplateIcons';
import { errMsg, isRecord, tcPost } from '@/lib/tc/api';
import { apiError } from '@/lib/tc/building';
import { isAdminRole, readTcSession, type TcSession } from '@/lib/tc/session';

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  withSite: boolean;
  siteName: string;
  siteAddress: string;
  siteCity: string;
};

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  withSite: true,
  siteName: '',
  siteAddress: '',
  siteCity: '',
};

type Created = {
  id: string;
  name: string;
  site: { id: string; name: string } | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

// Lo que el servidor rechazaría igualmente, dicho antes y en claro.
function validate(form: FormState): string | null {
  if (form.name.trim().length < 2) {
    return 'Pon el nombre del cliente (al menos 2 letras).';
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    return 'El email no es válido.';
  }
  if (form.withSite && !form.siteName.trim()) {
    return 'Pon el nombre del hotel o edificio, o quita la casilla si lo darás de alta más tarde.';
  }
  return null;
}

function parseCreated(json: unknown): Created | null {
  if (!isRecord(json) || typeof json.id !== 'string') return null;
  const site =
    isRecord(json.site) && typeof json.site.id === 'string'
      ? { id: json.site.id, name: String(json.site.name ?? '') }
      : null;
  return { id: json.id, name: String(json.name ?? ''), site };
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Done({
  created,
  onAnother,
}: {
  created: Created;
  onAnother: () => void;
}) {
  const site = created.site;

  return (
    <div className="tc-page max-w-3xl">
      <div className="tc-panel p-6 sm:p-8">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-lg font-semibold text-success"
        >
          ✓
        </span>
        <h1 className="tc-title mt-4">{created.name} ya está dado de alta</h1>

        {site ? (
          <>
            <p className="tc-subtitle mt-2 max-w-xl">
              Con su hotel{' '}
              <strong className="font-semibold text-ink">{site.name}</strong>.
              El siguiente paso es preparar su mantenimiento: plantas,
              habitaciones, máquinas y cada cuánto se revisan.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/maintenance/new?siteId=${encodeURIComponent(site.id)}`}
                className="tc-button-primary"
              >
                Preparar el mantenimiento
              </Link>
              <Link href={`/customers/${created.id}`} className="tc-button">
                Ver el cliente
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="tc-subtitle mt-2 max-w-xl">
              Cuando te pida mantenimiento, dale de alta su hotel o edificio
              desde la ficha del cliente.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/customers/${created.id}`}
                className="tc-button-primary"
              >
                Ver el cliente
              </Link>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onAnother}
          className="mt-6 text-sm font-medium text-accent hover:underline"
        >
          Dar de alta otro cliente
        </button>
      </div>
    </div>
  );
}

export default function NewCustomerPage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSession(readTcSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (error)
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Quien trabaja para un solo hotel suele llamarlos igual.
  function copyFromCustomer() {
    setForm((current) => ({
      ...current,
      siteName: current.siteName.trim() ? current.siteName : current.name,
      siteAddress: current.siteAddress.trim()
        ? current.siteAddress
        : current.address,
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || saving) return;

    const invalid = validate(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await tcPost<unknown>(session, '/customers', {
        name: form.name.trim(),
        email: optional(form.email),
        phone: optional(form.phone),
        address: optional(form.address),
        notes: optional(form.notes),
        site: form.withSite
          ? {
              name: form.siteName.trim(),
              address: optional(form.siteAddress),
              city: optional(form.siteCity),
            }
          : undefined,
      });
      const done =
        res.code >= 200 && res.code < 300 ? parseCreated(res.json) : null;
      if (!done) {
        setError(apiError(res.json, 'No se pudo dar de alta el cliente.'));
        return;
      }
      setCreated(done);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(`No se pudo dar de alta el cliente: ${errMsg(err)}`);
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-muted">Tu sesión ha caducado.</p>
          <Link href="/login" className="tc-button-primary mt-4">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdminRole(session.role)) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <p className="text-sm text-muted">
            Dar de alta clientes lo hace la oficina. Pídeselo a tu encargado.
          </p>
          <Link href="/customers" className="tc-button mt-4">
            Volver a clientes
          </Link>
        </div>
      </div>
    );
  }

  if (created) {
    return (
      <Done
        created={created}
        onAnother={() => {
          setCreated(null);
          setForm(EMPTY);
          setError(null);
        }}
      />
    );
  }

  const canCopy =
    form.name.trim() !== '' &&
    (form.siteName.trim() === '' ||
      (form.siteAddress.trim() === '' && form.address.trim() !== ''));

  return (
    <div className="tc-page max-w-3xl">
      <header className="mb-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Clientes
        </Link>
        <h1 className="tc-title mt-2">Nuevo cliente</h1>
        <p className="tc-subtitle mt-1 max-w-2xl">
          Da de alta el cliente y su hotel o edificio a la vez. Después podrás
          preparar su mantenimiento en un momento.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <section className="tc-panel p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">El cliente</h2>
          <p className="mt-0.5 text-sm text-muted">
            Quién te contrata y a quién facturas.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre *" className="sm:col-span-2">
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Hotel Four Point, Comunidad Diagonal 120…"
                maxLength={120}
                autoFocus
                className="tc-input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="mantenimiento@hotel.com"
                maxLength={160}
                className="tc-input"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+34 600 000 000"
                maxLength={30}
                className="tc-input"
              />
            </Field>
            <Field label="Dirección" className="sm:col-span-2">
              <input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Dirección fiscal o de la oficina"
                maxLength={250}
                className="tc-input"
              />
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Persona de contacto, horarios, condiciones…"
                rows={3}
                maxLength={500}
                className="tc-input"
              />
            </Field>
          </div>
        </section>

        <section className="tc-panel p-5 sm:p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.withSite}
              onChange={(e) => set('withSite', e.target.checked)}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span>
              <span className="block text-base font-semibold text-ink">
                Su hotel o edificio
              </span>
              <span className="block text-sm text-muted">
                Donde están las máquinas que vas a mantener.
              </span>
            </span>
          </label>

          {form.withSite ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre del hotel o edificio *"
                className="sm:col-span-2"
              >
                <input
                  value={form.siteName}
                  onChange={(e) => set('siteName', e.target.value)}
                  placeholder="Four Points by Sheraton Barcelona"
                  maxLength={160}
                  className="tc-input"
                />
              </Field>
              <Field label="Dirección">
                <input
                  value={form.siteAddress}
                  onChange={(e) => set('siteAddress', e.target.value)}
                  placeholder="Calle y número"
                  maxLength={250}
                  className="tc-input"
                />
              </Field>
              <Field label="Población">
                <input
                  value={form.siteCity}
                  onChange={(e) => set('siteCity', e.target.value)}
                  placeholder="Barcelona"
                  maxLength={120}
                  className="tc-input"
                />
              </Field>
              {canCopy ? (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={copyFromCustomer}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Usar el nombre y la dirección del cliente
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Lo podrás añadir más tarde desde la ficha del cliente.
            </p>
          )}
        </section>

        {error ? (
          <div
            ref={errorRef}
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/customers" className="tc-button">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="tc-button-primary">
            {saving
              ? 'Guardando…'
              : form.withSite
                ? 'Dar de alta cliente y hotel'
                : 'Dar de alta el cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}