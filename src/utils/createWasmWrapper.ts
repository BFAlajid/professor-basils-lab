export interface WasmWrapper<T> {
  ensureReady(): Promise<boolean>;
  isActive(): boolean;
  getModule(): T | null;
}

export function createWasmWrapper<T>(
  name: string,
  loadModule: () => Promise<T>,
): WasmWrapper<T> {
  let wasmModule: T | null = null;
  let wasmInitPromise: Promise<boolean> | null = null;
  let wasmFailed = false;

  async function initWasm(): Promise<boolean> {
    if (wasmModule) return true;
    if (wasmFailed) return false;

    try {
      wasmModule = await loadModule();
      return true;
    } catch (e) {
      console.warn(`[${name}] WASM init failed, using JS fallback:`, e);
      wasmFailed = true;
      return false;
    }
  }

  return {
    ensureReady(): Promise<boolean> {
      if (wasmModule) return Promise.resolve(true);
      if (wasmFailed) return Promise.resolve(false);
      if (!wasmInitPromise) {
        wasmInitPromise = initWasm();
      }
      return wasmInitPromise;
    },
    isActive(): boolean {
      return wasmModule !== null;
    },
    getModule(): T | null {
      return wasmModule;
    },
  };
}
