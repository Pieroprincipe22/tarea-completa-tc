'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import {
  Badge,
  Button,
  Card,
  Field,
  Loading,
  Notice,
  PageHeader,
  SelectInput,
  TextInput,
} from '@/components/ui';
import { apiFetch } from '@/lib/api';
import {
  buildLocationTree,
  LOCATION_PARENT_TYPE,
  LOCATION_TYPE_LABEL,
  suggestCode,
  type InventoryLocation,
  type LocationNode,
  type LocationType,
  type Technician,
} from '@/lib/inventory';

type FormState = {
  type: LocationType;
  parentId: string;
  code: string;
  codeTouched: boolean;
  name: string;
  assignedUserId: string;
};

const EMPTY_FORM: FormState = {
  type: 'WAREHOUSE',
  parentId: '',
  code: '',
  codeTouched: false,
  name: '',
  assignedUserId: '',
};

const DEFAULT_NAME: Record<LocationType, (code: string) => string> = {
  WAREHOUSE: (code) => (code === 'A1' ? 'Almacén central' : `Almacén ${code}`),
  RACK: (code) => `Estantería ${code.replace(/^E/, '')}`,
  SHELF: (code) => `Balda ${code.split('-B').at(-1) ?? ''}`.trim(),
  VAN: (code) => `Furgoneta ${code.replace(/^F/, '')}`,
};

export default function LocationsPage() {
  const { session, canEdit } = useInventory();
  const [items, setItems] = useState<InventoryLocation[] | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<InventoryLocation[]>(session, 'GET', '/inventory/locations');

    if (result.ok) {
      setItems(result.data);
    } else {
      setError(result.message);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canEdit) return;

    apiFetch<{ items: Technician[] }>(session, 'GET', '/technicians').then((result) => {
      if (result.ok) setTechnicians(result.data.items ?? []);
    });
  }, [session, canEdit]);

  const tree = useMemo(() => buildLocationTree(items ?? []), [items]);
  const warehouses = tree.filter((node) => node.type === 'WAREHOUSE');
  const vans = tree.filter((node) => node.type === 'VAN');
  const others = tree.filter((node) => node.type !== 'WAREHOUSE' && node.type !== 'VAN');

  const parentType = LOCATION_PARENT_TYPE[form.type];
  const parentOptions = (items ?? []).filter((item) => item.type === parentType);

  // Sugerencia de código y nombre cada vez que cambia el tipo o el padre.
  const suggestedCode = useMemo(() => {
    const all = items ?? [];
    const parent = all.find((item) => item.id === form.parentId) ?? null;
    const siblings = all.filter(
      (item) => item.type === form.type && (item.parentId ?? '') === (parentType ? form.parentId : ''),
    );

    return suggestCode(form.type, parent, siblings.length, new Set(all.map((item) => item.code)));
  }, [items, form.type, form.parentId, parentType]);

  const code = form.codeTouched ? form.code : suggestedCode;

  function openForm(type: LocationType, parentId = '') {
    setForm({ ...EMPTY_FORM, type, parentId });
    setFormOpen(true);
    setNotice(null);
    setError(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    const name = form.name.trim() || DEFAULT_NAME[form.type](code);

    const result = await apiFetch<InventoryLocation>(session, 'POST', '/inventory/locations', {
      type: form.type,
      code,
      name,
      ...(parentType ? { parentId: form.parentId } : {}),
      ...(form.type === 'VAN' && form.assignedUserId ? { assignedUserId: form.assignedUserId } : {}),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(
      `${LOCATION_TYPE_LABEL[form.type]} ${result.data.code} ${form.type === 'WAREHOUSE' ? 'creado' : 'creada'}.`,
    );
    // Se queda abierto con el mismo tipo y padre para dar de alta la siguiente.
    setForm((current) => ({ ...current, code: '', codeTouched: false, name: '', assignedUserId: '' }));
    await load();
  }

  if (!items && !error) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Ubicaciones"
        description="Almacenes, estanterías, baldas y furgonetas."
        actions={
          <>
            <Link
              href="/ubicaciones/etiquetas"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-paper"
            >
              Etiquetas QR
            </Link>
            {canEdit ? <Button onClick={() => openForm('WAREHOUSE')}>Nueva ubicación</Button> : null}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {error && !formOpen ? <Notice tone="error">{error}</Notice> : null}

        {canEdit && formOpen ? (
          <div ref={formRef}>
            <Card>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo">
                  <SelectInput
                    value={form.type}
                    onChange={(event) =>
                      setForm({ ...EMPTY_FORM, type: event.target.value as LocationType })
                    }
                  >
                    {(Object.keys(LOCATION_TYPE_LABEL) as LocationType[]).map((type) => (
                      <option key={type} value={type}>
                        {LOCATION_TYPE_LABEL[type]}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                {parentType ? (
                  <Field label={`Dentro de (${LOCATION_TYPE_LABEL[parentType].toLowerCase()})`}>
                    <SelectInput
                      required
                      value={form.parentId}
                      onChange={(event) =>
                        setForm({ ...form, parentId: event.target.value, codeTouched: false })
                      }
                    >
                      <option value="">Elige…</option>
                      {parentOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code} · {item.path.join(' › ')}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                ) : null}

                <Field label="Código" hint="Es lo que se imprime en la etiqueta.">
                  <TextInput
                    required
                    className="font-code uppercase"
                    value={code}
                    onChange={(event) =>
                      setForm({ ...form, code: event.target.value.toUpperCase(), codeTouched: true })
                    }
                  />
                </Field>

                <Field label="Nombre" hint={`Si lo dejas vacío: ${DEFAULT_NAME[form.type](code)}`}>
                  <TextInput
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </Field>

                {form.type === 'VAN' ? (
                  <Field label="Técnico (opcional)">
                    <SelectInput
                      value={form.assignedUserId}
                      onChange={(event) => setForm({ ...form, assignedUserId: event.target.value })}
                    >
                      <option value="">Sin asignar</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                ) : null}

                <div className="flex flex-col gap-3 md:col-span-2">
                  {error ? <Notice tone="error">{error}</Notice> : null}
                  {notice ? <Notice tone="success">{notice}</Notice> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving || (!!parentType && !form.parentId)}>
                      {saving ? 'Guardando…' : `Crear ${LOCATION_TYPE_LABEL[form.type].toLowerCase()}`}
                    </Button>
                    <Button variant="ghost" onClick={() => setFormOpen(false)}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-ink">Almacenes</h2>
          {warehouses.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">
                Aún no hay almacenes.
                {canEdit ? ' Crea el primero con «Nueva ubicación».' : ''}
              </p>
            </Card>
          ) : (
            warehouses.map((warehouse) => (
              <WarehouseCard
                key={warehouse.id}
                warehouse={warehouse}
                canEdit={canEdit}
                onAdd={openForm}
              />
            ))
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Furgonetas</h2>
            {canEdit ? (
              <Button variant="ghost" onClick={() => openForm('VAN')}>
                + Furgoneta
              </Button>
            ) : null}
          </div>
          {vans.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Aún no hay furgonetas.</p>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {vans.map((van) => (
                <Link key={van.id} href={`/ubicaciones/${van.id}`}>
                  <Card className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{van.name}</p>
                      <p className="text-xs text-muted">{van.assignedUser?.name ?? 'Sin técnico asignado'}</p>
                    </div>
                    <span className="font-code text-sm font-semibold text-ink">{van.code}</span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {others.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-ink">Sin ubicación padre</h2>
            {others.map((node) => (
              <Link key={node.id} href={`/ubicaciones/${node.id}`}>
                <Card className="flex items-center justify-between">
                  <span className="text-sm text-ink">{node.name}</span>
                  <span className="font-code text-sm">{node.code}</span>
                </Card>
              </Link>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function WarehouseCard({
  warehouse,
  canEdit,
  onAdd,
}: {
  warehouse: LocationNode;
  canEdit: boolean;
  onAdd: (type: LocationType, parentId: string) => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/ubicaciones/${warehouse.id}`} className="min-w-0">
          <p className="font-semibold text-ink">{warehouse.name}</p>
          <p className="font-code text-xs text-muted">{warehouse.code}</p>
        </Link>
        {canEdit ? (
          <Button variant="ghost" onClick={() => onAdd('RACK', warehouse.id)}>
            + Estantería
          </Button>
        ) : null}
      </div>

      {warehouse.children.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Sin estanterías.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
          {warehouse.children.map((rack) => (
            <li key={rack.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/ubicaciones/${rack.id}`} className="flex items-center gap-2">
                  <span className="font-code text-sm font-semibold text-ink">{rack.code}</span>
                  <span className="text-sm text-ink">{rack.name}</span>
                </Link>
                {canEdit ? (
                  <Button variant="ghost" onClick={() => onAdd('SHELF', rack.id)}>
                    + Balda
                  </Button>
                ) : null}
              </div>
              {rack.children.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {rack.children.map((shelf) => (
                    <Link
                      key={shelf.id}
                      href={`/ubicaciones/${shelf.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-paper px-3 text-sm"
                    >
                      <span className="font-code font-semibold">{shelf.code}</span>
                      {shelf.partsWithStock > 0 ? (
                        <Badge tone="brand">{shelf.partsWithStock}</Badge>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted">Sin baldas.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
