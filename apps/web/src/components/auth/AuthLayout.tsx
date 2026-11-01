import type { ReactNode } from 'react';

// Marco común de las pantallas sin sesión: login, recuperar y cambiar contraseña.
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-sm font-medium text-white"
          >
            AP
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold text-ink">AnPi Tech</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
              Gestión de mantenimiento
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}

export function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-subtle"
    >
      {children}
    </span>
  );
}

export const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const EyeIcon = ({ off }: { off?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off ? <path d="M4 4l16 16" /> : null}
  </svg>
);

export const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const inputClass =
  'w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-surface-2 aria-[invalid=true]:border-danger';

export const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60';

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {message}
    </div>
  );
}
