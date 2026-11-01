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
      <body className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-ink">
            Algo salió mal
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Ocurrió un error inesperado. Ya quedó registrado — puedes
            intentar de nuevo.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
