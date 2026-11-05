'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import { Loading, Notice } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { InventoryLocationDetail } from '@/lib/inventory';

/** Destino de los QR de las etiquetas: /l/E1-B2 abre esa ubicación. */
export default function LocationByCodePage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? '');
  const router = useRouter();
  const { session } = useInventory();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch<InventoryLocationDetail>(
      session,
      'GET',
      `/inventory/locations/by-code/${encodeURIComponent(code)}`,
    ).then((result) => {
      if (cancelled) return;

      if (result.ok) {
        router.replace(`/ubicaciones/${result.data.id}`);
      } else {
        setError(result.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session, code, router]);

  if (!error) return <Loading label={`Abriendo ${code}…`} />;

  return (
    <div className="flex flex-col gap-3">
      <Notice tone="error">{error}</Notice>
      <Link href="/ubicaciones" className="text-sm font-semibold text-brand">
        Ver todas las ubicaciones
      </Link>
    </div>
  );
}
