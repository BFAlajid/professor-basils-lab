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

export async function playTrack(track: AudioTrack): Promise<void> {
  if (typeof window === "undefined") return;

  // If already playing the same track, don't restart
  if (currentTrack === track && isPlaying) return;

  try {
    const ctx = ensureContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const url = trackSources[track];
    const buffer = await fetchAndDecode(url);

    currentTrack = track;
    pauseOffset = 0;
    startSourceFromBuffer(buffer, 0);

    isPlaying = true;
    notify();
  } catch {
    // Failed to load/play — file may not exist
    isPlaying = false;
    notify();
  }
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

export async function resumeTrack(): Promise<void> {
  if (!currentTrack || isPlaying) return;

  try {
    const url = trackSources[currentTrack];
    const buffer = await fetchAndDecode(url);
    startSourceFromBuffer(buffer, pauseOffset);
    isPlaying = true;
    notify();
  } catch {
    // ignore
  }
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

export async function loadCustomTrack(track: AudioTrack, file: File): Promise<void> {
  // Revoke old custom blob URL
  const oldBlob = customBlobUrls.get(track);
  if (oldBlob) {
    URL.revokeObjectURL(oldBlob);
  }

  const blobUrl = URL.createObjectURL(file);
  customBlobUrls.set(track, blobUrl);
  trackSources[track] = blobUrl;

  // Clear cached buffer for this track so it re-decodes
  bufferCache.delete(blobUrl);

  // If this track is currently playing, restart with new source
  if (currentTrack === track) {
    isPlaying = false;
    await playTrack(track);
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
