'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/Container';

export const dynamic = 'force-dynamic';

export default function ContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      source: 'contact' as const,
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      company: String(form.get('company') ?? ''),
      message: String(form.get('message') ?? ''),
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push('/trial/thanks?from=contact');
    } catch {
      setErr('No se pudo enviar. Intenta nuevamente.');
      setLoading(false);
    }
  }

  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Contacto</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Cuéntanos tu caso y te respondemos con una propuesta o demo guiada.
        </p>

        <form onSubmit={onSubmit} className="mt-8 max-w-xl rounded-2xl border border-neutral-200 bg-white p-6">
          <label className="block text-sm font-semibold">Nombre</label>
          <input
            name="name"
            required
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
          />

          <label className="mt-4 block text-sm font-semibold">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
          />

          <label className="mt-4 block text-sm font-semibold">Empresa (opcional)</label>
          <input
            name="company"
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
          />

          <label className="mt-4 block text-sm font-semibold">Mensaje</label>
          <textarea
            name="message"
            rows={5}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            placeholder="Ej: cantidad de técnicos, tipo de activos, necesidad de evidencias..."
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Enviar'}
          </button>

          {err ? (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              {err}
            </div>
          ) : null}
        </form>
      </div>
    </Container>
  );
}
