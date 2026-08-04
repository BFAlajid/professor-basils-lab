"use client";

import { useRef, useCallback } from "react";
import { BattleState, BattleLogEntry, BattleReplay, ReplaySnapshot } from "@/types";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/utils/persistence";

const MAX_REPLAYS = 10;

export function useReplayRecorder() {
  const snapshotsRef = useRef<ReplaySnapshot[]>([]);
  const isRecordingRef = useRef(false);

  // Accumulates the full battle log independent of each BattleState's own
  // `log` field, which battleReducer caps at 200 entries for the live UI (see
  // capLog in battleReducer.ts). A snapshot's capped log always keeps the
  // MOST RECENT entries, so the newest turn's messages are never dropped —
  // only entries "older than lastRecordedTurn" ever go missing from a given
  // snapshot, and by definition those were already appended here on a prior
  // call. Filtering each snapshot's log by `entry.turn > lastRecordedTurn`
  // therefore reconstructs the complete, untruncated history.
  const fullLogRef = useRef<BattleLogEntry[]>([]);
  const lastRecordedTurnRef = useRef(0);

  const startRecording = useCallback((initialState: BattleState) => {
    snapshotsRef.current = [{
      turn: 0,
      state: structuredClone(initialState),
    }];
    fullLogRef.current = [...initialState.log];
    lastRecordedTurnRef.current = initialState.turn;
    isRecordingRef.current = true;
  }, []);

  const recordSnapshot = useCallback((state: BattleState) => {
    if (!isRecordingRef.current) return;
    const newEntries = state.log.filter((entry) => entry.turn > lastRecordedTurnRef.current);
    fullLogRef.current.push(...newEntries);
    lastRecordedTurnRef.current = state.turn;
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
      fullLog: fullLogRef.current,
    };

    const existing = readStorage<BattleReplay[]>(STORAGE_KEYS.battleReplays, []);
    const updated = [replay, ...existing].slice(0, MAX_REPLAYS);
    writeStorage(STORAGE_KEYS.battleReplays, updated);

    return replay;
  }, [stopRecording]);

  const loadReplays = useCallback((): BattleReplay[] => {
    return readStorage<BattleReplay[]>(STORAGE_KEYS.battleReplays, []);
  }, []);

  const clearRecording = useCallback(() => {
    snapshotsRef.current = [];
    fullLogRef.current = [];
    lastRecordedTurnRef.current = 0;
    isRecordingRef.current = false;
  }, []);

  const deleteReplay = useCallback((id: string) => {
    const existing = readStorage<BattleReplay[]>(STORAGE_KEYS.battleReplays, []);
    const updated = existing.filter((r) => r.id !== id);
    writeStorage(STORAGE_KEYS.battleReplays, updated);
  }, []);

  return {
    startRecording,
    recordSnapshot,
    clearRecording,
    saveReplay,
    loadReplays,
    deleteReplay,
  };
}
