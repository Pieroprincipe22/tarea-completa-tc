"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearTcSession, readTcSession } from "@/lib/tc/session";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export default function TopBar() {
  const mounted = useMounted();

  const session = useMemo(() => {
    if (!mounted) return null;
    return readTcSession();
  }, [mounted]);

  return (
    <div className="sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-semibold">
            {session?.name ?? "Demo"} — {session?.companyId ?? "no-company"}
          </div>

          <nav className="flex gap-3 text-sm">
            <Link className="hover:underline" href="/">
              Dashboard
            </Link>
            <Link className="hover:underline" href="/maintenance-reports">
              Maintenance Reports
            </Link>
          </nav>
        </div>

        <button
          className="text-sm rounded-xl border px-3 py-1 hover:bg-black/5"
          onClick={() => {
            clearTcSession();
            location.reload();
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
