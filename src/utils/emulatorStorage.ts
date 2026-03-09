import { createEmulatorStorage } from "./createEmulatorStorage";
import { silentWarn } from "@/utils/silentWarn";

const ROM_STORE = "roms";
const SAVE_STORE = "saves";
const STATE_STORE = "states";

const storage = createEmulatorStorage("pokemon-gba-emulator", [ROM_STORE, SAVE_STORE, STATE_STORE]);

// ROM storage — all functions degrade gracefully if IndexedDB is unavailable
export async function storeROM(name: string, data: ArrayBuffer): Promise<void> {
  try { await storage.put(ROM_STORE, name, data); } catch (e) { silentWarn("storeROM", e); }
}

export async function loadROM(name: string): Promise<ArrayBuffer | null> {
  try { return await storage.get<ArrayBuffer>(ROM_STORE, name); } catch (e) { silentWarn("loadROM", e); return null; }
}

export async function listROMs(): Promise<string[]> {
  try { return await storage.keys(ROM_STORE); } catch (e) { silentWarn("listROMs", e); return []; }
}

export async function deleteROM(name: string): Promise<void> {
  try { await storage.del(ROM_STORE, name); } catch (e) { silentWarn("deleteROM", e); }
}

// Save file storage
export async function storeSave(romName: string, data: Uint8Array): Promise<void> {
  try { await storage.put(SAVE_STORE, romName, data); } catch (e) { silentWarn("storeSave", e); }
}

export async function loadSave(romName: string): Promise<Uint8Array | null> {
  try {
    const data = await storage.get<Uint8Array>(SAVE_STORE, romName);
    return data ? new Uint8Array(data) : null;
  } catch (e) { silentWarn("loadSave", e); return null; }
}

export async function listSaves(): Promise<string[]> {
  try { return await storage.keys(SAVE_STORE); } catch (e) { silentWarn("listSaves", e); return []; }
}

// Save state storage
export async function storeSaveState(key: string, data: Uint8Array): Promise<void> {
  try { await storage.put(STATE_STORE, key, data); } catch (e) { silentWarn("storeSaveState", e); }
}

export async function loadSaveState(key: string): Promise<Uint8Array | null> {
  try {
    const data = await storage.get<Uint8Array>(STATE_STORE, key);
    return data ? new Uint8Array(data) : null;
  } catch (e) { silentWarn("loadSaveState", e); return null; }
}
