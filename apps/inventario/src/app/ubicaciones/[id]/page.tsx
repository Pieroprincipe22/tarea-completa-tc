'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import {
  Badge,
  Button,
  Card,
  Field,
  Loading,
  Notice,
  SelectInput,
  TextInput,
} from '@/components/ui';
import { apiFetch } from '@/lib/api';
import {
  LOCATION_TYPE_LABEL,
  type InventoryLocationDetail,
  type Technician,
} from '@/lib/inventory';

type EditState = { code: string; name: string; notes: string; assignedUserId: string };

export default function LocationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { session, canEdit } = useInventory();
  const [location, setLocation] = useState<InventoryLocationDetail | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<InventoryLocationDetail>(session, 'GET', `/inventory/locations/${id}`);

    if (result.ok) {
      setLocation(result.data);
    } else {
      setError(result.message);
    }
  }, [session, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canEdit || location?.type !== 'VAN') return;

    apiFetch<{ items: Technician[] }>(session, 'GET', '/technicians').then((result) => {
      if (result.ok) setTechnicians(result.data.items ?? []);
    });
  }, [session, canEdit, location?.type]);

  async function patch(body: Record<string, unknown>, success: string) {
    setSaving(true);
    setError(null);
    setNotice(null);

    const result = await apiFetch<InventoryLocationDetail>(
      session,
      'PATCH',
      `/inventory/locations/${id}`,
      body,
    );

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    setLocation(result.data);
    setNotice(success);
    return true;
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit || !location) return;

    const ok = await patch(
      {
        code: edit.code,
        name: edit.name,
        notes: edit.notes.trim() ? edit.notes : null,
        ...(location.type === 'VAN' ? { assignedUserId: edit.assignedUserId || null } : {}),
      },
      'Cambios guardados.',
    );

    if (ok) setEdit(null);
  }

  async function onArchive() {
    if (!location) return;

    const ok = await patch({ isActive: false }, 'Ubicación archivada.');
    if (ok) router.push('/ubicaciones');
  }

  if (!location && !error) return <Loading />;

  if (!location) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone="error">{error}</Notice>
        <Link href="/ubicaciones" className="text-sm font-semibold text-brand">
          ← Volver a ubicaciones
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/ubicaciones" className="text-sm font-semibold text-brand">
        ← Ubicaciones
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge tone="brand">{LOCATION_TYPE_LABEL[location.type]}</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{location.name}</h1>
            <p className="mt-1 text-sm text-muted">{location.path.join(' › ')}</p>
          </div>
          <span className="font-code rounded-xl border border-line bg-paper px-3 py-2 text-xl font-semibold text-ink">
            {location.code}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Piezas con stock</dt>
            <dd className="font-code text-lg font-semibold text-ink">{location.partsWithStock}</dd>
          </div>
          {location.type === 'VAN' ? (
            <div>
              <dt className="text-muted">Técnico</dt>
              <dd className="font-semibold text-ink">{location.assignedUser?.name ?? 'Sin asignar'}</dd>
            </div>
          ) : (
            <div>
              <dt className="text-muted">Dentro tiene</dt>
              <dd className="font-code text-lg font-semibold text-ink">{location.childrenCount}</dd>
            </div>
          )}
        </dl>

        {location.notes ? <p className="mt-3 text-sm text-ink">{location.notes}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/ubicaciones/etiquetas#${location.id}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-paper"
          >
            Imprimir etiqueta
          </Link>
          {canEdit && !edit ? (
            <Button
              variant="secondary"
              onClick={() =>
                setEdit({
                  code: location.code,
                  name: location.name,
                  notes: location.notes ?? '',
                  assignedUserId: location.assignedUser?.id ?? '',
                })
              }
            >
              Editar
            </Button>
          ) : null}
        </div>
      </Card>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      {edit ? (
        <Card>
          <form onSubmit={onSave} className="grid gap-4 md:grid-cols-2">
            <Field label="Código">
              <TextInput
                required
                className="font-code uppercase"
                value={edit.code}
                onChange={(event) => setEdit({ ...edit, code: event.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Nombre">
              <TextInput
                required
                value={edit.name}
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
              />
            </Field>
            {location.type === 'VAN' ? (
              <Field label="Técnico">
                <SelectInput
                  value={edit.assignedUserId}
                  onChange={(event) => setEdit({ ...edit, assignedUserId: event.target.value })}
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
            <Field label="Notas">
              <TextInput value={edit.notes} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                Cancelar
              </Button>
              <Button variant="danger" className="ml-auto" disabled={saving} onClick={onArchive}>
                Archivar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {location.children.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-ink">Dentro</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {location.children.map((child) => (
              <Link key={child.id} href={`/ubicaciones/${child.id}`}>
                <Card className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink">{child.name}</span>
                  <span className="font-code text-sm font-semibold text-ink">{child.code}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
