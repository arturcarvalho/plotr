// Thin IndexedDB wrapper for the last-uploaded CSV. Single store, single
// record (key `current`). Used by App to re-register the user's file with
// ggsql after a page reload.
//
// No external dep (no `idb` package); the wrapper is small and only needs
// promise-style save/load/clear.

const DB_NAME = "plotr";
const DB_VERSION = 1;
const STORE = "csv";
const KEY = "current";

/** The persisted CSV blob — the return type of `loadLastCsv`. */
export interface CsvRecord {
  name: string;
  bytes: Uint8Array;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => {
      db.close();
      // Unwrap IDBRequest.result (set after onsuccess; .result is `undefined`
      // for `get` misses, which we want to surface as-is rather than confuse
      // for the request object).
      if (result instanceof IDBRequest) {
        resolve(result.result as T);
      } else {
        resolve(result as T);
      }
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveLastCsv(
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  // Copy the bytes into a fresh Uint8Array so structured-clone stores a
  // standalone buffer (caller may keep mutating the original view).
  const record: CsvRecord = { name, bytes: new Uint8Array(bytes) };
  await withStore("readwrite", (store) => store.put(record, KEY));
}

export async function loadLastCsv(): Promise<CsvRecord | null> {
  const raw = await withStore<CsvRecord | undefined>("readonly", (store) =>
    store.get(KEY),
  );
  if (!raw) return null;
  // Defensive copy on the way out for symmetry with saveLastCsv.
  return { name: raw.name, bytes: new Uint8Array(raw.bytes) };
}

export async function clearLastCsv(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(KEY));
}
