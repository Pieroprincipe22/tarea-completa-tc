'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { readTcSession, type TcSession } from '@/lib/tc/session';
import {
  errMsg,
  isRecord,
  resolveCorePaths,
  tcGet,
  tcPatch,
  tcPost,
} from '@/lib/tc/api';

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: string };

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type ReportItemStatusValue = 'PENDING' | 'OK' | 'FAIL' | 'NA';
type ItemType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'CHECKBOX'
  | 'CHECKLIST'
  | 'PHOTO'
  | 'SIGNATURE'
  | string;

type ReportItem = {
  id: string;
  sortOrder: number;
  title: string;
  description?: string | null;
  status: ReportItemStatusValue;
  type: ItemType;
  required: boolean;
  unit?: string | null;
  helpText?: string | null;
  placeholder?: string | null;
  valueText: string;
  valueNumber: string;
  valueBoolean: 'true' | 'false' | '';
  valueDate: string;
  valueChecklistText: string;
  notes: string;
};

type ReportDetail = {
  id: string;
  workOrderId?: string | null;
  performedAt?: string | null;
  state?: string | null;
  status?: string | null;
  templateName?: string | null;
  templateDesc?: string | null;
  summary?: string | null;
  notes?: string | null;
  items: ReportItem[];
};

function formatDate(input?: string | null) {
  if (!input) return '—';
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleString('es-ES');
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function asNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function normalizeDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function checklistToText(valueJson: unknown, fallback?: string | null) {
  if (Array.isArray(valueJson)) {
    return valueJson
      .map((row) => {
        if (typeof row === 'string') return row;
        if (isRecord(row)) {
          const label = asStr(row.label);
          const checked =
            typeof row.checked === 'boolean'
              ? row.checked
                ? 'true'
                : 'false'
              : '';
          return label ? `${label}${checked ? ` | ${checked}` : ''}` : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof fallback === 'string') return fallback;
  return '';
}

function getApiError(json: unknown, code: number): string {
  if (isRecord(json)) {
    const message = json.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const joined = message
        .filter((x): x is string => typeof x === 'string')
        .join(', ');
      if (joined) return joined;
    }

    const error = json.error;
    if (typeof error === 'string' && error.trim()) {
      return `${error} (HTTP ${code})`;
    }
  }

  return `HTTP ${code}`;
}

function resolveReportVisual(detail: ReportDetail) {
  const status = String(detail.status ?? '').toUpperCase();
  const state = String(detail.state ?? '').toUpperCase();

  if (status === 'APPROVED') {
    return {
      label: 'Aprobado',
      className:
        'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    };
  }

  if (status === 'REJECTED') {
    return {
      label: 'Rechazado',
      className: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    };
  }

  if (status === 'SUBMITTED') {
    return {
      label: 'Enviado',
      className: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: 'En progreso',
      className: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    };
  }

  if (status === 'ASSIGNED') {
    return {
      label: 'Asignado',
      className: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    };
  }

  if (state === 'FINAL') {
    return {
      label: 'Final',
      className:
        'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    };
  }

  return {
    label: 'Borrador',
    className:
      'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  };
}

function parseItem(value: unknown): ReportItem | null {
  if (!isRecord(value)) return null;

  const templateItem = isRecord(value.templateItem) ? value.templateItem : null;

  const id = asStr(value.id);
  const title =
    asStr(value.title) ||
    asStr(value.label) ||
    asStr(templateItem?.title) ||
    asStr(templateItem?.label);

  if (!id || !title) return null;

  const rawStatus = asStr(value.status, 'PENDING').toUpperCase();
  const rawType = asStr(value.type, asStr(templateItem?.type, 'TEXT')).toUpperCase();

  const status: ReportItemStatusValue =
    rawStatus === 'OK' || rawStatus === 'FAIL' || rawStatus === 'NA'
      ? rawStatus
      : 'PENDING';

  const valueNumber =
    value.valueNumber === null || value.valueNumber === undefined
      ? ''
      : String(value.valueNumber);

  const valueBoolean =
    typeof value.valueBoolean === 'boolean'
      ? (String(value.valueBoolean) as 'true' | 'false')
      : '';

  return {
    id,
    sortOrder: asNum(value.sortOrder, asNum(value.itemOrder, 0)),
    title,
    description:
      asNullableStr(value.description) ??
      asNullableStr(templateItem?.description),
    status,
    type: rawType || 'TEXT',
    required: Boolean(value.required ?? templateItem?.required),
    unit: asNullableStr(value.unit) ?? asNullableStr(templateItem?.unit),
    helpText:
      asNullableStr(value.helpText) ?? asNullableStr(templateItem?.helpText),
    placeholder:
      asNullableStr(value.placeholder) ??
      asNullableStr(templateItem?.placeholder),
    valueText: asNullableStr(value.valueText) ?? asNullableStr(value.value) ?? '',
    valueNumber,
    valueBoolean,
    valueDate: normalizeDateInput(asNullableStr(value.valueDate)),
    valueChecklistText: checklistToText(
      (value as { valueJson?: unknown }).valueJson,
      asNullableStr(value.valueText) ?? asNullableStr(value.value),
    ),
    notes: asNullableStr(value.notes) ?? '',
  };
}

function parseDetail(value: unknown, fallbackId: string): ReportDetail | null {
  if (!isRecord(value)) return null;

  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw
    .map(parseItem)
    .filter((item): item is ReportItem => !!item)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: asStr(value.id, fallbackId),
    workOrderId: asNullableStr(value.workOrderId),
    performedAt:
      asNullableStr(value.performedAt) ?? asNullableStr(value.completedAt),
    state: asNullableStr(value.state),
    status: asNullableStr(value.status),
    templateName:
      asNullableStr(value.templateName) ?? asNullableStr(value.title),
    templateDesc:
      asNullableStr(value.templateDesc) ?? asNullableStr(value.description),
    summary: asNullableStr(value.summary),
    notes: asNullableStr(value.notes),
    items,
  };
}

function buildItemPayload(item: ReportItem) {
  const base = {
    status: item.status,
    notes: item.notes.trim() || null,
  };

  switch (item.type) {
    case 'NUMBER':
      return {
        ...base,
        valueNumber: item.valueNumber.trim() === '' ? null : Number(item.valueNumber),
      };

    case 'BOOLEAN':
    case 'CHECKBOX':
      return {
        ...base,
        valueBoolean:
          item.valueBoolean === ''
            ? null
            : item.valueBoolean === 'true',
      };

    case 'DATE':
      return {
        ...base,
        valueDate: item.valueDate || null,
      };

    case 'CHECKLIST': {
      const rows = item.valueChecklistText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      return {
        ...base,
        valueJson: rows,
        valueText: rows.length ? rows.join('\n') : null,
      };
    }

    default:
      return {
        ...base,
        valueText: item.valueText.trim() || null,
      };
  }
}

export default function MaintenanceReportDetailPage() {
  const params = useParams();
  const idRaw = (params as { id?: string | string[] })?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : String(idRaw ?? '');

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<TcSession | null>(null);
  const [state, setState] = useState<LoadState<ReportDetail>>({
    status: 'loading',
  });
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
  });
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const paths = useMemo(() => resolveCorePaths(session), [session]);

  useEffect(() => {
    setMounted(true);
    setSession(readTcSession());
  }, []);

  const loadDetail = useCallback(
    async (currentSession: TcSession, currentId: string) => {
      setState({ status: 'loading' });

      const currentPaths = resolveCorePaths(currentSession);
      const r = await tcGet(currentSession, `${currentPaths.reports}/${currentId}`);

      if (r.code === 404) {
        setState({
          status: 'error',
          error: 'Reporte no encontrado.',
        });
        return;
      }

      if (r.code < 200 || r.code >= 300) {
        setState({
          status: 'error',
          error: getApiError(r.json, r.code),
        });
        return;
      }

      const parsed = parseDetail(r.json, currentId);

      if (!parsed) {
        setState({
          status: 'error',
          error: 'Respuesta inválida del backend.',
        });
        return;
      }

      setState({
        status: 'ok',
        data: parsed,
      });
    },
    [],
  );

  useEffect(() => {
    if (!mounted) return;
    if (!session) return;
    if (!id) {
      setState({ status: 'error', error: 'ID de reporte inválido.' });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadDetail(session, id);
      } catch (e) {
        if (!cancelled) {
          setState({ status: 'error', error: errMsg(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, session, id, loadDetail]);

  const backHref =
    state.status === 'ok' && state.data.workOrderId
      ? `/work-orders/${state.data.workOrderId}`
      : '/maintenance-reports';

  const visual =
    state.status === 'ok' ? resolveReportVisual(state.data) : null;

  const isEditable =
    state.status === 'ok' &&
    String(state.data.state ?? '').toUpperCase() !== 'FINAL' &&
    !['APPROVED', 'CANCELLED', 'SUBMITTED'].includes(
      String(state.data.status ?? '').toUpperCase(),
    );

  function updateLocalItem(
    itemId: string,
    patch: Partial<
      Pick<
        ReportItem,
        | 'status'
        | 'valueText'
        | 'valueNumber'
        | 'valueBoolean'
        | 'valueDate'
        | 'valueChecklistText'
        | 'notes'
      >
    >,
  ) {
    setState((prev) => {
      if (prev.status !== 'ok') return prev;

      return {
        status: 'ok',
        data: {
          ...prev.data,
          items: prev.data.items.map((item) =>
            item.id === itemId ? { ...item, ...patch } : item,
          ),
        },
      };
    });
  }

  async function saveItem(item: ReportItem) {
    if (!session || !id) return;

    try {
      setSavingItemId(item.id);
      setActionState({
        status: 'saving',
        message: `Guardando item ${item.sortOrder}...`,
      });

      const r = await tcPatch(
        session,
        `${paths.reports}/${id}/items/${item.id}`,
        buildItemPayload(item),
      );

      if (r.code < 200 || r.code >= 300) {
        setActionState({
          status: 'error',
          message: getApiError(r.json, r.code),
        });
        return;
      }

      const updated = parseItem(r.json);
      if (updated) {
        updateLocalItem(item.id, {
          status: updated.status,
          valueText: updated.valueText,
          valueNumber: updated.valueNumber,
          valueBoolean: updated.valueBoolean,
          valueDate: updated.valueDate,
          valueChecklistText: updated.valueChecklistText,
          notes: updated.notes,
        });
      }

      setActionState({
        status: 'success',
        message: `Item ${item.sortOrder} guardado correctamente.`,
      });
    } catch (e) {
      setActionState({
        status: 'error',
        message: errMsg(e),
      });
    } finally {
      setSavingItemId(null);
    }
  }

  async function finalizeReport() {
    if (!session || !id) return;
    if (state.status !== 'ok') return;

    const hasPending = state.data.items.some((item) => item.status === 'PENDING');
    if (hasPending) {
      setActionState({
        status: 'error',
        message: 'No puedes finalizar mientras haya ítems en PENDING.',
      });
      return;
    }

    try {
      setActionState({ status: 'saving', message: 'Finalizando parte...' });

      const r = await tcPost(session, `${paths.reports}/${id}/finalize`);

      if (r.code < 200 || r.code >= 300) {
        setActionState({
          status: 'error',
          message: getApiError(r.json, r.code),
        });
        return;
      }

      const parsed = parseDetail(r.json, id);
      if (parsed) {
        setState({
          status: 'ok',
          data: parsed,
        });
      } else {
        await loadDetail(session, id);
      }

      setActionState({
        status: 'success',
        message: 'Parte finalizado correctamente.',
      });
    } catch (e) {
      setActionState({
        status: 'error',
        message: errMsg(e),
      });
    }
  }

  function renderValueField(item: ReportItem, disabled: boolean) {
    switch (item.type) {
      case 'NUMBER':
        return (
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
            type="number"
            value={item.valueNumber}
            onChange={(e) =>
              updateLocalItem(item.id, { valueNumber: e.target.value })
            }
            placeholder={item.placeholder ?? 'Ej: 3.5'}
            disabled={disabled}
          />
        );

      case 'BOOLEAN':
      case 'CHECKBOX':
        return (
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
            value={item.valueBoolean}
            onChange={(e) =>
              updateLocalItem(item.id, {
                valueBoolean: e.target.value as 'true' | 'false' | '',
              })
            }
            disabled={disabled}
          >
            <option value="">Sin responder</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        );

      case 'DATE':
        return (
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
            type="date"
            value={item.valueDate}
            onChange={(e) =>
              updateLocalItem(item.id, { valueDate: e.target.value })
            }
            disabled={disabled}
          />
        );

      case 'CHECKLIST':
        return (
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
            value={item.valueChecklistText}
            onChange={(e) =>
              updateLocalItem(item.id, {
                valueChecklistText: e.target.value,
              })
            }
            placeholder="Una línea por elemento"
            disabled={disabled}
          />
        );

      case 'LONG_TEXT':
      case 'TEXTAREA':
      case 'PHOTO':
      case 'SIGNATURE':
        return (
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
            value={item.valueText}
            onChange={(e) =>
              updateLocalItem(item.id, { valueText: e.target.value })
            }
            placeholder={
              item.placeholder ??
              (item.type === 'PHOTO'
                ? 'Referencia de evidencia/foto'
                : item.type === 'SIGNATURE'
                  ? 'Firma pendiente / referencia'
                  : 'Escribe el resultado')
            }
            disabled={disabled}
          />
        );

      default:
        return (
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
            value={item.valueText}
            onChange={(e) =>
              updateLocalItem(item.id, { valueText: e.target.value })
            }
            placeholder={item.placeholder ?? 'Valor / resultado'}
            disabled={disabled}
          />
        );
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4 text-sm text-slate-400">
          Cargando sesión…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="text-sm text-red-200">
          Sin sesión tenant. Ve a{' '}
          <Link className="text-white underline" href="/login">
            /login
          </Link>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Parte de trabajo</h1>
          <p className="mt-1 text-sm text-slate-400">
            Checklist técnico renderizado por tipo real de item.
          </p>
        </div>

        <Link href={backHref} className="text-sm text-slate-300 hover:text-white">
          ← Volver
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-5">
        {state.status === 'loading' ? (
          <div className="text-sm text-slate-400">Cargando…</div>
        ) : state.status === 'error' ? (
          <div className="text-sm text-red-200">{state.error}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">
                  {state.data.templateName ?? 'Maintenance Report'}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Fecha:{' '}
                  <span className="text-slate-200">
                    {formatDate(state.data.performedAt)}
                  </span>{' '}
                  · ID: <span className="text-slate-200">{state.data.id}</span>
                </div>

                {state.data.templateDesc ? (
                  <div className="mt-2 text-sm text-slate-300">
                    {state.data.templateDesc}
                  </div>
                ) : null}

                {state.data.notes ? (
                  <div className="mt-2 text-sm text-slate-300">
                    Notas: {state.data.notes}
                  </div>
                ) : null}

                {state.data.workOrderId ? (
                  <div className="mt-2 text-sm text-slate-300">
                    Work order vinculada:{' '}
                    <Link
                      className="underline"
                      href={`/work-orders/${state.data.workOrderId}`}
                    >
                      {state.data.workOrderId}
                    </Link>
                  </div>
                ) : null}
              </div>

              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${visual?.className ?? 'border-slate-700 bg-slate-800 text-slate-200'}`}
                >
                  {visual?.label ?? '—'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-white">Items</h2>

              {state.data.items.length === 0 ? (
                <div className="mt-3 text-sm text-slate-400">
                  Este reporte no tiene ítems.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {state.data.items.map((item) => {
                    const isSaving = savingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-400">
                              Item #{item.sortOrder}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-white">
                                {item.title}
                              </div>
                              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                                {item.type}
                              </span>
                              {item.required ? (
                                <span className="rounded-full border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300">
                                  requerido
                                </span>
                              ) : null}
                              {item.unit ? (
                                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                                  {item.unit}
                                </span>
                              ) : null}
                            </div>
                            {item.description ? (
                              <div className="mt-1 text-sm text-slate-400">
                                {item.description}
                              </div>
                            ) : null}
                            {item.helpText ? (
                              <div className="mt-1 text-xs text-slate-500">
                                {item.helpText}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                          <div>
                            <label className="mb-2 block text-sm text-slate-300">
                              Estado
                            </label>
                            <select
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                              value={item.status}
                              onChange={(e) =>
                                updateLocalItem(item.id, {
                                  status: e.target.value as ReportItemStatusValue,
                                })
                              }
                              disabled={!isEditable || isSaving}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="OK">OK</option>
                              <option value="FAIL">FAIL</option>
                              <option value="NA">NA</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-slate-300">
                              Valor / resultado
                            </label>
                            {renderValueField(item, !isEditable || isSaving)}
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-sm text-slate-300">
                              Notas
                            </label>
                            <textarea
                              className="min-h-[110px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                              value={item.notes}
                              onChange={(e) =>
                                updateLocalItem(item.id, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Detalle técnico del trabajo realizado"
                              disabled={!isEditable || isSaving}
                            />
                          </div>
                        </div>

                        {isEditable ? (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => saveItem(item)}
                              disabled={isSaving}
                              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
                            >
                              {isSaving ? 'Guardando…' : 'Guardar item'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {isEditable ? (
                <button
                  type="button"
                  onClick={finalizeReport}
                  disabled={
                    actionState.status === 'saving' || state.data.items.length === 0
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Finalizar parte
                </button>
              ) : null}

              <Link
                href={backHref}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Volver
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <h3 className="text-sm font-semibold text-white">
                Estado de operación
              </h3>

              {actionState.status === 'idle' ? (
                <p className="mt-2 text-sm text-slate-400">
                  Sin acciones pendientes.
                </p>
              ) : actionState.status === 'saving' ? (
                <p className="mt-2 text-sm text-amber-300">
                  {actionState.message}
                </p>
              ) : actionState.status === 'success' ? (
                <p className="mt-2 text-sm text-emerald-300">
                  {actionState.message}
                </p>
              ) : (
                <p className="mt-2 text-sm text-rose-300">
                  {actionState.message}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}