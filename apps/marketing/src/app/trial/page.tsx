'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/Container';
import { API_BASE, APP_URL } from '@/lib/env';

type TrialPayload = {
  companyName: string;
  name: string;
  email: string;
};

export default function TrialPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveLeadFallback(payload: TrialPayload) {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'trial',
        name: payload.name,
        email: payload.email,
        company: payload.companyName,
        message: 'Lead capturado desde /trial (fallback).',
      }),
    });
    router.push('/trial/thanks?from=trial');
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const payload: TrialPayload = { companyName, name, email };

    try {
      // Trial real (B): si el API está listo, devuelve token
      const res = await fetch(`${API_BASE}/public/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = (await res.json()) as { token: string };
      window.location.href = `${APP_URL}/trial/complete?token=${encodeURIComponent(data.token)}`;
      return;
    } catch {
      // A) Fallback: guardamos lead en marketing
      try {
        await saveLeadFallback(payload);
        return;
      } catch {
        setMessage('No se pudo enviar. Intenta nuevamente.');
        setLoading(false);
      }
    }
  }

  return (
    <Container>
      <div className="py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Prueba 7 días</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Si el API aún no está activo, guardaremos tu solicitud como lead. Si el API está listo,
          crearemos tu empresa de prueba y te enviaremos a la app.
        </p>

        <form onSubmit={onSubmit} className="mt-8 max-w-xl rounded-2xl border border-neutral-200 bg-white p-6">
          <label className="block text-sm font-semibold">Nombre de la empresa</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            required
          />

          <label className="mt-4 block text-sm font-semibold">Tu nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            required
          />

          <label className="mt-4 block text-sm font-semibold">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? 'Procesando…' : 'Crear prueba / Enviar solicitud'}
          </button>

          {message ? (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              {message}
            </div>
          ) : null}
        </form>
      </div>
    </Container>
  );
}
