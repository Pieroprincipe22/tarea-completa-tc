import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { tcPatch } from '@/lib/api';
import {
  countPendingActions,
  listPendingActions,
  markPendingActionFailed,
  removePendingAction,
} from '@/lib/db';
import type { TcSession } from '@/lib/session';

export type WorkOrderStatusAction = 'start' | 'done' | 'reopen' | 'cancel';

export type UploadAttachmentPayload = {
  workOrderId: string;
  localUri: string;
  fileName: string;
  mimeType: string;
};

export type WorkOrderStatusPayload = {
  workOrderId: string;
  action: WorkOrderStatusAction;
};

async function runWorkOrderStatus(
  session: TcSession,
  payload: WorkOrderStatusPayload,
): Promise<void> {
  const res = await tcPatch(session, `/work-orders/${payload.workOrderId}/${payload.action}`);
  if (res.code < 200 || res.code >= 300) {
    throw new Error(`HTTP ${res.code} al actualizar la orden`);
  }
}

async function runUploadAttachment(
  session: TcSession,
  payload: UploadAttachmentPayload,
): Promise<void> {
  const form = new FormData();
  // React Native FormData acepta este shape especial para archivos locales.
  form.append('file', {
    uri: payload.localUri,
    name: payload.fileName,
    type: payload.mimeType,
  } as unknown as Blob);

  const base = session.apiBase.endsWith('/') ? session.apiBase.slice(0, -1) : session.apiBase;
  const res = await fetch(`${base}/work-orders/${payload.workOrderId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'x-company-id': session.companyId,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al subir el adjunto`);
  }
}

// Procesa la cola EN ORDEN y se detiene en el primer fallo (para no subir
// una firma antes que la foto que la precede, por ejemplo). Un fallo típico
// es "seguimos sin red" — se reintenta solo en el próximo flush.
export async function flushQueue(session: TcSession | null): Promise<void> {
  if (!session) return;

  const pending = await listPendingActions();

  for (const action of pending) {
    try {
      const payload = JSON.parse(action.payload);

      if (action.kind === 'WORK_ORDER_STATUS') {
        await runWorkOrderStatus(session, payload as WorkOrderStatusPayload);
      } else if (action.kind === 'UPLOAD_ATTACHMENT') {
        await runUploadAttachment(session, payload as UploadAttachmentPayload);
      }

      await removePendingAction(action.id);
    } catch (error) {
      await markPendingActionFailed(
        action.id,
        error instanceof Error ? error.message : String(error),
      );
      break; // preserva el orden: no seguimos con el resto todavía.
    }
  }
}

// Hook para que cualquier pantalla muestre "N cambios pendientes de
// sincronizar" y dispare un flush manual o automático al reconectar.
export function useSyncStatus(session: TcSession | null) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function refreshCount() {
    setPendingCount(await countPendingActions());
  }

  async function sync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushQueue(session);
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }

  useEffect(() => {
    // El setState real ocurre después del await dentro de refreshCount(),
    // no de forma síncrona en el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        void sync();
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  return { pendingCount, isOnline, syncing, sync, refreshCount };
}
