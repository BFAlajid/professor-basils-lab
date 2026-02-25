let verified: boolean | null = null;

function isDev(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

export async function verifyIntegrity(): Promise<boolean> {
  if (isDev()) { verified = true; return true; }
  if (verified !== null) return verified;

  try {
    const res = await fetch("/integrity.json");
    if (!res.ok) { verified = false; return false; }

    const manifest = await res.json() as {
      files: Record<string, string>;
      signature: string;
    };

    const verifyKey = process.env.NEXT_PUBLIC_INTEGRITY_KEY;
    if (!verifyKey) { verified = false; return false; }

    const fileNames = Object.keys(manifest.files).sort();
    const payload = fileNames.map((f) => `${f}:${manifest.files[f]}`).join("|");

    const keyBytes = new Uint8Array(
      (verifyKey as string).match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );

    const sigBytes = new Uint8Array(
      manifest.signature.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );

    const valid = await crypto.subtle.verify(
      "HMAC", cryptoKey, sigBytes, new TextEncoder().encode(payload),
    );

    if (!valid) { verified = false; return false; }

    const checkFile = fileNames[Math.floor(Math.random() * fileNames.length)];
    const wasmRes = await fetch(`/wasm/${checkFile}`);
    if (!wasmRes.ok) { verified = false; return false; }

    const wasmData = await wasmRes.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", wasmData);
    const hashHex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    verified = hashHex === manifest.files[checkFile];
    return verified;
  } catch {
    verified = false;
    return false;
  }
}

export function isIntegrityValid(): boolean {
  if (isDev()) return true;
  return verified === true;
}
