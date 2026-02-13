'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { readTcSession } from '@/lib/tc/session';
import { errMsg, normalizeList, resolveCorePaths, tcGet } from '@/lib/tc/api';

type LoadState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: T };

type WorkOrderListItem = {
  id: string;
  number: number;
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority: number;
  title: string;
  updatedAt: string;
  customer?: { id: string; name?: string } | null;
};

type ListResponse = {
  items: WorkOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function StatusPill({ status }: { status: WorkOrderListItem['status'] }) {
  const base = 'px-2 py-0.5 rounded text-xs font-medium border';
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-50 border-gray-200 text-gray-700',
    OPEN: 'bg-blue-50 border-blue-200 text-blue-700',
    IN_PROGRESS: 'bg-amber-50 border-amber-200 text-amber-700',
    DONE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    CANCELLED: 'bg-rose-50 border-rose-200 text-rose-700',
  };
  return <span className={`${base} ${map[status] ?? map.DRAFT}`}>{status}</span>;
}

function Inner() {
  const session = useMemo(() => readTcSession(), []);
  const [state, setState] = useState<LoadState<ListResponse>>({ kind: 'idle' });

  useEffect(() => {
    const run = async () => {
      if (!session) return;
      setState({ kind: 'loading' });
      try {
        const paths = resolveCorePaths(session);
        const res = await tcGet(session, `${paths.workOrders}?page=1&pageSize=50`);

        const items = (res && typeof res === 'object' && 'items' in res)
          ? (res as any).items as WorkOrderListItem[]
          : normalizeList<WorkOrderListItem>(res);

        const total =
          (res && typeof res === 'object' && 'total' in res)
            ? Number((res as any).total)
            : items.length;

        const page = (res && typeof res === 'object' && 'page' in res) ? Number((res as any).page) : 1;
        const pageSize = (res && typeof res === 'object' && 'pageSize' in res) ? Number((res as any).pageSize) : 50;

        setState({ kind: 'ready', data: { items, total, page, pageSize } });
      } catch (e) {
        setState({ kind: 'error', message: errMsg(e) });
      }
    };
    run();
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Work Orders</h1>
        <div className="text-sm text-gray-500">API: {session.apiBase}</div>
      </div>

      {state.kind === 'loading' && <div className="text-sm text-gray-600">Cargando...</div>}
      {state.kind === 'error' && <div className="text-sm text-red-700">Error: {state.message}</div>}

      {state.kind === 'ready' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-b">
            Total: <span className="font-medium">{state.data.total}</span>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-white border-b">
              <tr className="text-left">
                <th className="px-4 py-2">WO</th>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {state.data.items.map((wo) => (
                <tr key={wo.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    <Link className="text-blue-700 hover:underline" href={`/work-orders/${wo.id}`}>
                      #{wo.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{wo.title}</td>
                  <td className="px-4 py-2"><StatusPill status={wo.status} /></td>
                  <td className="px-4 py-2">{wo.customer?.name ?? wo.customer?.id ?? '-'}</td>
                  <td className="px-4 py-2">{new Date(wo.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
              {state.data.items.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-gray-600" colSpan={5}>No hay Work Orders</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function WorkOrdersPage() {
  return (
    <AuthGate>
      <Inner />
    </AuthGate>
  );
}
