'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  errMsg,
  isRecord,
  tcDelete,
  tcGet,
  tcPatch,
  tcUpload,
} from '@/lib/tc/api';
import {
  isTechnicianRole,
  readTcSession,
  type TcSession,
} from '@/lib/tc/session';

type CompanySettings = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  iban: string | null;
  defaultTaxRate: number;
  workOrderPrefix: string;
  quotePrefix: string;
  invoicePrefix: string | null;
  logoUrl: string | null;
  numbering: Numbering;
};

type DocumentKind = 'workOrder' | 'quote' | 'invoice';

type Numbering = {
  year: number;
  next: Record<DocumentKind, number>;
};

const TEXT_FIELDS = [
  'legalName',
  'taxId',
  'addressLine',
  'postalCode',
  'city',
  'province',
  'country',
  'phone',
  'email',
  'website',
  'iban',
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

const PREFIX_FIELDS = [
  'workOrderPrefix',
  'quotePrefix',
  'invoicePrefix',
] as const;
type PrefixField = (typeof PREFIX_FIELDS)[number];

type FormField = TextField | PrefixField | 'defaultTaxRate';
type FormState = Record<FormField, string>;

// Igual que en la API: letras y números, de 1 a 8, sin espacios.
const PREFIX_PATTERN = /^[A-Z0-9]{1,8}$/;

const PREFIXES: {
  name: PrefixField;
  kind: DocumentKind;
  label: string;
  placeholder: string;
  required: boolean;
}[] = [
  {
    name: 'workOrderPrefix',
    kind: 'workOrder',
    label: 'Órdenes de trabajo',
    placeholder: 'OT',
    required: true,
  },
  {
    name: 'quotePrefix',
    kind: 'quote',
    label: 'Presupuestos',
    placeholder: 'P',
    required: true,
  },
  {
    name: 'invoicePrefix',
    kind: 'invoice',
    label: 'Facturas',
    placeholder: 'FAC',
    required: false,
  },
];

function formatNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

type FieldDef = {
  name: FormField;
  label: string;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'decimal';
  type?: 'text' | 'email' | 'tel' | 'url';
  wide?: boolean;
};

const SECTIONS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: 'Datos fiscales',
    description:
      'Salen en la cabecera de tus informes, presupuestos y facturas.',
    fields: [
      {
        name: 'legalName',
        label: 'Razón social',
        placeholder: 'Clima Norte S.L.',
        autoComplete: 'organization',
        wide: true,
      },
      {
        name: 'taxId',
        label: 'NIF / CIF',
        placeholder: 'B12345674',
        hint: 'Se comprueba que la letra de control sea correcta.',
      },
    ],
  },
  {
    title: 'Dirección',
    description: 'La dirección fiscal de la empresa.',
    fields: [
      {
        name: 'addressLine',
        label: 'Calle y número',
        placeholder: 'Carrer de Sant Pau 12, bajos',
        autoComplete: 'street-address',
        wide: true,
      },
      {
        name: 'postalCode',
        label: 'Código postal',
        placeholder: '08201',
        autoComplete: 'postal-code',
      },
      {
        name: 'city',
        label: 'Ciudad',
        placeholder: 'Sabadell',
        autoComplete: 'address-level2',
      },
      {
        name: 'province',
        label: 'Provincia',
        placeholder: 'Barcelona',
        autoComplete: 'address-level1',
      },
      {
        name: 'country',
        label: 'País',
        placeholder: 'España',
        autoComplete: 'country-name',
      },
    ],
  },
  {
    title: 'Contacto',
    description: 'Cómo pueden contactaros vuestros clientes.',
    fields: [
      {
        name: 'phone',
        label: 'Teléfono',
        placeholder: '+34 600 000 000',
        autoComplete: 'tel',
        inputMode: 'tel',
        type: 'tel',
      },
      {
        name: 'email',
        label: 'Email',
        placeholder: 'oficina@tuempresa.com',
        autoComplete: 'email',
        inputMode: 'email',
        type: 'email',
      },
      {
        name: 'website',
        label: 'Web',
        placeholder: 'www.tuempresa.com',
        autoComplete: 'url',
        inputMode: 'url',
        wide: true,
      },
    ],
  },
  {
    title: 'Facturación',
    description: 'Valores por defecto para presupuestos y facturas.',
    fields: [
      {
        name: 'defaultTaxRate',
        label: 'IVA por defecto (%)',
        placeholder: '21',
        inputMode: 'decimal',
        hint: 'Se puede cambiar en cada presupuesto o factura.',
      },
      {
        name: 'iban',
        label: 'IBAN',
        placeholder: 'ES91 2100 0418 4502 0005 1332',
        hint: 'Aparece en las facturas para que te paguen por transferencia.',
        wide: true,
      },
    ],
  },
];

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function toForm(settings: CompanySettings): FormState {
  const form = {} as FormState;
  for (const field of TEXT_FIELDS) form[field] = settings[field] ?? '';
  for (const field of PREFIX_FIELDS) form[field] = settings[field] ?? '';
  form.defaultTaxRate = String(settings.defaultTaxRate).replace('.', ',');
  return form;
}

function isCompanySettings(value: unknown): value is CompanySettings {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    'defaultTaxRate' in value &&
    isRecord(value.numbering)
  );
}

// La API devuelve "message" como texto o como lista (errores de validación).
function apiMessages(json: unknown, fallback: string): string[] {
  if (isRecord(json)) {
    const message = json.message;
    if (Array.isArray(message)) {
      const list = message.filter((m): m is string => typeof m === 'string');
      if (list.length > 0) return list;
    }
    if (typeof message === 'string' && message.trim()) return [message];
  }
  return [fallback];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'AP'
  );
}

export default function CompanySettingsPage() {
  const [session, setSession] = useState<TcSession | null>(null);
  const [saved, setSaved] = useState<CompanySettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isTechnician = isTechnicianRole(session?.role);

  useEffect(() => {
    const current = readTcSession();
    setSession(current);

    if (!current || isTechnicianRole(current.role)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await tcGet<unknown>(current, '/company-settings');
        if (cancelled) return;
        if (res.code >= 200 && res.code < 300 && isCompanySettings(res.json)) {
          setSaved(res.json);
          setForm(toForm(res.json));
        } else {
          setErrors(
            apiMessages(
              res.json,
              'No se pudieron cargar los datos de la empresa.',
            ),
          );
        }
      } catch (err) {
        if (!cancelled) setErrors([errMsg(err)]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const dirty = useMemo(() => {
    if (!saved || !form) return false;
    const original = toForm(saved);
    return (Object.keys(original) as FormField[]).some(
      (key) => original[key].trim() !== form[key].trim(),
    );
  }, [saved, form]);

  function onChange(name: FormField, value: string) {
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
    setErrors([]);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form || !session) return;

    const payload: Record<string, unknown> = {};
    for (const field of TEXT_FIELDS) payload[field] = form[field];

    const problems: string[] = [];
    for (const def of PREFIXES) {
      const value = form[def.name].trim().toUpperCase();
      if (value === '') {
        // Una vez puesto, un prefijo no se puede quitar (solo cambiar).
        if (def.required || saved?.[def.name]) {
          problems.push(
            `El prefijo de ${def.label.toLowerCase()} no puede quedar vacío.`,
          );
        }
        continue;
      }
      if (!PREFIX_PATTERN.test(value)) {
        problems.push(
          `El prefijo de ${def.label.toLowerCase()} solo puede llevar letras y números, sin espacios (máximo 8).`,
        );
        continue;
      }
      payload[def.name] = value;
    }

    const rawRate = form.defaultTaxRate.trim().replace(',', '.');
    if (rawRate !== '') {
      const rate = Number(rawRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        problems.push('El IVA tiene que ser un número entre 0 y 100.');
      } else {
        payload.defaultTaxRate = Math.round(rate * 100) / 100;
      }
    }

    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      const res = await tcPatch<unknown>(session, '/company-settings', payload);
      if (res.code >= 200 && res.code < 300 && isCompanySettings(res.json)) {
        setSaved(res.json);
        setForm(toForm(res.json));
        setNotice('Cambios guardados.');
      } else {
        setErrors(apiMessages(res.json, 'No se pudieron guardar los cambios.'));
      }
    } catch (err) {
      setErrors([errMsg(err)]);
    } finally {
      setSaving(false);
    }
  }

  function onDiscard() {
    if (saved) setForm(toForm(saved));
    setErrors([]);
  }

  async function onLogoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file || !session) return;

    if (!LOGO_TYPES.includes(file.type)) {
      setErrors(['El logo tiene que ser una imagen PNG, JPG o WEBP.']);
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setErrors([
        'El logo pesa más de 2 MB. Prueba con una imagen más pequeña.',
      ]);
      return;
    }

    setLogoBusy(true);
    setErrors([]);
    try {
      const res = await tcUpload<unknown>(
        session,
        '/company-settings/logo',
        file,
      );
      if (res.code >= 200 && res.code < 300 && isCompanySettings(res.json)) {
        const logoUrl = res.json.logoUrl;
        setSaved((prev) => (prev ? { ...prev, logoUrl } : prev));
        setNotice('Logo actualizado.');
      } else if (res.code === 413) {
        setErrors([
          'El logo pesa más de 2 MB. Prueba con una imagen más pequeña.',
        ]);
      } else {
        setErrors(apiMessages(res.json, 'No se pudo subir el logo.'));
      }
    } catch (err) {
      setErrors([errMsg(err)]);
    } finally {
      setLogoBusy(false);
    }
  }

  async function onRemoveLogo() {
    if (!session || !window.confirm('¿Quitar el logo de la empresa?')) return;

    setLogoBusy(true);
    setErrors([]);
    try {
      const res = await tcDelete<unknown>(session, '/company-settings/logo');
      if (res.code >= 200 && res.code < 300) {
        setSaved((prev) => (prev ? { ...prev, logoUrl: null } : prev));
        setNotice('Logo quitado.');
      } else {
        setErrors(apiMessages(res.json, 'No se pudo quitar el logo.'));
      }
    } catch (err) {
      setErrors([errMsg(err)]);
    } finally {
      setLogoBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="tc-page">
        <p className="text-sm text-muted">Cargando los datos de la empresa…</p>
      </div>
    );
  }

  if (isTechnician) {
    return (
      <div className="tc-page">
        <div className="tc-panel max-w-xl p-6">
          <h1 className="text-lg font-semibold text-ink">
            Datos de la empresa
          </h1>
          <p className="mt-2 text-sm text-muted">
            Solo el administrador de tu empresa puede ver y cambiar estos datos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-page max-w-4xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
          Configuración
        </p>
        <h1 className="tc-title mt-1">Datos de la empresa</h1>
        <p className="tc-subtitle mt-1">
          Aparecen en los informes, presupuestos y facturas que envías a tus
          clientes.
        </p>
      </header>

      {notice ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {notice}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {saved && form ? (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <section className="tc-panel p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                {saved.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={saved.logoUrl}
                    alt={`Logo de ${saved.name}`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="font-mono text-lg font-medium text-subtle">
                    {initials(saved.name)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-ink">
                  {saved.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  PNG, JPG o WEBP de hasta 2 MB. Queda mejor con fondo
                  transparente.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="tc-button"
                    disabled={logoBusy}
                    onClick={() => fileInput.current?.click()}
                  >
                    {logoBusy
                      ? 'Subiendo…'
                      : saved.logoUrl
                        ? 'Cambiar logo'
                        : 'Subir logo'}
                  </button>
                  {saved.logoUrl ? (
                    <button
                      type="button"
                      className="tc-button text-danger"
                      disabled={logoBusy}
                      onClick={onRemoveLogo}
                    >
                      Quitar
                    </button>
                  ) : null}
                  <input
                    ref={fileInput}
                    type="file"
                    accept={LOGO_TYPES.join(',')}
                    className="hidden"
                    onChange={onLogoSelected}
                  />
                </div>
              </div>
            </div>
          </section>

          {SECTIONS.map((section) => (
            <section key={section.title} className="tc-panel p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{section.description}</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => {
                  const id = `field-${field.name}`;
                  const hintId = field.hint ? `${id}-hint` : undefined;
                  return (
                    <div
                      key={field.name}
                      className={field.wide ? 'sm:col-span-2' : undefined}
                    >
                      <label
                        htmlFor={id}
                        className="mb-1.5 block text-sm font-medium text-ink-2"
                      >
                        {field.label}
                      </label>
                      <input
                        id={id}
                        name={field.name}
                        type={field.type ?? 'text'}
                        inputMode={field.inputMode}
                        autoComplete={field.autoComplete ?? 'off'}
                        placeholder={field.placeholder}
                        value={form[field.name]}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        aria-describedby={hintId}
                        disabled={saving}
                        className="tc-input"
                      />
                      {field.hint ? (
                        <p id={hintId} className="mt-1 text-xs text-subtle">
                          {field.hint}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="tc-panel p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">Numeración</h2>
            <p className="mt-1 text-sm text-muted">
              Cada documento lleva su número: prefijo, año y un contador que
              vuelve a empezar en 0001 cada 1 de enero.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {PREFIXES.map((def) => {
                const id = `field-${def.name}`;
                const previewId = `${id}-preview`;
                const prefix = form[def.name].trim().toUpperCase();
                const valid = PREFIX_PATTERN.test(prefix);
                const next = saved.numbering.next[def.kind];
                return (
                  <div key={def.name}>
                    <label
                      htmlFor={id}
                      className="mb-1.5 block text-sm font-medium text-ink-2"
                    >
                      {def.label}
                    </label>
                    <input
                      id={id}
                      name={def.name}
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={8}
                      placeholder={def.placeholder}
                      value={form[def.name]}
                      onChange={(e) =>
                        onChange(
                          def.name,
                          e.target.value.toUpperCase().replace(/\s/g, ''),
                        )
                      }
                      aria-describedby={previewId}
                      disabled={saving}
                      className="tc-input font-mono uppercase"
                    />
                    <p id={previewId} className="mt-1.5 text-xs text-subtle">
                      {valid ? (
                        <>
                          Próximo:{' '}
                          <span className="font-mono text-ink-2">
                            {formatNumber(prefix, saved.numbering.year, next)}
                          </span>
                        </>
                      ) : prefix === '' && !def.required ? (
                        <span className="text-warning">
                          Sin prefijo no se pueden emitir facturas.
                        </span>
                      ) : (
                        'Solo letras y números, sin espacios.'
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-subtle">
              Cambiar un prefijo no cambia los documentos ya creados. Evita
              cambiar el de facturas a mitad de año: las facturas de una misma
              serie tienen que ir seguidas.
            </p>
          </section>

          <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/95 px-1 py-4 backdrop-blur">
            {dirty ? (
              <span className="mr-auto text-sm text-muted">
                Tienes cambios sin guardar.
              </span>
            ) : null}
            <button
              type="button"
              className="tc-button"
              disabled={!dirty || saving}
              onClick={onDiscard}
            >
              Descartar
            </button>
            <button
              type="submit"
              className="tc-button-primary"
              disabled={!dirty || saving}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}