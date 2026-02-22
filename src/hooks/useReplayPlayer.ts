"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { BattleState, BattleReplay } from "@/types";

type PlaybackSpeed = 1 | 2 | 4;

export function useReplayPlayer(replay: BattleReplay | null) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const snapshots = replay?.snapshots ?? [];
  const currentState: BattleState | null = snapshots[currentIndex]?.state ?? null;
  const totalSnapshots = snapshots.length;
  const isAtEnd = currentIndex >= totalSnapshots - 1;
  const isAtStart = currentIndex === 0;

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && !isAtEnd) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalSnapshots - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / speed);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isAtEnd, totalSnapshots, speed]);

  // Stop playing when reaching end
  useEffect(() => {
    if (isAtEnd && isPlaying) {
      setIsPlaying(false);
    }
  }, [isAtEnd, isPlaying]);

  // Reset when replay changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [replay?.id]);

  const play = useCallback(() => {
    if (isAtEnd) setCurrentIndex(0);
    setIsPlaying(true);
  }, [isAtEnd]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(prev + 1, totalSnapshots - 1));
  }, [totalSnapshots]);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const seekTo = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentIndex(Math.max(0, Math.min(index, totalSnapshots - 1)));
  }, [totalSnapshots]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  }, []);

  return {
    currentState,
    currentIndex,
    totalSnapshots,
    isPlaying,
    isAtEnd,
    isAtStart,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    seekTo,
    setSpeed,
    cycleSpeed,
    reset,
  };
}
