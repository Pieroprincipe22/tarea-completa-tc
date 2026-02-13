'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { readTcSession } from '@/lib/tc/session';
import { errMsg, resolveCorePaths, tcGet } from '@/lib/tc/api';

type LoadState<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: T };

type WorkOrderDetail = {
  id: string;
  number: number;
  status: string;
  priority: number;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: { id: string; name?: string } | null;
  site?: { id: string; name?: string } | null;
  asset?: { id: string; name?: string } | null;

  createdBy?: { id: string; email?: string } | null;
  assignedTo?: { id: string; email?: string } | null;
};

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-2 border-b last:border-b-0">
      <div className="col-span-12 md:col-span-3 text-sm text-gray-600">{label}</div>
      <div className="col-span-12 md:col-span-9 text-sm">{value ?? '-'}</div>
    </div>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const session = useMemo(() => readTcSession(), []);
  const [state, setState] = useState<LoadState<WorkOrderDetail>>({ kind: 'idle' });

  useEffect(() => {
    const run = async () => {
      if (!session || !id) return;
      setState({ kind: 'loading' });
      try {
        const paths = resolveCorePaths(session);
        const data = await tcGet(session, `${paths.workOrders}/${id}`);
        setState({ kind: 'ready', data: data as WorkOrderDetail });
      } catch (e) {
        setState({ kind: 'error', message: errMsg(e) });
      }
    };
    run();
  }, [session, id]);

  if (!session) return null;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <div className="text-sm text-gray-600">
          <Link className="text-blue-700 hover:underline" href="/work-orders">← Work Orders</Link>
        </div>
        <h1 className="text-xl font-semibold">Work Order</h1>
      </div>

      {state.kind === 'loading' && <div className="text-sm text-gray-600">Cargando...</div>}
      {state.kind === 'error' && <div className="text-sm text-red-700">Error: {state.message}</div>}

      {state.kind === 'ready' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <div className="text-sm text-gray-600">WO #{state.data.number}</div>
            <div className="font-medium">{state.data.title}</div>
          </div>

          <div className="p-4 space-y-1">
            <Row label="Estado" value={state.data.status} />
            <Row label="Prioridad" value={state.data.priority} />
            <Row label="Descripción" value={state.data.description} />
            <Row label="Cliente" value={state.data.customer?.name ?? state.data.customer?.id} />
            <Row label="Site" value={state.data.site?.name ?? state.data.site?.id} />
            <Row label="Asset" value={state.data.asset?.name ?? state.data.asset?.id} />
            <Row label="Asignado a" value={state.data.assignedTo?.email ?? state.data.assignedTo?.id} />
            <Row label="Creado por" value={state.data.createdBy?.email ?? state.data.createdBy?.id} />
            <Row label="Programado" value={state.data.scheduledAt ? new Date(state.data.scheduledAt).toLocaleString() : null} />
            <Row label="Vence" value={state.data.dueAt ? new Date(state.data.dueAt).toLocaleString() : null} />
            <Row label="Actualizado" value={new Date(state.data.updatedAt).toLocaleString()} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkOrderDetailPage() {
  return (
    <AuthGate>
      <Inner />
    </AuthGate>
  );
}
