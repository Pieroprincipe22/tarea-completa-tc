import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Seguro de llamar aunque no haya SENTRY_DSN configurado: el SDK queda
// en modo no-op y esto simplemente no hace nada.
export const onRequestError = Sentry.captureRequestError;
