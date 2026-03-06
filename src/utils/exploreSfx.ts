// Explore SFX — lightweight Web Audio oscillator-based sound effects

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  try {
    ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = "square"
) {
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

// Soft footstep — alternating pitch for walk cycle
let stepAlt = false;
export function playFootstep(isRunning: boolean) {
  stepAlt = !stepAlt;
  const freq = stepAlt ? 180 : 160;
  const vol = isRunning ? 0.06 : 0.04;
  playTone(freq, 0.05, vol, "triangle");
}

// Grass rustle
export function playGrassStep() {
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();

  // White noise burst for grass
  const bufferSize = ac.sampleRate * 0.06;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.03;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start();
}

// Bump into wall
export function playBump() {
  playTone(100, 0.08, 0.05, "square");
}

// Ledge jump
export function playLedgeJump() {
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(200, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(120, ac.currentTime + 0.15);
  gain.gain.setValueAtTime(0.06, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

// Warp / door enter
export function playWarp() {
  playTone(400, 0.06, 0.05, "sine");
  setTimeout(() => playTone(600, 0.08, 0.04, "sine"), 60);
}

// Encounter flash
export function playEncounterFlash() {
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();

  // Rising sweep
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(200, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.3);
  gain.gain.setValueAtTime(0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.4);
}
