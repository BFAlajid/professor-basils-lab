"use client";

import { useReducer, useEffect, useCallback, useRef, useMemo, useState } from "react";
import type { AchievementDefinition } from "@/data/achievementDefinitions";
import { type PlayerStats, DEFAULT_STATS, statsReducer } from "@/utils/statsReducer";
import { validatePlayerStats } from "@/utils/validatePlayerStats";
import { STORAGE_KEYS, readStorageValidated, writeStorage } from "@/utils/persistence";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";

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

interface PersistedData {
  stats: PlayerStats;
  unlockedIds: Record<string, string>; // id -> ISO date string
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

function validatePersistedData(raw: unknown): PersistedData | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as { stats?: unknown; unlockedIds?: unknown };
  return {
    stats: validatePlayerStats(r.stats),
    unlockedIds: validateUnlockedIds(r.unlockedIds),
  };
}

function loadFromStorage(): PersistedData | null {
  return readStorageValidated<PersistedData | null>(STORAGE_KEYS.achievements, null, validatePersistedData);
}

function saveToStorage(data: PersistedData): void {
  writeStorage(STORAGE_KEYS.achievements, data);
}

// --- Hook ---

export function useAchievements() {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [stats, dispatchStats] = useReducer(statsReducer, DEFAULT_STATS);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const initialized = useRef(false);
  const recentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

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
    setIsHydrated(true);

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

  // Auto-persist to storage whenever stats or unlocked map change, debounced
  // so rapid stat increments (a catching/battling burst) don't each
  // re-serialize the full stats + unlocked-achievements payload.
  const persistedData = useMemo<PersistedData>(
    () => ({ stats, unlockedIds: unlockedMap }),
    [stats, unlockedMap]
  );
  useDebouncedPersist(persistedData, saveToStorage, undefined, isHydrated);

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
    if (statsRef.current.money < amount) return false;
    dispatchStats({ type: "SPEND_MONEY", amount });
    return true;
  }, []);

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
