import type { RomInfo } from "@/types/explore";
import { listROMs, loadROM, storeROM } from "./emulatorStorage";
import { detectRom, ensureWasmReady } from "./gen3RomWasm";

let cachedBuffer: Uint8Array | null = null;
let cachedRomName: string | null = null;

export async function listAvailableRoms(): Promise<string[]> {
  return listROMs();
}

export async function getRomBuffer(name?: string): Promise<Uint8Array | null> {
  if (cachedBuffer && (!name || name === cachedRomName)) {
    return cachedBuffer;
  }

  const romName = name || (await findFirstRom());
  if (!romName) return null;

  const arrayBuffer = await loadROM(romName);
  if (!arrayBuffer) return null;

  cachedBuffer = new Uint8Array(arrayBuffer);
  cachedRomName = romName;
  return cachedBuffer;
}

export async function storeAndCacheRom(
  name: string,
  data: ArrayBuffer
): Promise<void> {
  await storeROM(name, data);
  cachedBuffer = new Uint8Array(data);
  cachedRomName = name;
}

export async function detectGame(
  buffer: Uint8Array
): Promise<RomInfo | null> {
  await ensureWasmReady();
  return detectRom(buffer);
}

async function findFirstRom(): Promise<string | null> {
  const roms = await listROMs();
  return roms.length > 0 ? roms[0] : null;
}

export function clearCachedRom(): void {
  cachedBuffer = null;
  cachedRomName = null;
}
