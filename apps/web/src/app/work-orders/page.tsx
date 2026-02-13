"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { errMsg, isRecord, resolveCorePaths, tcGet } from "@/lib/tc/api";
import { readTcSession } from "@/lib/tc/session";

type WorkOrder = {
  id: string;
  number?: number;
  status?: string;
  priority?: string;
  title?: string;
  description?: string | null;
  createdAt?: string;
  dueAt?: string | null;
  customerId?: string | null;
  siteId?: string | null;
  assetId?: string | null;
};

type LoadState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

function extractItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray((data as any).items)) return (data as any).items as T[];
  return [];
}

function formatDate(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? String(input) : d.toLocaleString();
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ring-black/10 bg-black/5">
      {children}
    </span>
  );
}

const STATUSES = ["DRAFT", "OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

export default function WorkOrdersPage() {
  // si AuthGate está bien, esto no debería ser null, pero lo dejamos robusto
  const session = useMemo(() => readTcSession(), []);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<string>(""); // filtro simple
  const [state, setState] = useState<LoadState<WorkOrder[]>>({ status: "loading" });

  useEffect(() => {
    if (!session) {
      setState({ status: "error", error: "Sin sesión tenant (companyId/userId). Usa el login mock." });
      return;
    }

    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        const paths = resolveCorePaths();

        // si tu API soporta query params (ej: /work-orders?status=OPEN) lo usamos;
        // si no, igual funciona sin filtro y filtramos en client.
        const url = status ? `${paths.workOrders}?status=${encodeURIComponent(status)}` : paths.workOrders;

        const data = await tcGet<unknown>(url);
        if (cancelled) return;

        let items = extractItems<WorkOrder>(data);

        // fallback: si backend aún no filtra por status
        if (status) items = items.filter((x) => x.status === status);

        // orden por number desc (si existe), sino createdAt desc
        items.sort((a, b) => {
          const na = typeof a.number === "number" ? a.number : -1;
          const nb = typeof b.number === "number" ? b.number : -1;
          if (na !== -1 || nb !== -1) return nb - na;

          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
  }, [session, reloadKey, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Work Orders</h1>
          <p className="mt-1 text-sm text-black/60">Listado read-only (Paso 32).</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

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
          <div className="text-sm text-red-700 whitespace-pre-wrap">{state.error}</div>
        ) : state.data.length === 0 ? (
          <div className="text-sm text-black/60">No hay work orders todavía.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-black/70">
                <tr className="border-b">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>

              <tbody>
                {state.data.map((w) => (
                  <tr key={w.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{typeof w.number === "number" ? w.number : "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{w.title ?? "—"}</div>
                      {w.description ? <div className="text-xs text-black/60">{w.description}</div> : null}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge>{w.status ?? "—"}</Badge>
                    </td>
                    <td className="py-2 pr-3">{formatDate(w.dueAt)}</td>
                    <td className="py-2 pr-3">
                      {/* Si aún no tienes detalle, deja el link pero luego creamos /work-orders/[id] */}
                      <Link className="text-black/70 hover:text-black" href={`/work-orders/${w.id}`}>
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
