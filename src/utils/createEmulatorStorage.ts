const DB_VERSION = 1;

function openDB(dbName: string, stores: string[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const store of stores) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch {
      reject(new Error("IndexedDB unavailable (private browsing?)"));
    }
  });
}

function txPut(dbName: string, stores: string[], store: string, key: string, value: ArrayBuffer | Uint8Array): Promise<void> {
  return openDB(dbName, stores).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

function txGet<T>(dbName: string, stores: string[], store: string, key: string): Promise<T | null> {
  return openDB(dbName, stores).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => {
          db.close();
          resolve(req.result ?? null);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      })
  );
}

function txKeys(dbName: string, stores: string[], store: string): Promise<string[]> {
  return openDB(dbName, stores).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAllKeys();
        req.onsuccess = () => {
          db.close();
          resolve(req.result as string[]);
        };
        req.onerror = () => {
          db.close();
          reject(req.error);
        };
      })
  );
}

function txDelete(dbName: string, stores: string[], store: string, key: string): Promise<void> {
  return openDB(dbName, stores).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

export interface EmulatorStorageOps {
  put(store: string, key: string, value: ArrayBuffer | Uint8Array): Promise<void>;
  get<T>(store: string, key: string): Promise<T | null>;
  keys(store: string): Promise<string[]>;
  del(store: string, key: string): Promise<void>;
}

export function createEmulatorStorage(dbName: string, stores: string[]): EmulatorStorageOps {
  return {
    put: (store, key, value) => txPut(dbName, stores, store, key, value),
    get: <T>(store: string, key: string) => txGet<T>(dbName, stores, store, key),
    keys: (store) => txKeys(dbName, stores, store),
    del: (store, key) => txDelete(dbName, stores, store, key),
  };
}
