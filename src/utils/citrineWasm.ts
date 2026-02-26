import { loadWasmModule } from "./wasmLoader";

let wasmModule: {
  citrine_create: () => number;
  citrine_destroy: (h: number) => void;
  citrine_load_3dsx: (h: number, data: Uint8Array) => boolean;
  citrine_run_frame: (h: number) => void;
  citrine_set_buttons: (h: number, btns: number) => void;
  citrine_get_fb_top: (h: number) => Uint8Array;
  citrine_get_fb_bottom: (h: number) => Uint8Array;
  citrine_reset: (h: number) => void;
  citrine_get_debug_info: (h: number) => string;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    // @ts-ignore — WASM pkg only exists locally after wasm-pack build
    const mod = await import(/* webpackIgnore: true */ "../../rust/citrine/pkg/citrine.js");
    const wasmInput = await loadWasmModule("/wasm/citrine_bg.wasm");
    await mod.default(wasmInput);
    wasmModule = {
      citrine_create: mod.citrine_create,
      citrine_destroy: mod.citrine_destroy,
      citrine_load_3dsx: mod.citrine_load_3dsx,
      citrine_run_frame: mod.citrine_run_frame,
      citrine_set_buttons: mod.citrine_set_buttons,
      citrine_get_fb_top: mod.citrine_get_fb_top,
      citrine_get_fb_bottom: mod.citrine_get_fb_bottom,
      citrine_reset: mod.citrine_reset,
      citrine_get_debug_info: mod.citrine_get_debug_info,
    };
    return true;
  } catch (e) {
    console.warn("[citrine] WASM init failed:", e);
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

export function getWasm() {
  return wasmModule;
}
