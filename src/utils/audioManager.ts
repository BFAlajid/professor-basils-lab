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

// Uses HTMLAudioElement for playback (native codec support — FLAC works on Safari)
// piped through Web Audio API GainNode for volume control.
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentMediaSource: MediaElementAudioSourceNode | null = null;
let currentTrack: AudioTrack | null = null;
let isPlaying = false;
let volume = 0.3;
let isMuted = false;

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

function stopCurrent() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio.load();
  }
  if (currentMediaSource) {
    try { currentMediaSource.disconnect(); } catch { /* already disconnected */ }
    currentMediaSource = null;
  }
  currentAudio = null;
}

function startPlayback(url: string, offset: number = 0) {
  const ctx = ensureContext();
  if (ctx.state === "suspended") ctx.resume();

  stopCurrent();

  const audio = new Audio(url);
  audio.loop = true;
  audio.currentTime = offset;

  const source = ctx.createMediaElementSource(audio);
  source.connect(gainNode!);

  audio.play().catch(() => {
    // Autoplay blocked — will play on next user gesture
  });

  currentAudio = audio;
  currentMediaSource = source;
}

export function playTrack(track: AudioTrack): void {
  if (typeof window === "undefined") return;
  if (currentTrack === track && isPlaying) return;

  // Resume context synchronously in user gesture (Safari requirement)
  const ctx = ensureContext();
  if (ctx.state === "suspended") ctx.resume();

  currentTrack = track;
  isPlaying = true;
  notify();

  startPlayback(trackSources[track], 0);
}

export function stopTrack(): void {
  stopCurrent();
  isPlaying = false;
  currentTrack = null;
  notify();
}

export function pauseTrack(): void {
  if (currentAudio && isPlaying) {
    currentAudio.pause();
  }
  isPlaying = false;
  notify();
}

export function resumeTrack(): void {
  if (!currentTrack || isPlaying) return;

  const ctx = ensureContext();
  if (ctx.state === "suspended") ctx.resume();

  if (currentAudio) {
    currentAudio.play().catch(() => {});
  } else {
    startPlayback(trackSources[currentTrack], 0);
  }
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
