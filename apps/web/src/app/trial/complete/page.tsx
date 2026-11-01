'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3002';

type ExchangeResponse = {
  companyId: string;
  userId: string;
};

export default function TrialCompletePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!token) {
        setErr('Falta token.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/public/trial/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) throw new Error(`API ${res.status}`);

        const data = (await res.json()) as ExchangeResponse;

        // sesión mock (consistente con tu MVP actual)
        localStorage.setItem(
          'tc.session',
          JSON.stringify({ companyId: data.companyId, userId: data.userId })
        );

        router.replace('/'); // o /dashboard
      } catch {
        setErr('No se pudo completar el trial. Intenta nuevamente.');
      }
    }

    run();
  }, [token, router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-2xl font-semibold">Activando tu prueba…</h1>
      <p className="mt-2 text-sm text-subtle">
        Estamos creando tu sesión y redirigiéndote a la app.
      </p>

      {err ? (
        <div className="mt-6 rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink">
          {err}
        </div>
      ) : (
        <div className="mt-6 text-sm text-subtle">Procesando…</div>
      )}
    </div>
  );
}
