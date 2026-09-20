import * as Sentry from '@sentry/nextjs';

// NEXT_PUBLIC_* porque este archivo corre en el navegador. Sin DSN,
// Sentry.init() queda en modo no-op (no rompe nada en desarrollo local).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
