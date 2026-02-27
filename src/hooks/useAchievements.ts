"use client";

import { useReducer, useEffect, useCallback, useRef, useMemo, useState } from "react";
import { ACHIEVEMENT_DEFINITIONS } from "@/data/achievementDefinitions";
import { type PlayerStats, DEFAULT_STATS, statsReducer } from "./useAchievementsReducer";

export type { PlayerStats };

export type AchievementCategory =
  | "catching"
  | "battle"
  | "collection"
  | "exploration"
  | "special";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: (stats: PlayerStats) => boolean;
  unlocked: boolean;
  unlockedAt: string | null;
}

// --- Storage ---

const STORAGE_KEY = "pokemon-achievements";

interface PersistedData {
  stats: PlayerStats;
  unlockedIds: Record<string, string>; // id -> ISO date string
}

function loadFromStorage(): PersistedData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedData;
  } catch {
    return null;
  }
}

function saveToStorage(data: PersistedData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// --- Hook ---

export function useAchievements() {
  const definitions = ACHIEVEMENT_DEFINITIONS;
  const [stats, dispatchStats] = useReducer(statsReducer, DEFAULT_STATS);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);
  const initialized = useRef(false);
  const recentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const saved = loadFromStorage();
    if (saved) {
      dispatchStats({ type: "SET_STATS", stats: { ...DEFAULT_STATS, ...saved.stats } });
      setUnlockedMap(saved.unlockedIds ?? {});
    }
  }, []);

  // Build full achievement list with unlock state
  const achievements: Achievement[] = useMemo(() => {
    return definitions.map((def) => ({
      ...def,
      unlocked: def.id in unlockedMap,
      unlockedAt: unlockedMap[def.id] ?? null,
    }));
  }, [definitions, unlockedMap]);

  // Check achievements and return newly unlocked ones
  const checkAchievements = useCallback(() => {
    let newUnlocks: Achievement[] = [];

    setUnlockedMap((prev) => {
      const updated = { ...prev };
      let changed = false;

      for (const def of definitions) {
        if (def.id in updated) continue;
        if (def.condition(stats)) {
          const now = new Date().toISOString();
          updated[def.id] = now;
          changed = true;
          newUnlocks.push({
            ...def,
            unlocked: true,
            unlockedAt: now,
          });
        }
      }

      if (!changed) return prev;
      return updated;
    });

    // Show the most recent unlock as a toast trigger
    if (newUnlocks.length > 0) {
      const latest = newUnlocks[newUnlocks.length - 1];
      setRecentUnlock(latest);

      if (recentTimeout.current) clearTimeout(recentTimeout.current);
      recentTimeout.current = setTimeout(() => {
        setRecentUnlock(null);
      }, 5000);
    }

    return newUnlocks;
  }, [definitions, stats]);

  // Auto-check achievements whenever stats change
  useEffect(() => {
    if (!initialized.current) return;
    checkAchievements();
  }, [stats, checkAchievements]);

  // Auto-persist to localStorage whenever stats or unlocked map change
  useEffect(() => {
    if (!initialized.current) return;
    saveToStorage({
      stats,
      unlockedIds: unlockedMap,
    });
  }, [stats, unlockedMap]);

  // Public stat increment
  const incrementStat = useCallback(
    (key: keyof PlayerStats, amount: number = 1) => {
      dispatchStats({ type: "INCREMENT", key, amount });
    },
    []
  );

  // Convenience methods for complex stat updates
  const addUniqueBall = useCallback((ball: string) => {
    dispatchStats({ type: "ADD_UNIQUE_BALL", ball });
  }, []);

  const addUniqueType = useCallback((typeName: string) => {
    dispatchStats({ type: "ADD_UNIQUE_TYPE", typeName });
  }, []);

  const addKantoSpecies = useCallback((speciesId: number) => {
    dispatchStats({ type: "ADD_KANTO_SPECIES", speciesId });
  }, []);

  const recordBattleWin = useCallback(() => {
    dispatchStats({ type: "RECORD_BATTLE_WIN" });
  }, []);

  const recordBattleLoss = useCallback(() => {
    dispatchStats({ type: "RECORD_BATTLE_LOSS" });
  }, []);

  const updateShinyChain = useCallback((species: string) => {
    dispatchStats({ type: "UPDATE_SHINY_CHAIN", species });
  }, []);

  const resetShinyChain = useCallback(() => {
    dispatchStats({ type: "RESET_SHINY_CHAIN" });
  }, []);

  const setBattleTowerStreak = useCallback((streak: number) => {
    dispatchStats({ type: "SET_BATTLE_TOWER_STREAK", streak });
  }, []);

  const addMoney = useCallback((amount: number) => {
    dispatchStats({ type: "ADD_MONEY", amount });
  }, []);

  const spendMoney = useCallback((amount: number): boolean => {
    if (stats.money < amount) return false;
    dispatchStats({ type: "SPEND_MONEY", amount });
    return true;
  }, [stats.money]);

  const updateElo = useCallback((won: boolean, opponentRating?: number) => {
    dispatchStats({ type: "UPDATE_ELO", won, opponentRating });
  }, []);

  const getUnlockedCount = useCallback((): number => {
    return Object.keys(unlockedMap).length;
  }, [unlockedMap]);

  const getTotalCount = useCallback((): number => {
    return definitions.length;
  }, [definitions]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (recentTimeout.current) clearTimeout(recentTimeout.current);
    };
  }, []);

  return {
    achievements,
    stats,
    incrementStat,
    addUniqueBall,
    addUniqueType,
    addKantoSpecies,
    recordBattleWin,
    recordBattleLoss,
    updateShinyChain,
    resetShinyChain,
    setBattleTowerStreak,
    addMoney,
    spendMoney,
    updateElo,
    checkAchievements,
    getUnlockedCount,
    getTotalCount,
    recentUnlock,
  };
}
