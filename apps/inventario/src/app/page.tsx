'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import { Badge, Card } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { InventoryCategory, InventoryLocation } from '@/lib/inventory';

type Counts = { locations: number; shelves: number; vans: number; categories: number };

export default function HomePage() {
  const { session, canEdit } = useInventory();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiFetch<InventoryLocation[]>(session, 'GET', '/inventory/locations'),
      apiFetch<InventoryCategory[]>(session, 'GET', '/inventory/categories'),
    ]).then(([locations, categories]) => {
      if (cancelled) return;

      const items = locations.ok ? locations.data : [];

      setCounts({
        locations: items.length,
        shelves: items.filter((item) => item.type === 'SHELF').length,
        vans: items.filter((item) => item.type === 'VAN').length,
        categories: categories.ok ? categories.data.length : 0,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const steps = [
    {
      done: (counts?.categories ?? 0) > 0,
      title: 'Crear las categorías',
      helper: 'Empieza con las 8 iniciales y ajústalas a tu almacén.',
      href: '/categorias',
    },
    {
      done: (counts?.shelves ?? 0) > 0,
      title: 'Dar de alta el almacén, sus estanterías y baldas',
      helper: 'Cada balda lleva un código corto, como E1-B2.',
      href: '/ubicaciones',
    },
    {
      done: false,
      title: 'Imprimir y pegar las etiquetas QR',
      helper: 'Una por balda y por furgoneta.',
      href: '/ubicaciones/etiquetas',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Hola, {session.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted">Así está el almacén ahora mismo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/ubicaciones">
          <Card className="h-full">
            <p className="text-xs text-muted">Ubicaciones</p>
            <p className="font-code mt-1 text-3xl font-semibold text-ink">{counts?.locations ?? '–'}</p>
          </Card>
        </Link>
        <Link href="/ubicaciones">
          <Card className="h-full">
            <p className="text-xs text-muted">Baldas</p>
            <p className="font-code mt-1 text-3xl font-semibold text-ink">{counts?.shelves ?? '–'}</p>
          </Card>
        </Link>
        <Link href="/ubicaciones">
          <Card className="h-full">
            <p className="text-xs text-muted">Furgonetas</p>
            <p className="font-code mt-1 text-3xl font-semibold text-ink">{counts?.vans ?? '–'}</p>
          </Card>
        </Link>
        <Link href="/categorias">
          <Card className="h-full">
            <p className="text-xs text-muted">Categorías</p>
            <p className="font-code mt-1 text-3xl font-semibold text-ink">{counts?.categories ?? '–'}</p>
          </Card>
        </Link>
      </div>

      {canEdit ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-ink">Primeros pasos</h2>
          {steps.map((step, index) => (
            <Link key={step.title} href={step.href}>
              <Card className="flex items-center gap-3">
                <span
                  className={
                    step.done
                      ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-bold text-muted'
                  }
                  aria-label={step.done ? 'Hecho' : `Paso ${index + 1}`}
                >
                  {step.done ? '✓' : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{step.title}</span>
                  <span className="block text-xs text-muted">{step.helper}</span>
                </span>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}

      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Buscar piezas</p>
          <p className="text-xs text-muted">Catálogo, fotos, buscador y escáner llegan en el siguiente paso.</p>
        </div>
        <Badge tone="muted">Próximo</Badge>
      </Card>
    </div>
  );
}
