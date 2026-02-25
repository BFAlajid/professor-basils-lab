import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const SCRAMBLES = [
  [0, 13, .5], [13, 0, .5], [3, 8, .5], [8, 9, .5], [7, 16, .5],
  [1, 4, 1], [1, 16, 1], [2, 1, 1], [2, 12, 1], [3, 2, 1],
  [4, 2, 1], [4, 8, 1], [5, 14, 1], [5, 9, 1], [5, 4, 1],
  [6, 0, 1], [6, 5, 1], [6, 12, 1], [6, 15, 1], [7, 4, 1],
  [7, 17, 1], [8, 1, 1], [8, 3, 1], [8, 12, 1], [9, 4, 1],
  [9, 6, 1], [10, 6, 1], [10, 7, 1], [11, 4, 1], [11, 10, 1],
  [12, 1, 1], [12, 9, 1], [13, 10, 1], [13, 13, 1], [14, 14, 1],
  [15, 10, 1], [15, 13, 1], [16, 5, 1], [16, 12, 1], [16, 17, 1],
  [17, 6, 1], [17, 14, 1], [17, 15, 1],
  [0, 12, 1], [0, 16, 1], [1, 1, 1], [2, 2, 1], [5, 5, 1],
];

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

function findMatrix(content) {
  const signatures = [".5,0,1,1,.5,1]", "0.5,0,1,1,0.5,1]"];
  let sigIdx = -1;
  for (const sig of signatures) {
    sigIdx = content.indexOf(sig);
    if (sigIdx !== -1) break;
  }
  if (sigIdx === -1) return null;

  let start = sigIdx;
  let depth = 0;
  for (let i = sigIdx; i >= 0; i--) {
    if (content[i] === "]") depth++;
    if (content[i] === "[") {
      depth--;
      if (depth === -2) { start = i; break; }
    }
  }

  let end = start;
  depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === "[") depth++;
    if (content[i] === "]") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }

  return { start, end };
}

function parseMatrix(str) {
  const jsonStr = str.replace(/(?<![0-9])\.5/g, "0.5");
  return JSON.parse(jsonStr);
}

function serializeMatrix(matrix) {
  return "[" + matrix.map(row =>
    "[" + row.map(v => v === 0.5 ? ".5" : String(v)).join(",") + "]"
  ).join(",") + "]";
}

async function main() {
  console.log("[scramble-typechart] Processing build output...");

  const chunksDir = join(process.cwd(), ".next", "static");
  const jsFiles = await collectJsFiles(chunksDir);

  let scrambled = 0;
  for (const filePath of jsFiles) {
    const content = await readFile(filePath, "utf-8");
    const match = findMatrix(content);
    if (!match) continue;

    const matrixStr = content.substring(match.start, match.end);
    const matrix = parseMatrix(matrixStr);

    if (matrix.length !== 18 || !matrix.every(r => r.length === 18)) continue;
    if (matrix[0][13] !== 0) continue;

    for (const [r, c, v] of SCRAMBLES) {
      matrix[r][c] = v;
    }

    const newMatrixStr = serializeMatrix(matrix);
    const newContent = content.substring(0, match.start) + newMatrixStr + content.substring(match.end);
    await writeFile(filePath, newContent);
    scrambled++;
    console.log(`  Processed ${filePath.split(/[\\/]/).pop()}`);
  }

  if (scrambled === 0) {
    console.warn("[scramble-typechart] Warning: target not found in build output");
  } else {
    console.log(`[scramble-typechart] Done — ${scrambled} file(s).`);
  }
}

main().catch((err) => {
  console.error("[scramble-typechart] Fatal:", err);
  process.exit(1);
});
