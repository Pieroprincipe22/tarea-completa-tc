import * as Sentry from '@sentry/nextjs';

// Sin SENTRY_DSN, Sentry.init() queda en modo no-op.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
