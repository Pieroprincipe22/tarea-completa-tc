'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

function matchesCustomer(customer: Customer, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    customer.name.toLowerCase().includes(q) ||
    (customer.email ?? '').toLowerCase().includes(q) ||
    (customer.phone ?? '').toLowerCase().includes(q)
  );
}

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setErr(null);
        setLoading(true);

        const customers = await apiFetch<Customer[]>('/customers');

        if (!cancelled) {
          setData(Array.isArray(customers) ? customers : []);
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : 'No se pudieron cargar los clientes';

        if (!cancelled) {
          setErr(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => data.filter((customer) => matchesCustomer(customer, q)),
    [data, q],
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-full rounded-xl border px-4 py-3 md:w-96"
        />
      </div>

      {loading && <div className="rounded-2xl border p-6">Cargando…</div>}

      {err && (
        <div className="rounded-2xl border p-6 text-red-600">
          Error: {err}
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-2xl border p-6">
          {q.trim() ? 'No se encontraron clientes.' : 'No hay clientes.'}
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <div key={customer.id} className="rounded-2xl border p-5 shadow-sm">
              <div className="text-lg font-semibold">{customer.name}</div>

              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {customer.email ? <div>Email: {customer.email}</div> : null}
                {customer.phone ? <div>Tel: {customer.phone}</div> : null}
                {customer.notes ? <div>Notas: {customer.notes}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}