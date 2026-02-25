import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { createCipheriv, randomBytes } from "node:crypto";
import { join } from "node:path";

const KEY_HEX = process.env.WASM_ENCRYPTION_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  console.error("[encrypt-wasm] WASM_ENCRYPTION_KEY must be a 64-char hex string");
  process.exit(1);
}

const key = Buffer.from(KEY_HEX, "hex");

const WASM_DIR = join(process.cwd(), "public", "wasm");

async function encryptFile(filePath) {
  const data = await readFile(filePath);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const output = Buffer.concat([iv, encrypted, authTag]);
  const encPath = filePath + ".enc";
  await writeFile(encPath, output);
  await unlink(filePath);
  const savings = ((1 - output.length / data.length) * 100).toFixed(1);
  console.log(
    `  ${filePath.split(/[\\/]/).pop()} → .enc (${data.length} → ${output.length} bytes, ${savings}% overhead)`
  );
}

async function main() {
  console.log("[encrypt-wasm] Encrypting WASM binaries...");
  const files = await readdir(WASM_DIR);
  const wasmFiles = files.filter((f) => f.endsWith(".wasm"));

  if (wasmFiles.length === 0) {
    console.log("[encrypt-wasm] No .wasm files found — already encrypted?");
    return;
  }

  for (const file of wasmFiles) {
    await encryptFile(join(WASM_DIR, file));
  }

  console.log(`[encrypt-wasm] Done — ${wasmFiles.length} files encrypted.`);
}

main().catch((err) => {
  console.error("[encrypt-wasm] Fatal:", err);
  process.exit(1);
});
