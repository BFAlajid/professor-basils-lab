"use client";

import { useRef, useCallback } from "react";
import { BattleState, BattleReplay, ReplaySnapshot } from "@/types";

const STORAGE_KEY = "pokemon-battle-replays";
const MAX_REPLAYS = 10;

export function useReplayRecorder() {
  const snapshotsRef = useRef<ReplaySnapshot[]>([]);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback((initialState: BattleState) => {
    snapshotsRef.current = [{
      turn: 0,
      state: structuredClone(initialState),
    }];
    isRecordingRef.current = true;
  }, []);

  const recordSnapshot = useCallback((state: BattleState) => {
    if (!isRecordingRef.current) return;
    snapshotsRef.current.push({
      turn: state.turn,
      state: structuredClone(state),
    });
  }, []);

  const stopRecording = useCallback((): ReplaySnapshot[] => {
    isRecordingRef.current = false;
    return snapshotsRef.current;
  }, []);

  const saveReplay = useCallback((state: BattleState): BattleReplay | null => {
    const snapshots = stopRecording();
    if (snapshots.length < 2) return null;

    const replay: BattleReplay = {
      id: `replay-${Date.now()}`,
      date: new Date().toISOString(),
      player1TeamNames: state.player1.pokemon.map((p) => p.slot.pokemon.name),
      player2TeamNames: state.player2.pokemon.map((p) => p.slot.pokemon.name),
      winner: state.winner,
      mode: state.mode,
      totalTurns: state.turn,
      snapshots,
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: BattleReplay[] = raw ? JSON.parse(raw) : [];
      const updated = [replay, ...existing].slice(0, MAX_REPLAYS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage full — still return the replay
    }

    return replay;
  }, [stopRecording]);

  const loadReplays = useCallback((): BattleReplay[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const deleteReplay = useCallback((id: string) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: BattleReplay[] = raw ? JSON.parse(raw) : [];
      const updated = existing.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  return {
    startRecording,
    recordSnapshot,
    saveReplay,
    loadReplays,
    deleteReplay,
  };
}
