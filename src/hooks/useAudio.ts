"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AudioTrack,
  AudioManagerState,
  getState,
  subscribe,
  playTrack,
  stopTrack,
  pauseTrack,
  resumeTrack,
  setVolume,
  setMuted,
  loadCustomTrack,
  hasCustomTrack,
} from "@/utils/audioManager";

export function useAudio() {
  const [audioState, setAudioState] = useState<AudioManagerState>(getState);

  useEffect(() => {
    return subscribe(() => setAudioState(getState()));
  }, []);

  const play = useCallback((track: AudioTrack) => playTrack(track), []);
  const stop = useCallback(() => stopTrack(), []);
  const pause = useCallback(() => pauseTrack(), []);
  const resume = useCallback(() => resumeTrack(), []);
  const volume = useCallback((v: number) => setVolume(v), []);
  const mute = useCallback((m: boolean) => setMuted(m), []);
  const upload = useCallback((track: AudioTrack, file: File) => loadCustomTrack(track, file), []);
  const hasCustom = useCallback((track: AudioTrack) => hasCustomTrack(track), []);

  return {
    ...audioState,
    play,
    stop,
    pause,
    resume,
    setVolume: volume,
    setMuted: mute,
    loadCustomTrack: upload,
    hasCustomTrack: hasCustom,
  };
}
