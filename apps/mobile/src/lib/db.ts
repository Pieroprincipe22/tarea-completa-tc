import * as SQLite from 'expo-sqlite';

// Cola de sincronización offline-first: toda acción del técnico (cambiar
// estado, subir foto/firma) se escribe aquí PRIMERO, de forma síncrona con
// la UI, y se reintenta sola cuando vuelve la conexión (ver sync.ts). El
// técnico nunca se queda "esperando red" para poder seguir trabajando.

export type PendingActionKind = 'WORK_ORDER_STATUS' | 'UPLOAD_ATTACHMENT';

export type PendingAction = {
  id: number;
  kind: PendingActionKind;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('tc-mantenimiento.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS pending_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );

        CREATE TABLE IF NOT EXISTS work_orders_cache (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function enqueueAction(
  kind: PendingActionKind,
  payload: unknown,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO pending_actions (kind, payload, created_at, attempts) VALUES (?, ?, ?, 0)',
    kind,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
}

export async function listPendingActions(): Promise<PendingAction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    kind: string;
    payload: string;
    created_at: string;
    attempts: number;
    last_error: string | null;
  }>('SELECT * FROM pending_actions ORDER BY id ASC');

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as PendingActionKind,
    payload: r.payload,
    createdAt: r.created_at,
    attempts: r.attempts,
    lastError: r.last_error,
  }));
}

export async function removePendingAction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_actions WHERE id = ?', id);
}

export async function markPendingActionFailed(id: number, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE pending_actions SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    error,
    id,
  );
}

export async function countPendingActions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_actions',
  );
  return row?.count ?? 0;
}

export async function cacheWorkOrders(items: unknown[]): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      if (!item || typeof item !== 'object' || !('id' in item)) continue;
      const id = String((item as { id: unknown }).id);
      await db.runAsync(
        'INSERT OR REPLACE INTO work_orders_cache (id, data, updated_at) VALUES (?, ?, ?)',
        id,
        JSON.stringify(item),
        now,
      );
    }
  });
}

export async function getCachedWorkOrders<T = unknown>(): Promise<T[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM work_orders_cache ORDER BY updated_at DESC',
  );
  return rows.map((r) => JSON.parse(r.data) as T);
}
