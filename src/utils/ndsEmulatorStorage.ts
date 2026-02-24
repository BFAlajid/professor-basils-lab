const DB_NAME = "pokemon-nds-emulator";
const DB_VERSION = 1;
const ROM_STORE = "roms";
const SAVE_STORE = "saves";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(ROM_STORE)) db.createObjectStore(ROM_STORE);
        if (!db.objectStoreNames.contains(SAVE_STORE)) db.createObjectStore(SAVE_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch {
      // Safari private browsing blocks IndexedDB — reject gracefully
      reject(new Error("IndexedDB unavailable (private browsing?)"));
    }
  });
}

function txPut(store: string, key: string, value: ArrayBuffer | Uint8Array): Promise<void> {
  return openDB().then(
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

function txGet<T>(store: string, key: string): Promise<T | null> {
  return openDB().then(
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

function txKeys(store: string): Promise<string[]> {
  return openDB().then(
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

function txDelete(store: string, key: string): Promise<void> {
  return openDB().then(
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

// ROM storage — all functions degrade gracefully if IndexedDB is unavailable
export async function storeNDSROM(name: string, data: ArrayBuffer): Promise<void> {
  try { await txPut(ROM_STORE, name, data); } catch { /* private browsing — skip persist */ }
}

export async function loadNDSROM(name: string): Promise<ArrayBuffer | null> {
  try { return await txGet<ArrayBuffer>(ROM_STORE, name); } catch { return null; }
}

export async function listNDSROMs(): Promise<string[]> {
  try { return await txKeys(ROM_STORE); } catch { return []; }
}

export async function deleteNDSROM(name: string): Promise<void> {
  try { await txDelete(ROM_STORE, name); } catch { /* noop */ }
}

// Save file storage
export async function storeNDSSave(romName: string, data: Uint8Array): Promise<void> {
  try { await txPut(SAVE_STORE, romName, data); } catch { /* private browsing — skip persist */ }
}

export async function loadNDSSave(romName: string): Promise<Uint8Array | null> {
  try {
    const data = await txGet<Uint8Array>(SAVE_STORE, romName);
    return data ? new Uint8Array(data) : null;
  } catch { return null; }
}

export async function listNDSSaves(): Promise<string[]> {
  try { return await txKeys(SAVE_STORE); } catch { return []; }
}
