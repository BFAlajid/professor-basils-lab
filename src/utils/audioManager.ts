export type AudioTrack =
  | "teamBuilder"
  | "battle"
  | "victory"
  | "defeat"
  | "encounter"
  | "map"
  | "gymLeader"
  | "champion"
  | "surf"
  | "pokemonCenter"
  | "catchSuccess";

export interface AudioManagerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}

const DEFAULT_TRACKS: Record<AudioTrack, string> = {
  teamBuilder: "/audio/team-builder.flac",
  battle: "/audio/battle.flac",
  victory: "/audio/victory.flac",
  defeat: "/audio/defeat.flac",
  encounter: "/audio/encounter.flac",
  map: "/audio/map.flac",
  gymLeader: "/audio/gym-leader.flac",
  champion: "/audio/champion.flac",
  surf: "/audio/surf.flac",
  pokemonCenter: "/audio/pokemon-center.flac",
  catchSuccess: "/audio/catch-success.flac",
};

// Web Audio API state
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentTrack: AudioTrack | null = null;
let isPlaying = false;
let volume = 0.3;
let isMuted = false;
let pauseOffset = 0;
let trackStartTime = 0;

// Cache decoded audio buffers to avoid re-decoding
const bufferCache = new Map<string, AudioBuffer>();
const trackSources: Record<AudioTrack, string> = { ...DEFAULT_TRACKS };
const customBlobUrls = new Map<AudioTrack, string>();
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

function ensureContext(): AudioContext {
  if (!audioContext && typeof window !== "undefined") {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.gain.value = isMuted ? 0 : volume;
    gainNode.connect(audioContext.destination);
  }
  return audioContext!;
}

async function fetchAndDecode(url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const ctx = ensureContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  bufferCache.set(url, audioBuffer);
  return audioBuffer;
}

function stopCurrentSource() {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // already stopped
    }
    currentSource.disconnect();
    currentSource = null;
  }
}

function startSourceFromBuffer(buffer: AudioBuffer, offset: number = 0) {
  const ctx = ensureContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  stopCurrentSource();

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gainNode!);
  source.start(0, offset);

  currentSource = source;
  trackStartTime = ctx.currentTime - offset;
}

export function playTrack(track: AudioTrack): void {
  if (typeof window === "undefined") return;

  // If already playing the same track, don't restart
  if (currentTrack === track && isPlaying) return;

  const url = trackSources[track];
  const cached = bufferCache.get(url);

  // Fast path: buffer already decoded — start immediately
  if (cached) {
    const ctx = ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    currentTrack = track;
    pauseOffset = 0;
    startSourceFromBuffer(cached, 0);
    isPlaying = true;
    notify();
    return;
  }

  // Slow path: fetch + decode, then start
  currentTrack = track;
  isPlaying = true;
  notify();

  fetchAndDecode(url).then((buffer) => {
    // Only start if still the same track (user may have stopped/switched)
    if (currentTrack !== track) return;
    const ctx = ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    pauseOffset = 0;
    startSourceFromBuffer(buffer, 0);
  }).catch(() => {
    if (currentTrack === track) {
      isPlaying = false;
      notify();
    }
  });
}

export function stopTrack(): void {
  stopCurrentSource();
  isPlaying = false;
  currentTrack = null;
  pauseOffset = 0;
  notify();
}

export function pauseTrack(): void {
  if (currentSource && audioContext && isPlaying) {
    pauseOffset = (audioContext.currentTime - trackStartTime) % (currentSource.buffer?.duration ?? 1);
    stopCurrentSource();
  }
  isPlaying = false;
  notify();
}

export function resumeTrack(): void {
  if (!currentTrack || isPlaying) return;

  const url = trackSources[currentTrack];
  const buffer = bufferCache.get(url);
  if (!buffer) return;

  startSourceFromBuffer(buffer, pauseOffset);
  isPlaying = true;
  notify();
}

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (gainNode) {
    gainNode.gain.value = isMuted ? 0 : volume;
  }
  notify();
}

export function setMuted(m: boolean): void {
  isMuted = m;
  if (gainNode) {
    gainNode.gain.value = m ? 0 : volume;
  }
  notify();
}

export function loadCustomTrack(track: AudioTrack, file: File): void {
  const oldBlob = customBlobUrls.get(track);
  if (oldBlob) URL.revokeObjectURL(oldBlob);

  const blobUrl = URL.createObjectURL(file);
  customBlobUrls.set(track, blobUrl);
  trackSources[track] = blobUrl;
  bufferCache.delete(blobUrl);

  // If this track is currently playing, restart with new source
  if (currentTrack === track) {
    isPlaying = false;
    playTrack(track);
  }
  notify();
}

export function hasCustomTrack(track: AudioTrack): boolean {
  return trackSources[track] !== DEFAULT_TRACKS[track];
}

export function getState(): AudioManagerState {
  return {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
  };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
