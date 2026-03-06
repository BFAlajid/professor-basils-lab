import { createEmulatorStorage } from "./createEmulatorStorage";

const ROM_STORE = "roms";
const SAVE_STORE = "saves";

const storage = createEmulatorStorage("pokemon-nds-emulator", [ROM_STORE, SAVE_STORE]);

// ROM storage — all functions degrade gracefully if IndexedDB is unavailable
export async function storeNDSROM(name: string, data: ArrayBuffer): Promise<void> {
  try { await storage.put(ROM_STORE, name, data); } catch { /* private browsing — skip persist */ }
}

export async function loadNDSROM(name: string): Promise<ArrayBuffer | null> {
  try { return await storage.get<ArrayBuffer>(ROM_STORE, name); } catch { return null; }
}

export async function listNDSROMs(): Promise<string[]> {
  try { return await storage.keys(ROM_STORE); } catch { return []; }
}

export async function deleteNDSROM(name: string): Promise<void> {
  try { await storage.del(ROM_STORE, name); } catch { /* noop */ }
}

// Save file storage
export async function storeNDSSave(romName: string, data: Uint8Array): Promise<void> {
  try { await storage.put(SAVE_STORE, romName, data); } catch { /* private browsing — skip persist */ }
}

export async function loadNDSSave(romName: string): Promise<Uint8Array | null> {
  try {
    const data = await storage.get<Uint8Array>(SAVE_STORE, romName);
    return data ? new Uint8Array(data) : null;
  } catch { return null; }
}

export async function listNDSSaves(): Promise<string[]> {
  try { return await storage.keys(SAVE_STORE); } catch { return []; }
}
