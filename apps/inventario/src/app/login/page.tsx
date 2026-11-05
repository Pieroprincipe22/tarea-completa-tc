'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Field, Notice, SelectInput, TextInput } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { DEFAULT_API_BASE, writeSession } from '@/lib/session';

type LoginCompany = { companyId: string; name: string; role: string };

type LoginResponse = {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  role: string;
  companies: LoginCompany[];
};

function nextPath(): string {
  if (typeof window === 'undefined') return '/';

  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<LoginResponse | null>(null);
  const [companyId, setCompanyId] = useState('');

  function finish(login: LoginResponse, company: LoginCompany) {
    writeSession({
      apiBase: DEFAULT_API_BASE,
      accessToken: login.accessToken,
      userId: login.userId,
      name: login.name,
      email: login.email,
      companyId: company.companyId,
      companyName: company.name,
      role: company.role,
    });
    router.replace(nextPath());
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await apiFetch<LoginResponse>(null, 'POST', '/auth/login', {
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (!result.ok) {
      setError(
        result.status === 401 ? 'Email o contraseña incorrectos.' : result.message,
      );
      return;
    }

    const companies = result.data.companies ?? [];

    if (companies.length > 1) {
      setPending(result.data);
      setCompanyId(companies[0].companyId);
      return;
    }

    finish(result.data, {
      companyId: result.data.companyId,
      name: result.data.companyName,
      role: result.data.role,
    });
  }

  function onPickCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const company = pending?.companies.find((item) => item.companyId === companyId);
    if (pending && company) finish(pending, company);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Inventorio</h1>
        <p className="mt-1 text-sm text-muted">Entra con tu usuario de AnPi Tech.</p>

        {pending ? (
          <form onSubmit={onPickCompany} className="mt-6 flex flex-col gap-4">
            <Field label="Empresa">
              <SelectInput value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
                {pending.companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Button type="submit">Entrar</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Volver
            </Button>
          </form>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field label="Contraseña">
              <TextInput
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
