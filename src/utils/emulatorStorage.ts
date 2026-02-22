const DB_NAME = "pokemon-gba-emulator";
const DB_VERSION = 1;
const ROM_STORE = "roms";
const SAVE_STORE = "saves";
const STATE_STORE = "states";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROM_STORE)) db.createObjectStore(ROM_STORE);
      if (!db.objectStoreNames.contains(SAVE_STORE)) db.createObjectStore(SAVE_STORE);
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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

// ROM storage
export async function storeROM(name: string, data: ArrayBuffer): Promise<void> {
  await txPut(ROM_STORE, name, data);
}

export async function loadROM(name: string): Promise<ArrayBuffer | null> {
  return txGet<ArrayBuffer>(ROM_STORE, name);
}

export async function listROMs(): Promise<string[]> {
  return txKeys(ROM_STORE);
}

export async function deleteROM(name: string): Promise<void> {
  await txDelete(ROM_STORE, name);
}

// Save file storage
export async function storeSave(romName: string, data: Uint8Array): Promise<void> {
  await txPut(SAVE_STORE, romName, data);
}

export async function loadSave(romName: string): Promise<Uint8Array | null> {
  const data = await txGet<Uint8Array>(SAVE_STORE, romName);
  return data ? new Uint8Array(data) : null;
}

export async function listSaves(): Promise<string[]> {
  return txKeys(SAVE_STORE);
}

// Save state storage
export async function storeSaveState(key: string, data: Uint8Array): Promise<void> {
  await txPut(STATE_STORE, key, data);
}

export async function loadSaveState(key: string): Promise<Uint8Array | null> {
  const data = await txGet<Uint8Array>(STATE_STORE, key);
  return data ? new Uint8Array(data) : null;
}
