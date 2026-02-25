/**
 * WASM-powered Gen 3 save parser with JS fallback.
 *
 * Loads the Rust-compiled WASM module on first use. If WASM fails to
 * initialize (e.g. server-side rendering, missing file), falls back
 * to the pure TypeScript implementation transparently.
 */

import type { Gen3SaveData } from "./gen3SaveParser";
import { parseGen3Save as parseGen3SaveJS } from "./gen3SaveParser";

let wasmModule: {
  parseGen3Save: (buffer: Uint8Array) => Gen3SaveData | null;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    // Dynamic import of the wasm-bindgen generated JS glue
    // @ts-ignore — WASM pkg only exists locally after wasm-pack build
    const mod = await import("../../rust/gen3-parser/pkg/gen3_parser.js");
    // Initialize the WASM module by fetching the binary from public/
    await mod.default("/wasm/gen3_parser_bg.wasm");
    wasmModule = {
      parseGen3Save: mod.parseGen3Save,
    };
    return true;
  } catch (e) {
    console.warn("[gen3-parser] WASM init failed, using JS fallback:", e);
    wasmFailed = true;
    return false;
  }
}

/**
 * Ensure WASM is initialized. Call this early (e.g. on component mount)
 * to avoid latency on first parse.
 */
export async function ensureWasmReady(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm();
  }
  return wasmInitPromise;
}

/**
 * Parse a Gen 3 save file. Uses WASM if available, otherwise falls back to JS.
 */
export async function parseGen3SaveWasm(
  buffer: ArrayBuffer
): Promise<Gen3SaveData | null> {
  await ensureWasmReady();

  if (wasmModule) {
    try {
      const data = new Uint8Array(buffer);
      return wasmModule.parseGen3Save(data);
    } catch (e) {
      console.warn("[gen3-parser] WASM parse failed, falling back to JS:", e);
    }
  }

  // Fallback to pure TypeScript implementation
  return parseGen3SaveJS(buffer);
}

/** Whether the WASM module is currently loaded and active. */
export function isWasmActive(): boolean {
  return wasmModule !== null;
}
