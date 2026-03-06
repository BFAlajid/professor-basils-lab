import type {
  RomInfo,
  FullMapData,
  DecodedMetatile,
  DecodedSprite,
  MapTableEntry,
  WildEncounters,
} from "@/types/explore";

let wasmModule: {
  detectRom: (buffer: Uint8Array) => RomInfo | null;
  parseMap: (buffer: Uint8Array, group: number, num: number) => FullMapData | null;
  decodeTilesetPair: (
    buffer: Uint8Array,
    primaryPtr: number,
    secondaryPtr: number
  ) => DecodedMetatile[] | null;
  decodeOverworldSprite: (buffer: Uint8Array, graphicsId: number) => DecodedSprite | null;
  getMapTable: (buffer: Uint8Array) => MapTableEntry[] | null;
  getWildEncounters: (
    buffer: Uint8Array,
    group: number,
    num: number
  ) => WildEncounters | null;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    // @ts-ignore — cache-bust during dev to avoid stale WASM
    const cb = typeof window !== "undefined" ? `?v=${Date.now()}` : "";
    const mod = await import(/* webpackIgnore: true */ `/wasm/gen3_rom.js${cb}`);
    await mod.default(`/wasm/gen3_rom_bg.wasm${cb}`);
    wasmModule = {
      detectRom: mod.detectRom,
      parseMap: mod.parseMap,
      decodeTilesetPair: mod.decodeTilesetPair,
      decodeOverworldSprite: mod.decodeOverworldSprite,
      getMapTable: mod.getMapTable,
      getWildEncounters: mod.getWildEncounters,
    };
    // loaded OK
    return true;
  } catch (e) {
    console.error("[gen3-rom] WASM init failed:", e);
    wasmFailed = true;
    return false;
  }
}

export async function ensureWasmReady(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm();
  }
  return wasmInitPromise;
}

export function isWasmActive(): boolean {
  return wasmModule !== null;
}

export function detectRom(buffer: Uint8Array): RomInfo | null {
  if (!wasmModule) return null;
  try {
    return wasmModule.detectRom(buffer);
  } catch {
    return null;
  }
}

export function parseMap(
  buffer: Uint8Array,
  group: number,
  num: number
): FullMapData | null {
  if (!wasmModule) return null;
  try {
    return wasmModule.parseMap(buffer, group, num);
  } catch {
    return null;
  }
}

export function decodeTilesetPair(
  buffer: Uint8Array,
  primaryPtr: number,
  secondaryPtr: number
): DecodedMetatile[] | null {
  if (!wasmModule) return null;
  try {
    return wasmModule.decodeTilesetPair(buffer, primaryPtr, secondaryPtr);
  } catch {
    return null;
  }
}

export function decodeOverworldSprite(
  buffer: Uint8Array,
  graphicsId: number
): DecodedSprite | null {
  if (!wasmModule) return null;
  try {
    return wasmModule.decodeOverworldSprite(buffer, graphicsId);
  } catch {
    return null;
  }
}

export function getMapTable(buffer: Uint8Array): MapTableEntry[] | null {
  if (!wasmModule) return null;
  try {
    return wasmModule.getMapTable(buffer);
  } catch {
    return null;
  }
}

export function getWildEncounters(
  buffer: Uint8Array,
  group: number,
  num: number
): WildEncounters | null {
  if (!wasmModule) return null;
  try {
    return wasmModule.getWildEncounters(buffer, group, num);
  } catch {
    return null;
  }
}
