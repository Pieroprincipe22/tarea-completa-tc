'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  AuthLayout,
  EyeIcon,
  FieldIcon,
  FormError,
  LockIcon,
  Spinner,
  inputClass,
  primaryButtonClass,
} from '@/components/auth/AuthLayout';
import { DEFAULT_API_BASE, clearTcSession } from '@/lib/tc/session';

const MIN_LENGTH = 8;

function ResetPasswordView() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const requestNew = (
    <Link href="/forgot-password" className="font-medium text-accent hover:underline">
      Pedir un enlace nuevo
    </Link>
  );

  if (!token) {
    return (
      <AuthLayout title="Enlace incompleto" footer={requestNew}>
        <p className="text-sm text-ink-2">
          Este enlace no tiene el código necesario. Ábrelo directamente desde el
          email o pide uno nuevo.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Contraseña cambiada">
        <p className="mb-5 text-sm text-ink-2">
          Ya puedes entrar en AnPi Tech con tu contraseña nueva.
        </p>
        <Link href="/login" className={primaryButtonClass}>
          Iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${DEFAULT_API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        clearTcSession();
        setDone(true);
        return;
      }

      if (res.status === 429) {
        setError('Demasiados intentos seguidos. Espera un minuto y vuelve a probar.');
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { message?: string | string[] }
        | null;
      const message = Array.isArray(body?.message)
        ? body?.message[0]
        : body?.message;
      setError(message || 'No se pudo cambiar la contraseña. Pide un enlace nuevo.');
    } catch {
      setError('No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Elige una contraseña nueva"
      subtitle={`Usa al menos ${MIN_LENGTH} caracteres. Mejor una frase que una palabra.`}
      footer={requestNew}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-2">
            Contraseña nueva
          </label>
          <div className="relative">
            <FieldIcon>
              <LockIcon />
            </FieldIcon>
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className={`${inputClass} pr-11`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={show}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-subtle transition hover:text-ink"
            >
              <EyeIcon off={show} />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink-2">
            Repite la contraseña
          </label>
          <div className="relative">
            <FieldIcon>
              <LockIcon />
            </FieldIcon>
            <input
              id="confirm"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(confirm) && confirm !== password}
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
              Guardando…
            </>
          ) : (
            'Guardar contraseña'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}
