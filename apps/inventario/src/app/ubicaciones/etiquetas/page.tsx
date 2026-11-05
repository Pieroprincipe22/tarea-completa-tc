'use client';

import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import { Button, Card, Loading, Notice, PageHeader, cx } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import {
  LOCATION_TYPE_LABEL,
  locationQrUrl,
  type InventoryLocation,
  type LocationType,
} from '@/lib/inventory';

const TYPE_ORDER: LocationType[] = ['SHELF', 'RACK', 'VAN', 'WAREHOUSE'];

export default function LabelsPage() {
  const { session } = useInventory();
  const [items, setItems] = useState<InventoryLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qr, setQr] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    apiFetch<InventoryLocation[]>(session, 'GET', '/inventory/locations').then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setItems(result.data);

      // Desde la ficha de una ubicación se llega con #id: solo esa.
      const fromHash = window.location.hash.slice(1);
      const initial = result.data.some((item) => item.id === fromHash)
        ? [fromHash]
        : result.data
            .filter((item) => item.type === 'SHELF' || item.type === 'VAN')
            .map((item) => item.id);

      setSelected(new Set(initial));
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const labels = useMemo(
    () =>
      (items ?? [])
        .filter((item) => selected.has(item.id))
        .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true })),
    [items, selected],
  );

  useEffect(() => {
    let cancelled = false;
    const origin = window.location.origin;

    Promise.all(
      labels.map(async (item) => {
        const url = await QRCode.toDataURL(locationQrUrl(origin, item.code), {
          margin: 1,
          width: 240,
          errorCorrectionLevel: 'M',
        });
        return [item.id, url] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setQr(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [labels]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!items && !error) return <Loading />;

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: (items ?? [])
      .filter((item) => item.type === type)
      .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true })),
  })).filter((group) => group.items.length > 0);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Etiquetas QR"
          description="Imprime y pega una en cada balda y furgoneta. Al escanearla con el móvil se abre esa ubicación."
          actions={
            <Button onClick={() => window.print()} disabled={labels.length === 0}>
              Imprimir {labels.length > 0 ? `(${labels.length})` : ''}
            </Button>
          }
        />

        {error ? <Notice tone="error">{error}</Notice> : null}

        {grouped.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Aún no hay ubicaciones. Créalas primero en Ubicaciones.</p>
          </Card>
        ) : (
          <Card className="mb-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSelected(new Set((items ?? []).map((item) => item.id)))}>
                Todas
              </Button>
              <Button variant="secondary" onClick={() => setSelected(new Set())}>
                Ninguna
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {grouped.map((group) => (
                <fieldset key={group.type}>
                  <legend className="mb-2 text-sm font-semibold text-ink">
                    {LOCATION_TYPE_LABEL[group.type]}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <label
                        key={item.id}
                        className={cx(
                          'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm',
                          selected.has(item.id) ? 'border-brand bg-brand-soft' : 'border-line bg-white',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand"
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                        />
                        <span className="font-code font-semibold">{item.code}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
        {labels.map((item) => (
          <div
            key={item.id}
            className="flex break-inside-avoid items-center gap-3 rounded-xl border border-ink/30 bg-white p-3"
          >
            {qr[item.id] ? (
              // Data URL generada en el navegador: next/image no aporta nada aquí.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr[item.id]} alt={`QR de ${item.code}`} className="h-20 w-20 shrink-0" />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded bg-paper" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-code text-xl font-bold leading-tight text-ink">{item.code}</p>
              <p className="truncate text-sm text-ink">{item.name}</p>
              {item.parent ? <p className="truncate text-xs text-muted">{item.parent.name}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
