import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHmac, createHash } from "node:crypto";
import { join } from "node:path";

const HMAC_KEY = process.env.INTEGRITY_PRIVATE_KEY;
if (!HMAC_KEY) {
  console.error("[sign-manifest] INTEGRITY_PRIVATE_KEY not set");
  process.exit(1);
}

const WASM_DIR = join(process.cwd(), "public", "wasm");
const OUTPUT = join(process.cwd(), "public", "integrity.json");

async function main() {
  console.log("[sign-manifest] Generating integrity manifest...");

  const files = await readdir(WASM_DIR);
  const encFiles = files.filter((f) => f.endsWith(".wasm.enc")).sort();

  if (encFiles.length === 0) {
    console.warn("[sign-manifest] No .wasm.enc files found — run encrypt-wasm first");
    process.exit(1);
  }

  const hashes = {};
  for (const file of encFiles) {
    const data = await readFile(join(WASM_DIR, file));
    const hash = createHash("sha256").update(data).digest("hex");
    hashes[file] = hash;
    console.log(`  ${file}: ${hash.substring(0, 16)}...`);
  }

  const payload = encFiles.map((f) => `${f}:${hashes[f]}`).join("|");
  const signature = createHmac("sha256", Buffer.from(HMAC_KEY, "hex"))
    .update(payload)
    .digest("hex");

  const manifest = {
    files: hashes,
    signature,
    timestamp: Date.now(),
  };

  await writeFile(OUTPUT, JSON.stringify(manifest));
  console.log(`[sign-manifest] Done — ${encFiles.length} files, signature: ${signature.substring(0, 16)}...`);
}

main().catch((err) => {
  console.error("[sign-manifest] Fatal:", err);
  process.exit(1);
});
