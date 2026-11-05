'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import { Badge, Button, Card, Loading, Notice, PageHeader, TextInput } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { InventoryCategory } from '@/lib/inventory';

export default function CategoriesPage() {
  const { session, canEdit } = useInventory();
  const [items, setItems] = useState<InventoryCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<InventoryCategory[]>(
      session,
      'GET',
      `/inventory/categories${canEdit ? '?includeInactive=true' : ''}`,
    );

    if (result.ok) {
      setItems(result.data);
    } else {
      setError(result.message);
    }
  }, [session, canEdit]);

  useEffect(() => {
    load();
  }, [load]);

  const active = items?.filter((item) => item.isActive) ?? [];
  const archived = items?.filter((item) => !item.isActive) ?? [];

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, success?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const result = await action();

    if (!result.ok) {
      setError(result.message ?? 'No se pudo guardar.');
    } else if (success) {
      setNotice(success);
    }

    await load();
    setBusy(false);
  }

  function update(id: string, body: Record<string, unknown>) {
    return apiFetch(session, 'PATCH', `/inventory/categories/${id}`, body).then((result) =>
      result.ok ? { ok: true } : { ok: false, message: result.message },
    );
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    await run(
      () =>
        apiFetch(session, 'POST', '/inventory/categories', { name }).then((result) =>
          result.ok ? { ok: true } : { ok: false, message: result.message },
        ),
      `Categoría "${name}" creada.`,
    );
    setNewName('');
  }

  async function onDefaults() {
    await run(
      () =>
        apiFetch<{ created: number }>(session, 'POST', '/inventory/categories/defaults').then(
          (result) =>
            result.ok
              ? { ok: true }
              : { ok: false, message: result.message },
        ),
      'Categorías iniciales añadidas.',
    );
  }

  async function onRename(id: string) {
    const name = editingName.trim();
    if (!name) return;

    await run(() => update(id, { name }));
    setEditingId(null);
  }

  async function onMove(index: number, direction: -1 | 1) {
    const current = active[index];
    const other = active[index + direction];
    if (!current || !other) return;

    // Intercambia el orden de las dos categorías.
    await run(async () => {
      const first = await update(current.id, { sortOrder: other.sortOrder });
      if (!first.ok) return first;
      return update(other.id, { sortOrder: current.sortOrder });
    });
  }

  if (!items && !error) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Cómo se agrupan las piezas del almacén."
        actions={
          canEdit ? (
            <Button variant="secondary" onClick={onDefaults} disabled={busy}>
              Añadir categorías iniciales
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice ? <Notice tone="success">{notice}</Notice> : null}

        {canEdit ? (
          <form onSubmit={onCreate} className="flex gap-2">
            <label htmlFor="new-category" className="sr-only">
              Nueva categoría
            </label>
            <TextInput
              id="new-category"
              placeholder="Nueva categoría, p. ej. Gases"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button type="submit" disabled={busy || !newName.trim()}>
              Añadir
            </Button>
          </form>
        ) : null}

        {active.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Aún no hay categorías.
              {canEdit ? ' Pulsa «Añadir categorías iniciales» para empezar con las 8 del trastero.' : ''}
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((item, index) => (
              <li key={item.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {editingId === item.id ? (
                    <form
                      className="flex flex-1 flex-wrap gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onRename(item.id);
                      }}
                    >
                      <label htmlFor={`rename-${item.id}`} className="sr-only">
                        Nombre de la categoría
                      </label>
                      <TextInput
                        id={`rename-${item.id}`}
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <Button type="submit" disabled={busy}>
                        Guardar
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-muted">
                          {item.partsCount === 1 ? '1 pieza' : `${item.partsCount} piezas`}
                        </p>
                      </div>
                      {canEdit ? (
                        <div className="flex flex-wrap gap-1 sm:shrink-0">
                          <Button
                            variant="secondary"
                            aria-label={`Subir ${item.name}`}
                            disabled={busy || index === 0}
                            onClick={() => onMove(index, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="secondary"
                            aria-label={`Bajar ${item.name}`}
                            disabled={busy || index === active.length - 1}
                            onClick={() => onMove(index, 1)}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingName(item.name);
                            }}
                          >
                            Renombrar
                          </Button>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => run(() => update(item.id, { isActive: false }), `"${item.name}" archivada.`)}
                          >
                            Archivar
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}

        {canEdit && archived.length > 0 ? (
          <section className="mt-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted">Archivadas</h2>
            {archived.map((item) => (
              <Card key={item.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted">
                  {item.name} <Badge tone="muted">Archivada</Badge>
                </span>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => run(() => update(item.id, { isActive: true }), `"${item.name}" recuperada.`)}
                >
                  Recuperar
                </Button>
              </Card>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
