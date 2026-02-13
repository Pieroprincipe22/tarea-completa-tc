"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { readTcSession, writeTcSession, type TcSession } from "@/lib/tc/session";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const mounted = useMounted();

  const session = useMemo(() => {
    if (!mounted) return null;
    return readTcSession();
  }, [mounted]);

  const [companyId, setCompanyId] = useState("co_demo");
  const [userId, setUserId] = useState("u_demo");

  if (!mounted) return null;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-4 space-y-3">
          <div>
            <div className="text-lg font-semibold">Login (mock)</div>
            <div className="text-sm opacity-70">Guarda companyId/userId en localStorage.</div>
          </div>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">Company ID</div>
            <input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-xl border p-2"
              placeholder="co_..."
            />
          </label>

          <label className="block text-sm">
            <div className="mb-1 opacity-70">User ID</div>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border p-2"
              placeholder="u_..."
            />
          </label>

          <button
            className="w-full rounded-xl bg-black text-white p-2"
            onClick={() => {
              writeTcSession({ companyId, userId, name: "Demo" } as TcSession);
              location.reload();
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
