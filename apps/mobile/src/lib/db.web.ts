// Sustituto para web: expo-sqlite usa un Web Worker (wa-sqlite) que Metro
// no consigue empaquetar de forma fiable en este monorepo. La app real de
// campo es Android/iOS (donde expo-sqlite usa SQLite nativo sin problema);
// este archivo solo existe para que la vista previa web no rompa el bundle.
// Metro elige automáticamente este archivo (*.web.ts) en vez de db.ts
// cuando compila para la plataforma "web".

export type PendingActionKind = 'WORK_ORDER_STATUS' | 'UPLOAD_ATTACHMENT';

export type PendingAction = {
  id: number;
  kind: PendingActionKind;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

const memory: { actions: PendingAction[]; nextId: number; cache: Map<string, unknown> } = {
  actions: [],
  nextId: 1,
  cache: new Map(),
};

export async function enqueueAction(kind: PendingActionKind, payload: unknown): Promise<void> {
  memory.actions.push({
    id: memory.nextId++,
    kind,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  });
}

export async function listPendingActions(): Promise<PendingAction[]> {
  return [...memory.actions];
}

export async function removePendingAction(id: number): Promise<void> {
  memory.actions = memory.actions.filter((a) => a.id !== id);
}

export async function markPendingActionFailed(id: number, error: string): Promise<void> {
  const action = memory.actions.find((a) => a.id === id);
  if (action) {
    action.attempts += 1;
    action.lastError = error;
  }
}

export async function countPendingActions(): Promise<number> {
  return memory.actions.length;
}

export async function cacheWorkOrders(items: unknown[]): Promise<void> {
  for (const item of items) {
    if (item && typeof item === 'object' && 'id' in item) {
      memory.cache.set(String((item as { id: unknown }).id), item);
    }
  }
}

export async function getCachedWorkOrders<T = unknown>(): Promise<T[]> {
  return Array.from(memory.cache.values()) as T[];
}
