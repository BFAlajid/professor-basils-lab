import { isHeartbeatValid } from "./heartbeat";
import { isTampered } from "./tamperDetect";

let cachedKey: CryptoKey | null = null;
let keyPromise: Promise<CryptoKey | null> | null = null;

// Bypass Turbopack's module-scoped import() patching by calling import() from the global scope.
// new Function() creates a function outside of any module wrapper.
const nativeImport = new Function("u", "return import(u)") as (url: string) => Promise<Record<string, unknown>>;

export function loadESModule(url: string): Promise<Record<string, unknown>> {
  return nativeImport(url);
}

function isDev(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

async function fetchDecryptionKey(): Promise<CryptoKey | null> {
  try {
    const res = await fetch("/api/wasm-key");
    if (!res.ok) return null;
    const { key } = await res.json();
    const bytes = new Uint8Array((key as string).match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
    return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["decrypt"]);
  } catch {
    return null;
  }
}

function getKey(): Promise<CryptoKey | null> {
  if (cachedKey) return Promise.resolve(cachedKey);
  if (!keyPromise) {
    keyPromise = fetchDecryptionKey().then((k) => {
      cachedKey = k;
      return k;
    });
  }
  return keyPromise;
}

export async function loadWasmModule(wasmPath: string): Promise<ArrayBuffer | string> {
  if (isDev()) return wasmPath;

  if (!isHeartbeatValid() || isTampered()) throw new Error("Unauthorized");

  const [key, encRes] = await Promise.all([
    getKey(),
    fetch(wasmPath + ".enc"),
  ]);

  if (!key || !encRes.ok) throw new Error("WASM load failed");

  const encData = await encRes.arrayBuffer();
  const iv = new Uint8Array(encData.slice(0, 12));
  const ciphertext = encData.slice(12);

  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}
