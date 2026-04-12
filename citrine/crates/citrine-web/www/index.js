// Citrine Phase 1 frontend.
//
// Loads the wasm-pack generated module from ../pkg, instantiates an
// `Emulator`, wires the UI controls, and renders register + memory +
// kernel-debug state.

import init, { Emulator, citrineLog } from "../pkg/citrine_web.js";

const REG_NAMES = [
  "r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7",
  "r8", "r9", "r10", "r11", "r12", "sp", "lr", "pc",
];

const els = {
  status: document.getElementById("status"),
  fileInput: document.getElementById("file-input"),
  homebrewInput: document.getElementById("homebrew-input"),
  baseAddr: document.getElementById("base-addr"),
  maxSteps: document.getElementById("max-steps"),
  btnLoad: document.getElementById("btn-load"),
  btnStep: document.getElementById("btn-step"),
  btnRun: document.getElementById("btn-run"),
  btnReset: document.getElementById("btn-reset"),
  btnLoadHomebrew: document.getElementById("btn-load-homebrew"),
  btnStepHle: document.getElementById("btn-step-hle"),
  btnRunHle: document.getElementById("btn-run-hle"),
  btnClearLog: document.getElementById("btn-clear-log"),
  btnMem: document.getElementById("btn-mem"),
  memBase: document.getElementById("mem-base"),
  memLen: document.getElementById("mem-len"),
  regs: document.getElementById("regs"),
  flags: document.getElementById("flags"),
  log: document.getElementById("log"),
  mem: document.getElementById("mem"),
  debugLog: document.getElementById("debug-log"),
  topCanvas: document.getElementById("top-canvas"),
  botCanvas: document.getElementById("bot-canvas"),
  btnVsync: document.getElementById("btn-vsync"),
  btnFrameLoop: document.getElementById("btn-frame-loop"),
  btnFillTest: document.getElementById("btn-fill-test"),
  frameCount: document.getElementById("frame-count"),
};

let topCtx = null;
let botCtx = null;
let frameLoopActive = false;
let frameLoopHandle = null;

let emu = null;
let loadedBytes = null;
let homebrewBytes = null;
let lastSnapshot = null;

function parseHex(input) {
  const s = input.trim();
  if (s.startsWith("0x") || s.startsWith("0X")) {
    return parseInt(s.slice(2), 16);
  }
  return parseInt(s, 10) | 0;
}

function formatHex(n, width = 8) {
  return "0x" + (n >>> 0).toString(16).padStart(width, "0");
}

function renderRegs() {
  if (!emu) return;
  const snap = emu.getRegisters();
  els.regs.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const div = document.createElement("div");
    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = REG_NAMES[i].padEnd(4);
    const valSpan = document.createElement("span");
    const changed = lastSnapshot && lastSnapshot[i] !== snap[i];
    valSpan.className = changed ? "val changed" : "val";
    valSpan.textContent = formatHex(snap[i]);
    div.appendChild(nameSpan);
    div.appendChild(valSpan);
    els.regs.appendChild(div);
  }

  const cpsr = snap[16];
  const n = (cpsr >>> 31) & 1;
  const z = (cpsr >>> 30) & 1;
  const c = (cpsr >>> 29) & 1;
  const v = (cpsr >>> 28) & 1;
  const mode = cpsr & 0x1F;
  els.flags.innerHTML = "";
  for (const [name, on] of [
    ["N", n],
    ["Z", z],
    ["C", c],
    ["V", v],
  ]) {
    const span = document.createElement("span");
    span.className = on ? "flag-on" : "";
    span.textContent = name + "=" + on;
    els.flags.appendChild(span);
  }
  const modeSpan = document.createElement("span");
  modeSpan.textContent = "mode=" + mode.toString(2).padStart(5, "0");
  els.flags.appendChild(modeSpan);
  const cpsrSpan = document.createElement("span");
  cpsrSpan.textContent = "cpsr=" + formatHex(cpsr);
  els.flags.appendChild(cpsrSpan);

  lastSnapshot = Array.from(snap);
}

function logStep(pc) {
  if (!emu) return;
  const line = emu.disassembleAt(pc);
  const div = document.createElement("div");
  div.className = "log-entry";
  div.textContent = line;
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
  citrineLog("[citrine] " + line);
}

function renderMemory() {
  if (!emu) return;
  const base = parseHex(els.memBase.value) >>> 0;
  const len = Math.max(1, Math.min(4096, parseInt(els.memLen.value, 10) || 16));
  const bytes = emu.getMemoryRange(base, len);
  let out = "";
  for (let i = 0; i < bytes.length; i += 16) {
    const addr = (base + i) >>> 0;
    const row = [];
    const ascii = [];
    for (let j = 0; j < 16 && i + j < bytes.length; j++) {
      const b = bytes[i + j];
      row.push(b.toString(16).padStart(2, "0"));
      ascii.push(b >= 32 && b < 127 ? String.fromCharCode(b) : ".");
    }
    out +=
      formatHex(addr) +
      "  " +
      row.join(" ").padEnd(16 * 3 - 1) +
      "  |" +
      ascii.join("") +
      "|\n";
  }
  els.mem.textContent = out;
}

function renderDebugLog() {
  if (!emu) return;
  els.debugLog.textContent = emu.debugLog();
}

async function handleFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  loadedBytes = new Uint8Array(buf);
  els.status.textContent = `loaded ${loadedBytes.length} bytes`;
  els.btnLoad.disabled = false;
}

async function handleHomebrew(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  homebrewBytes = new Uint8Array(buf);
  els.status.textContent = `loaded ${homebrewBytes.length} bytes (.3dsx)`;
  els.btnLoadHomebrew.disabled = false;
}

function doLoad() {
  if (!emu || !loadedBytes) return;
  const base = parseHex(els.baseAddr.value) >>> 0;
  emu.loadFlatBinary(base, loadedBytes);
  els.log.innerHTML = "";
  lastSnapshot = null;
  renderRegs();
  renderMemory();
  els.btnStep.disabled = false;
  els.btnRun.disabled = false;
  els.btnReset.disabled = false;
  els.status.textContent = `reset to PC=${formatHex(base)}`;
}

function doLoadHomebrew() {
  if (!emu || !homebrewBytes) return;
  // Default base address: 0x00100000 (devkitARM convention).
  try {
    emu.loadHomebrew(0x00100000, homebrewBytes);
    els.log.innerHTML = "";
    lastSnapshot = null;
    els.btnStepHle.disabled = false;
    els.btnRunHle.disabled = false;
    els.btnStep.disabled = false;
    els.btnRun.disabled = false;
    els.btnReset.disabled = false;
    els.status.textContent = "homebrew loaded — Step HLE or Run HLE";
    renderRegs();
    renderMemory();
    renderDebugLog();
  } catch (err) {
    els.status.textContent = "load failed: " + err;
  }
}

function doStep() {
  if (!emu) return;
  const pcBefore = emu.getRegisters()[15];
  emu.step();
  logStep(pcBefore);
  renderRegs();
  renderMemory();
}

function doRun() {
  if (!emu) return;
  const maxSteps = Math.max(1, parseInt(els.maxSteps.value, 10) || 1);
  const pcBefore = emu.getRegisters()[15];
  const n = emu.run(maxSteps);
  logStep(pcBefore);
  const line = document.createElement("div");
  line.className = "log-entry";
  line.textContent = `…ran ${n} instructions (cycles=${emu.cycles()})`;
  els.log.appendChild(line);
  renderRegs();
  renderMemory();
}

function doStepHle() {
  if (!emu) return;
  const pcBefore = emu.getRegisters()[15];
  emu.stepHle();
  logStep(pcBefore);
  renderRegs();
  renderMemory();
  renderDebugLog();
}

function doRunHle() {
  if (!emu) return;
  const maxSteps = Math.max(1, parseInt(els.maxSteps.value, 10) || 1);
  const pcBefore = emu.getRegisters()[15];
  const n = emu.runHle(maxSteps);
  logStep(pcBefore);
  const line = document.createElement("div");
  line.className = "log-entry";
  line.textContent = `…ran ${n} HLE instructions (cycles=${emu.cycles()})`;
  els.log.appendChild(line);
  renderRegs();
  renderMemory();
  renderDebugLog();
}

function doReset() {
  if (!emu) return;
  const base = parseHex(els.baseAddr.value) >>> 0;
  emu.resetPc(base);
  els.log.innerHTML = "";
  lastSnapshot = null;
  renderRegs();
}

function doClearLog() {
  if (!emu) return;
  emu.clearDebugLog();
  renderDebugLog();
}

function setupCanvases() {
  topCtx = els.topCanvas.getContext("2d");
  botCtx = els.botCanvas.getContext("2d");
}

function blitFrame() {
  if (!emu || !topCtx || !botCtx) return;
  const frame = Number(emu.vsync());
  els.frameCount.textContent = frame.toString();

  const topBytes = emu.renderTop();
  const topImage = new ImageData(new Uint8ClampedArray(topBytes), 400, 240);
  topCtx.putImageData(topImage, 0, 0);

  const botBytes = emu.renderBottom();
  const botImage = new ImageData(new Uint8ClampedArray(botBytes), 320, 240);
  botCtx.putImageData(botImage, 0, 0);
}

function doVsync() {
  blitFrame();
}

function doFrameLoop() {
  if (frameLoopActive) {
    frameLoopActive = false;
    els.btnFrameLoop.textContent = "Start frame loop";
    if (frameLoopHandle !== null) {
      cancelAnimationFrame(frameLoopHandle);
      frameLoopHandle = null;
    }
    return;
  }
  frameLoopActive = true;
  els.btnFrameLoop.textContent = "Stop frame loop";
  function tick() {
    if (!frameLoopActive) return;
    blitFrame();
    frameLoopHandle = requestAnimationFrame(tick);
  }
  tick();
}

function doFillTestPattern() {
  if (!emu) return;
  // 400x240 RGB565 column-major source. Fill with a gradient by writing
  // 240*400 16-bit pixels (192,000 bytes).
  const w = 400, h = 240;
  const bytes = new Uint8Array(w * h * 2);
  for (let col = 0; col < w; col++) {
    for (let row = 0; row < h; row++) {
      // Column-major: column 0 first, then column 1, ...
      const off = (col * h + row) * 2;
      // RGB565: R from column, G from row, B fixed.
      const r = Math.floor(col * 31 / w) & 0x1F;
      const g = Math.floor(row * 63 / h) & 0x3F;
      const b = 15;
      const px = (r << 11) | (g << 5) | b;
      bytes[off] = px & 0xFF;
      bytes[off + 1] = (px >> 8) & 0xFF;
    }
  }
  // Upload to VRAM at offset 0 (so address = 0x18000000) and configure top FB.
  emu.pokeVram(0, bytes);
  emu.setTopFramebuffer(0x18000000, h * 2, 2 /* RGB565 */);

  // Bottom screen: solid green — fill with 0x07E0.
  const bw = 320, bh = 240;
  const bbytes = new Uint8Array(bw * bh * 2);
  for (let i = 0; i < bbytes.length; i += 2) {
    bbytes[i] = 0xE0;
    bbytes[i + 1] = 0x07;
  }
  // Place immediately after the top buffer.
  const botOffset = w * h * 2;
  emu.pokeVram(botOffset, bbytes);
  emu.setBottomFramebuffer(0x18000000 + botOffset, bh * 2, 2 /* RGB565 */);

  blitFrame();
  els.status.textContent = "test pattern uploaded — Vsync to refresh";
}

async function main() {
  await init();
  emu = new Emulator();
  els.status.textContent = "wasm ready — load a .bin or .3dsx file";
  renderRegs();
  renderMemory();
  renderDebugLog();
  setupCanvases();

  els.fileInput.addEventListener("change", handleFile);
  els.homebrewInput.addEventListener("change", handleHomebrew);
  els.btnLoad.addEventListener("click", doLoad);
  els.btnLoadHomebrew.addEventListener("click", doLoadHomebrew);
  els.btnStep.addEventListener("click", doStep);
  els.btnRun.addEventListener("click", doRun);
  els.btnStepHle.addEventListener("click", doStepHle);
  els.btnRunHle.addEventListener("click", doRunHle);
  els.btnReset.addEventListener("click", doReset);
  els.btnMem.addEventListener("click", renderMemory);
  els.btnClearLog.addEventListener("click", doClearLog);
  els.btnVsync.addEventListener("click", doVsync);
  els.btnFrameLoop.addEventListener("click", doFrameLoop);
  els.btnFillTest.addEventListener("click", doFillTestPattern);
  blitFrame(); // initial black frame
}

main().catch((err) => {
  els.status.textContent = "wasm init failed: " + err;
  console.error(err);
});
