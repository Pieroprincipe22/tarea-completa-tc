"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { errMsg, isRecord, resolveCorePaths, tcGet } from "@/lib/tc/api";

type MaintenanceReport = {
  id: string;
  performedAt?: string;
  state?: string;
  templateName?: string;
};

type LoadState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

function formatDate(input?: string) {
  if (!input) return "—";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString();
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "muted";
}) {
  const cls =
    tone === "ok"
      ? "bg-green-600/10 text-green-700 ring-green-600/20"
      : tone === "warn"
      ? "bg-yellow-600/10 text-yellow-700 ring-yellow-600/20"
      : tone === "bad"
      ? "bg-red-600/10 text-red-700 ring-red-600/20"
      : "bg-slate-600/10 text-slate-700 ring-slate-600/20";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}>
      {children}
    </span>
  );
}

function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray((data as any).items)) return (data as any).items as T[];
  return [];
}

export default function MaintenanceReportsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<LoadState<MaintenanceReport[]>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        const paths = resolveCorePaths();
        const data = await tcGet<unknown>(paths.reports);

        if (cancelled) return;

        const items = extractItems<MaintenanceReport>(data);

        items.sort((a, b) => {
          const da = a.performedAt ? new Date(a.performedAt).getTime() : 0;
          const db = b.performedAt ? new Date(b.performedAt).getTime() : 0;
          return db - da;
        });

        setState({ status: "ok", data: items });
      } catch (e: unknown) {
        if (!cancelled) setState({ status: "error", error: errMsg(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance Reports</h1>
          <p className="mt-1 text-sm text-black/60">Listado read-only.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
            onClick={() => setReloadKey((x) => x + 1)}
          >
            Refresh
          </button>
          <Link href="/" className="text-sm text-black/70 hover:text-black">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        {state.status === "loading" ? (
          <div className="text-sm text-black/60">Cargando…</div>
        ) : state.status === "error" ? (
          <div className="text-sm text-red-700">{state.error}</div>
        ) : state.data.length === 0 ? (
          <div className="text-sm text-black/60">No hay reports todavía.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-black/70">
                <tr className="border-b">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>

              <tbody>
                {state.data.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{formatDate(r.performedAt)}</td>
                    <td className="py-2 pr-3">{r.templateName || "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={r.state === "FINAL" ? "ok" : r.state === "DRAFT" ? "warn" : "muted"}>
                        {r.state || "—"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Link className="text-black/70 hover:text-black" href={`/maintenance-reports/${r.id}`}>
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
