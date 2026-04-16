import type { StateStorage } from 'zustand/middleware';

/**
 * Minimal IndexedDB-backed StateStorage for zustand's `persist` middleware.
 *
 * IDB is used instead of localStorage because image layers store base64 data
 * URLs in-state — localStorage's ~5MB quota would be blown by a single large
 * screenshot. IDB's quota is in hundreds of MB on all modern browsers.
 *
 * One DB, one object store, keyed by the `name` persist passes in.
 */

const DB_NAME = 'app-screenshots-generator';
const STORE_NAME = 'session';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = op(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const v = await run<unknown>('readonly', (s) => s.get(name));
    return typeof v === 'string' ? v : null;
  },
  setItem: async (name, value) => {
    await run('readwrite', (s) => s.put(value, name));
  },
  removeItem: async (name) => {
    await run('readwrite', (s) => s.delete(name));
  },
};
