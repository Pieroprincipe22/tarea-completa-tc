import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearTcSession, readTcSession, writeTcSession, type TcSession } from '@/lib/session';

type AuthContextValue = {
  session: TcSession | null;
  loading: boolean;
  login: (session: TcSession) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TcSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void readTcSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async login(next: TcSession) {
        await writeTcSession(next);
        setSession(next);
      },
      async logout() {
        await clearTcSession();
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
