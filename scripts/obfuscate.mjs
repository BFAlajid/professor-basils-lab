import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

let obfuscate;
try {
  const mod = await import("javascript-obfuscator");
  obfuscate = mod.default?.obfuscate ?? mod.obfuscate;
} catch {
  console.warn("[obfuscate] javascript-obfuscator not installed — skipping.");
  console.warn("  Install with: npm install -D javascript-obfuscator");
  process.exit(0);
}

const SKIP_PATTERNS = [
  /^webpack/,
  /^framework/,
  /^polyfills/,
  /^main-app/,
  /^layout/,
  /^_app/,
  /^_document/,
  /^_error/,
  /pkmn_.*\.js$/,
  /gen3_parser\.js$/,
];

const MIN_SIZE = 1024;
const MAX_SIZE = 2 * 1024 * 1024;

const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.3,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.5,
  selfDefending: true,
  transformObjectKeys: true,
  splitStrings: false,
  identifierNamesGenerator: "hexadecimal",
};

async function collectJsFiles(dir) {
  const results = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectJsFiles(full));
    } else if (entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  console.log("[obfuscate] Obfuscating application chunks...");

  const chunksDir = join(process.cwd(), ".next", "static", "chunks");
  const jsFiles = await collectJsFiles(chunksDir);

  let processed = 0;
  let skipped = 0;

  for (const filePath of jsFiles) {
    const fileName = filePath.split(/[\\/]/).pop();

    if (SKIP_PATTERNS.some((p) => p.test(fileName))) {
      skipped++;
      continue;
    }

    const info = await stat(filePath);
    if (info.size < MIN_SIZE || info.size > MAX_SIZE) {
      skipped++;
      continue;
    }

    try {
      const code = await readFile(filePath, "utf-8");
      const result = obfuscate(code, OBFUSCATION_OPTIONS);
      await writeFile(filePath, result.getObfuscatedCode());
      processed++;
      const newSize = (await stat(filePath)).size;
      const ratio = ((newSize / info.size) * 100).toFixed(0);
      console.log(`  ${fileName}: ${info.size} → ${newSize} bytes (${ratio}%)`);
    } catch (e) {
      console.warn(`  Skipping ${fileName}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`[obfuscate] Done — ${processed} obfuscated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("[obfuscate] Fatal:", err);
  process.exit(1);
});
