"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { readTcSession, type TcSession } from "@/lib/tc/session";
import { errMsg, resolveCorePaths, tcGet } from "@/lib/tc/api";

type LoadState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

type TemplateItem = {
  id: string;
  sortOrder?: number;
  label?: string;
  type?: string;
  required?: boolean;
  unit?: string | null;
  hint?: string | null;
};

type TemplateDetail = {
  id: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
  intervalDays?: number | null;
  items: TemplateItem[];
};

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function asStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNum(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function joinPath(base: string, id: string) {
  return base.endsWith("/") ? `${base}${id}` : `${base}/${id}`;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "ok" | "muted" }) {
  const cls =
    tone === "ok"
      ? "bg-green-600/10 text-green-700 ring-green-600/20"
      : "bg-slate-600/10 text-slate-700 ring-slate-600/20";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${cls}`}>{children}</span>;
}

function prettyHttpError(message: string, url: string) {
  // tcFetch lanza "HTTP 404: ..." etc.
  if (message.startsWith("HTTP 404")) return `No existe el template o endpoint: ${url}`;
  if (message.startsWith("HTTP 401")) return "401 Unauthorized. Revisa tu sesión (companyId/userId).";
  if (message.startsWith("HTTP 403")) return "403 Forbidden (tenant). Revisa companyId/userId y UserCompany.";
  return message;
}

export default function MaintenanceTemplateDetailPage() {
  // Si AuthGate ya exige sesión, esto casi nunca será null; pero lo dejamos por robustez.
  const session = useMemo<TcSession | null>(() => readTcSession(), []);
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id ?? "");

  const [state, setState] = useState<LoadState<TemplateDetail>>({ status: "loading" });

  useEffect(() => {
    if (!session) return;
    if (!id) return;

    let cancelled = false;

    (async () => {
      setState({ status: "loading" });

      const paths = resolveCorePaths();
      const url = joinPath(paths.templates, id);

      try {
        const data = await tcGet<unknown>(url);
        if (cancelled) return;

        const root = asObj(data);

        const rawItems = (root as any).items ?? (root as any).templateItems ?? (root as any).maintenanceTemplateItems;
        const items = asArr(rawItems).map((it) => {
          const o = asObj(it);
          return {
            id: String(o.id ?? ""),
            sortOrder: asNum(o.sortOrder),
            label: asStr(o.label),
            type: asStr(o.type),
            required: asBool(o.required),
            unit: (o.unit ?? null) as string | null,
            hint: (o.hint ?? null) as string | null,
          } satisfies TemplateItem;
        });

        items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const detail: TemplateDetail = {
          id: String(root.id ?? id),
          name: asStr(root.name),
          description: (root.description ?? null) as string | null,
          isActive: asBool(root.isActive),
          intervalDays: (root.intervalDays ?? null) as number | null,
          items,
        };

        setState({ status: "ok", data: detail });
      } catch (e: unknown) {
        if (cancelled) return;
        const m = errMsg(e);
        setState({ status: "error", error: prettyHttpError(m, url) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, id]);

  if (!session) {
    return (
      <div className="text-sm text-red-700">
        Sin sesión tenant. Configura el login mock (AuthGate).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Template</h1>
          <p className="mt-1 text-sm text-black/60">Detalle read-only.</p>
        </div>
        <Link href="/maintenance-templates" className="text-sm text-black/70 hover:text-black">
          ← Volver
        </Link>
      </div>

      <div className="rounded-2xl border p-4">
        {state.status === "loading" ? (
          <div className="text-sm text-black/60">Cargando…</div>
        ) : state.status === "error" ? (
          <div className="text-sm text-red-700">{state.error}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{state.data.name ?? "Maintenance Template"}</div>
                <div className="text-xs text-black/60 mt-1">
                  ID: <span className="text-black">{state.data.id}</span>
                  {state.data.intervalDays != null ? (
                    <>
                      {" "}
                      · IntervalDays: <span className="text-black">{state.data.intervalDays}</span>
                    </>
                  ) : null}
                </div>
                {state.data.description ? <div className="mt-2 text-sm text-black/70">{state.data.description}</div> : null}
              </div>

              <div>
                <Badge tone={state.data.isActive === false ? "muted" : "ok"}>
                  {state.data.isActive === false ? "Inactivo" : "Activo"}
                </Badge>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold">Items</h2>

              {state.data.items.length === 0 ? (
                <div className="mt-2 text-sm text-black/60">Este template no trae items en la respuesta.</div>
              ) : (
                <div className="mt-3 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-black/70">
                      <tr className="border-b">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Label</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Req</th>
                        <th className="py-2 pr-3">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.items.map((it) => (
                        <tr key={it.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-3">{it.sortOrder ?? "—"}</td>
                          <td className="py-2 pr-3">
                            <div className="text-black">{it.label ?? "—"}</div>
                            {it.hint ? <div className="text-xs text-black/60">{it.hint}</div> : null}
                          </td>
                          <td className="py-2 pr-3">{it.type ?? "—"}</td>
                          <td className="py-2 pr-3">{it.required ? "Sí" : "No"}</td>
                          <td className="py-2 pr-3">{it.unit ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
