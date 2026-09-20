'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
          <h1 className="text-xl font-semibold text-white">
            Algo salió mal
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Ocurrió un error inesperado. Ya quedó registrado — puedes
            intentar de nuevo.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
