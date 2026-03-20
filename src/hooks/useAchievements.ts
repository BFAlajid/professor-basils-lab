"use client";

import { useReducer, useEffect, useCallback, useRef, useMemo, useState } from "react";
import type { AchievementDefinition } from "@/data/achievementDefinitions";
import { silentWarn } from "@/utils/silentWarn";
import { type PlayerStats, DEFAULT_STATS, statsReducer } from "./useAchievementsReducer";
import { validatePlayerStats } from "@/utils/validatePlayerStats";

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
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") return null;
    return {
      stats: validatePlayerStats(parsed.stats),
      unlockedIds: validateUnlockedIds(parsed.unlockedIds),
    };
  } catch (e) {
    silentWarn("loadAchievements", e);
    return null;
  }
}

function validateUnlockedIds(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === "string" && typeof val === "string") {
      result[key] = val;
    }
  }
  return result;
}

function saveToStorage(data: PersistedData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    silentWarn("saveAchievements", e);
  }
}

// --- Hook ---

export function useAchievements() {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [stats, dispatchStats] = useReducer(statsReducer, DEFAULT_STATS);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);
  const initialized = useRef(false);
  const recentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted data and achievement definitions on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let cancelled = false;

    const saved = loadFromStorage();
    if (saved) {
      dispatchStats({ type: "SET_STATS", stats: saved.stats });
      setUnlockedMap(saved.unlockedIds ?? {});
    }

    import("@/data/achievementDefinitions").then((mod) => {
      if (!cancelled) setDefinitions(mod.ACHIEVEMENT_DEFINITIONS);
    });

    return () => { cancelled = true; };
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
  const newUnlocksRef = useRef<Achievement[]>([]);

  const checkAchievements = useCallback(() => {
    newUnlocksRef.current = [];

    setUnlockedMap((prev) => {
      const updated = { ...prev };
      let changed = false;
      const unlocks: Achievement[] = [];

      for (const def of definitions) {
        if (def.id in updated) continue;
        if (def.condition(stats)) {
          const now = new Date().toISOString();
          updated[def.id] = now;
          changed = true;
          unlocks.push({
            ...def,
            unlocked: true,
            unlockedAt: now,
          });
        }
      }

      newUnlocksRef.current = unlocks;
      if (!changed) return prev;
      return updated;
    });

    // Show the most recent unlock as a toast trigger
    const newUnlocks = newUnlocksRef.current;
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

  return useMemo(() => ({
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
  }), [
    achievements, stats, incrementStat, addUniqueBall, addUniqueType,
    addKantoSpecies, recordBattleWin, recordBattleLoss, updateShinyChain,
    resetShinyChain, setBattleTowerStreak, addMoney, spendMoney, updateElo,
    checkAchievements, getUnlockedCount, getTotalCount, recentUnlock,
  ]);
}
