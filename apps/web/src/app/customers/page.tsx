'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Customer = {
  id: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const customers = await apiFetch<Customer[]>('/customers');
        setData(customers);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((c) => c.name.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full md:w-80 rounded-xl border px-4 py-3"
        />
      </div>

      {loading && <div className="rounded-2xl border p-6">Cargando…</div>}
      {err && <div className="rounded-2xl border p-6 text-red-600">{err}</div>}

      {!loading && !err && filtered.length === 0 && (
        <div className="rounded-2xl border p-6">No hay clientes.</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-2xl border p-5 shadow-sm">
            <div className="text-lg font-semibold">{c.name}</div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              {c.taxId ? <div>NIF/CIF: {c.taxId}</div> : null}
              {c.email ? <div>Email: {c.email}</div> : null}
              {c.phone ? <div>Tel: {c.phone}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
