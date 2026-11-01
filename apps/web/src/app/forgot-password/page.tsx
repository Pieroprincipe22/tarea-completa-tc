'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AuthLayout,
  FieldIcon,
  FormError,
  MailIcon,
  Spinner,
  inputClass,
  primaryButtonClass,
} from '@/components/auth/AuthLayout';
import { DEFAULT_API_BASE } from '@/lib/tc/session';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const value = email.trim().toLowerCase();
    if (!value || !value.includes('@')) {
      setError('Escribe el email con el que entras en AnPi Tech.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${DEFAULT_API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });

      if (res.status === 429) {
        setError('Has hecho varias solicitudes seguidas. Espera un minuto y vuelve a probar.');
        return;
      }
      if (!res.ok) {
        setError('No se pudo procesar la solicitud. Inténtalo de nuevo en unos minutos.');
        return;
      }

      setSentTo(value);
    } catch {
      setError('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const backToLogin = (
    <Link href="/login" className="font-medium text-accent hover:underline">
      Volver a iniciar sesión
    </Link>
  );

  if (sentTo) {
    return (
      <AuthLayout title="Revisa tu correo" footer={backToLogin}>
        <div className="space-y-3 text-sm text-ink-2">
          <p>
            Si <span className="font-medium text-ink">{sentTo}</span> tiene una
            cuenta en AnPi Tech, te hemos enviado un enlace para elegir una
            contraseña nueva.
          </p>
          <p className="text-muted">
            El enlace caduca en 1 hora. Si no lo ves en unos minutos, mira en la
            carpeta de spam.
          </p>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-medium text-accent hover:underline"
          >
            Probar con otro email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
      subtitle="Te enviaremos un enlace para elegir una nueva."
      footer={backToLogin}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-2">
            Email
          </label>
          <div className="relative">
            <FieldIcon>
              <MailIcon />
            </FieldIcon>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="nombre@empresa.com"
              aria-invalid={Boolean(error)}
              className={inputClass}
              disabled={loading}
            />
          </div>
        </div>

        <FormError message={error} />

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? (
            <>
              <Spinner />
              Enviando…
            </>
          ) : (
            'Enviar enlace'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
