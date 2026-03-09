import { createEmulatorStorage } from "./createEmulatorStorage";
import { silentWarn } from "@/utils/silentWarn";

const ROM_STORE = "roms";
const SAVE_STORE = "saves";

const storage = createEmulatorStorage("pokemon-nds-emulator", [ROM_STORE, SAVE_STORE]);

// ROM storage — all functions degrade gracefully if IndexedDB is unavailable
export async function storeNDSROM(name: string, data: ArrayBuffer): Promise<void> {
  try { await storage.put(ROM_STORE, name, data); } catch (e) { silentWarn("storeNDSROM", e); }
}

export async function loadNDSROM(name: string): Promise<ArrayBuffer | null> {
  try { return await storage.get<ArrayBuffer>(ROM_STORE, name); } catch (e) { silentWarn("loadNDSROM", e); return null; }
}

export async function listNDSROMs(): Promise<string[]> {
  try { return await storage.keys(ROM_STORE); } catch (e) { silentWarn("listNDSROMs", e); return []; }
}

export async function deleteNDSROM(name: string): Promise<void> {
  try { await storage.del(ROM_STORE, name); } catch (e) { silentWarn("deleteNDSROM", e); }
}

// Save file storage
export async function storeNDSSave(romName: string, data: Uint8Array): Promise<void> {
  try { await storage.put(SAVE_STORE, romName, data); } catch (e) { silentWarn("storeNDSSave", e); }
}

export async function loadNDSSave(romName: string): Promise<Uint8Array | null> {
  try {
    const data = await storage.get<Uint8Array>(SAVE_STORE, romName);
    return data ? new Uint8Array(data) : null;
  } catch (e) { silentWarn("loadNDSSave", e); return null; }
}

export async function listNDSSaves(): Promise<string[]> {
  try { return await storage.keys(SAVE_STORE); } catch (e) { silentWarn("listNDSSaves", e); return []; }
}
