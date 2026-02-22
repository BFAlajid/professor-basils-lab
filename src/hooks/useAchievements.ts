"use client";

import { useReducer, useEffect, useCallback, useRef, useMemo, useState } from "react";

// --- Interfaces ---

export interface PlayerStats {
  totalCaught: number;
  totalBattlesWon: number;
  totalBattlesPlayed: number;
  uniqueSpeciesCaught: number;
  shinyCaught: number;
  legendsCaught: number;
  totalTeamsBuilt: number;
  gbaImports: number;
  ballsThrown: number;
  criticalHits: number;
  superEffectiveHits: number;
  winStreak: number;
  bestWinStreak: number;
  uniqueBallTypesUsed: string[];
  uniqueTypesOwned: string[];
  kantoSpeciesOwned: number[];
  showdownExports: number;
}

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

// --- Default Stats ---

const DEFAULT_STATS: PlayerStats = {
  totalCaught: 0,
  totalBattlesWon: 0,
  totalBattlesPlayed: 0,
  uniqueSpeciesCaught: 0,
  shinyCaught: 0,
  legendsCaught: 0,
  totalTeamsBuilt: 0,
  gbaImports: 0,
  ballsThrown: 0,
  criticalHits: 0,
  superEffectiveHits: 0,
  winStreak: 0,
  bestWinStreak: 0,
  uniqueBallTypesUsed: [],
  uniqueTypesOwned: [],
  kantoSpeciesOwned: [],
  showdownExports: 0,
};

// --- Achievement Definitions ---

function createAchievementDefinitions(): Omit<Achievement, "unlocked" | "unlockedAt">[] {
  return [
    // Catching
    {
      id: "first_catch",
      name: "First Catch",
      description: "Catch your first Pokemon",
      icon: "\u{1F3C6}",
      category: "catching",
      condition: (stats) => stats.totalCaught >= 1,
    },
    {
      id: "bug_catcher",
      name: "Bug Catcher",
      description: "Catch 10 Pokemon",
      icon: "\u{1FAB2}",
      category: "catching",
      condition: (stats) => stats.totalCaught >= 10,
    },
    {
      id: "pokemon_ranger",
      name: "Pokemon Ranger",
      description: "Catch 50 Pokemon",
      icon: "\u{1F9D1}\u{200D}\u{1F9AF}",
      category: "catching",
      condition: (stats) => stats.totalCaught >= 50,
    },
    {
      id: "pokemon_master",
      name: "Pokemon Master",
      description: "Catch 150 Pokemon",
      icon: "\u{1F451}",
      category: "catching",
      condition: (stats) => stats.totalCaught >= 150,
    },
    {
      id: "gotta_catch_em_all",
      name: "Gotta Catch Em All",
      description: "Catch 300 Pokemon",
      icon: "\u{1F31F}",
      category: "catching",
      condition: (stats) => stats.totalCaught >= 300,
    },
    {
      id: "shiny_hunter",
      name: "Shiny Hunter",
      description: "Catch a shiny Pokemon",
      icon: "\u2728",
      category: "catching",
      condition: (stats) => stats.shinyCaught >= 1,
    },
    {
      id: "lucky_star",
      name: "Lucky Star",
      description: "Catch 5 shiny Pokemon",
      icon: "\u{1FA90}",
      category: "catching",
      condition: (stats) => stats.shinyCaught >= 5,
    },

    // Battle
    {
      id: "first_victory",
      name: "First Victory",
      description: "Win your first battle",
      icon: "\u2694\uFE0F",
      category: "battle",
      condition: (stats) => stats.totalBattlesWon >= 1,
    },
    {
      id: "battler",
      name: "Battler",
      description: "Win 10 battles",
      icon: "\u{1F94A}",
      category: "battle",
      condition: (stats) => stats.totalBattlesWon >= 10,
    },
    {
      id: "champion",
      name: "Champion",
      description: "Win 50 battles",
      icon: "\u{1F3C5}",
      category: "battle",
      condition: (stats) => stats.totalBattlesWon >= 50,
    },
    {
      id: "undefeated",
      name: "Undefeated",
      description: "Win 10 battles in a row",
      icon: "\u{1F525}",
      category: "battle",
      condition: (stats) => stats.bestWinStreak >= 10,
    },
    {
      id: "critical_moment",
      name: "Critical Moment",
      description: "Land 50 critical hits",
      icon: "\u{1F4A5}",
      category: "battle",
      condition: (stats) => stats.criticalHits >= 50,
    },
    {
      id: "super_effective",
      name: "Super Effective",
      description: "Land 100 super effective hits",
      icon: "\u26A1",
      category: "battle",
      condition: (stats) => stats.superEffectiveHits >= 100,
    },

    // Collection
    {
      id: "kanto_complete",
      name: "Kanto Complete",
      description: "Own all 151 Kanto Pokemon",
      icon: "\u{1F5FE}",
      category: "collection",
      condition: (stats) => stats.kantoSpeciesOwned.length >= 151,
    },
    {
      id: "type_collector",
      name: "Type Collector",
      description: "Own at least one Pokemon of each type",
      icon: "\u{1F308}",
      category: "collection",
      condition: (stats) => stats.uniqueTypesOwned.length >= 18,
    },
    {
      id: "full_team",
      name: "Full Team",
      description: "Build a team of 6 Pokemon",
      icon: "\u{1F46B}",
      category: "collection",
      condition: (stats) => stats.totalTeamsBuilt >= 1,
    },
    {
      id: "team_builder_pro",
      name: "Team Builder Pro",
      description: "Build 10 different teams",
      icon: "\u{1F3D7}\uFE0F",
      category: "collection",
      condition: (stats) => stats.totalTeamsBuilt >= 10,
    },

    // Exploration (additional category to reach 20+)
    {
      id: "ball_connoisseur",
      name: "Ball Connoisseur",
      description: "Use 10 different Poke Ball types",
      icon: "\u{1F3B3}",
      category: "exploration",
      condition: (stats) => stats.uniqueBallTypesUsed.length >= 10,
    },
    {
      id: "heavy_thrower",
      name: "Heavy Thrower",
      description: "Throw 100 Poke Balls",
      icon: "\u{1F3AF}",
      category: "exploration",
      condition: (stats) => stats.ballsThrown >= 100,
    },
    {
      id: "legend_seeker",
      name: "Legend Seeker",
      description: "Catch a legendary Pokemon",
      icon: "\u{1F432}",
      category: "exploration",
      condition: (stats) => stats.legendsCaught >= 1,
    },

    // Special
    {
      id: "gba_veteran",
      name: "GBA Veteran",
      description: "Import a Pokemon from a GBA save file",
      icon: "\u{1F3AE}",
      category: "special",
      condition: (stats) => stats.gbaImports >= 1,
    },
    {
      id: "time_traveler",
      name: "Time Traveler",
      description: "Import 20 Pokemon from GBA saves",
      icon: "\u{1F570}\uFE0F",
      category: "special",
      condition: (stats) => stats.gbaImports >= 20,
    },
    {
      id: "showdown_ready",
      name: "Showdown Ready",
      description: "Export a team to Showdown format",
      icon: "\u{1F4CB}",
      category: "special",
      condition: (stats) => stats.showdownExports >= 1,
    },
    {
      id: "species_diversity",
      name: "Species Diversity",
      description: "Catch 50 unique species",
      icon: "\u{1F9EC}",
      category: "collection",
      condition: (stats) => stats.uniqueSpeciesCaught >= 50,
    },
  ];
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

// --- Reducer ---

type StatsAction =
  | { type: "INCREMENT"; key: keyof PlayerStats; amount: number }
  | { type: "ADD_UNIQUE_BALL"; ball: string }
  | { type: "ADD_UNIQUE_TYPE"; typeName: string }
  | { type: "ADD_KANTO_SPECIES"; speciesId: number }
  | { type: "RECORD_BATTLE_WIN" }
  | { type: "RECORD_BATTLE_LOSS" }
  | { type: "SET_STATS"; stats: PlayerStats };

function statsReducer(state: PlayerStats, action: StatsAction): PlayerStats {
  switch (action.type) {
    case "INCREMENT": {
      const key = action.key;
      const current = state[key];
      if (typeof current !== "number") return state;
      return { ...state, [key]: current + action.amount };
    }
    case "ADD_UNIQUE_BALL": {
      if (state.uniqueBallTypesUsed.includes(action.ball)) return state;
      return {
        ...state,
        uniqueBallTypesUsed: [...state.uniqueBallTypesUsed, action.ball],
      };
    }
    case "ADD_UNIQUE_TYPE": {
      if (state.uniqueTypesOwned.includes(action.typeName)) return state;
      return {
        ...state,
        uniqueTypesOwned: [...state.uniqueTypesOwned, action.typeName],
      };
    }
    case "ADD_KANTO_SPECIES": {
      if (
        action.speciesId < 1 ||
        action.speciesId > 151 ||
        state.kantoSpeciesOwned.includes(action.speciesId)
      ) {
        return state;
      }
      return {
        ...state,
        kantoSpeciesOwned: [...state.kantoSpeciesOwned, action.speciesId],
      };
    }
    case "RECORD_BATTLE_WIN": {
      const newStreak = state.winStreak + 1;
      return {
        ...state,
        totalBattlesWon: state.totalBattlesWon + 1,
        totalBattlesPlayed: state.totalBattlesPlayed + 1,
        winStreak: newStreak,
        bestWinStreak: Math.max(state.bestWinStreak, newStreak),
      };
    }
    case "RECORD_BATTLE_LOSS": {
      return {
        ...state,
        totalBattlesPlayed: state.totalBattlesPlayed + 1,
        winStreak: 0,
      };
    }
    case "SET_STATS":
      return action.stats;
    default:
      return state;
  }
}

// --- Hook ---

export function useAchievements() {
  const definitions = useMemo(() => createAchievementDefinitions(), []);
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
    checkAchievements,
    getUnlockedCount,
    getTotalCount,
    recentUnlock,
  };
}
