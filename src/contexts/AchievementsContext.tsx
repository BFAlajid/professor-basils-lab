"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAchievements, type Achievement, type PlayerStats } from "@/hooks/useAchievements";

// --- State context (changes when stats/achievements/recentUnlock change) ---

interface AchievementsStateValue {
  achievements: Achievement[];
  stats: PlayerStats;
  recentUnlock: Achievement | null;
  getUnlockedCount: () => number;
  getTotalCount: () => number;
}

const AchievementsStateContext = createContext<AchievementsStateValue | null>(null);

// --- Dispatch context (stable reference, never changes) ---

interface AchievementsDispatchValue {
  incrementStat: (key: keyof PlayerStats, amount?: number) => void;
  addUniqueBall: (ball: string) => void;
  addUniqueType: (typeName: string) => void;
  addKantoSpecies: (speciesId: number) => void;
  recordBattleWin: () => void;
  recordBattleLoss: () => void;
  updateShinyChain: (species: string) => void;
  resetShinyChain: () => void;
  setBattleTowerStreak: (streak: number) => void;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean;
  updateElo: (won: boolean, opponentRating?: number) => void;
  checkAchievements: () => Achievement[];
}

const AchievementsDispatchContext = createContext<AchievementsDispatchValue | null>(null);

// --- Provider ---

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const ach = useAchievements();

  const stateValue: AchievementsStateValue = useMemo(
    () => ({
      achievements: ach.achievements,
      stats: ach.stats,
      recentUnlock: ach.recentUnlock,
      getUnlockedCount: ach.getUnlockedCount,
      getTotalCount: ach.getTotalCount,
    }),
    [ach.achievements, ach.stats, ach.recentUnlock, ach.getUnlockedCount, ach.getTotalCount]
  );

  const dispatchValue: AchievementsDispatchValue = useMemo(
    () => ({
      incrementStat: ach.incrementStat,
      addUniqueBall: ach.addUniqueBall,
      addUniqueType: ach.addUniqueType,
      addKantoSpecies: ach.addKantoSpecies,
      recordBattleWin: ach.recordBattleWin,
      recordBattleLoss: ach.recordBattleLoss,
      updateShinyChain: ach.updateShinyChain,
      resetShinyChain: ach.resetShinyChain,
      setBattleTowerStreak: ach.setBattleTowerStreak,
      addMoney: ach.addMoney,
      spendMoney: ach.spendMoney,
      updateElo: ach.updateElo,
      checkAchievements: ach.checkAchievements,
    }),
    [
      ach.incrementStat, ach.addUniqueBall, ach.addUniqueType, ach.addKantoSpecies,
      ach.recordBattleWin, ach.recordBattleLoss, ach.updateShinyChain, ach.resetShinyChain,
      ach.setBattleTowerStreak, ach.addMoney, ach.spendMoney, ach.updateElo, ach.checkAchievements,
    ]
  );

  return (
    <AchievementsStateContext.Provider value={stateValue}>
      <AchievementsDispatchContext.Provider value={dispatchValue}>
        {children}
      </AchievementsDispatchContext.Provider>
    </AchievementsStateContext.Provider>
  );
}

// --- Hooks ---

export function useAchievementsState(): AchievementsStateValue {
  const ctx = useContext(AchievementsStateContext);
  if (!ctx) throw new Error("useAchievementsState must be used within AchievementsProvider");
  return ctx;
}

export function useAchievementsDispatch(): AchievementsDispatchValue {
  const ctx = useContext(AchievementsDispatchContext);
  if (!ctx) throw new Error("useAchievementsDispatch must be used within AchievementsProvider");
  return ctx;
}

/** Backward-compatible hook that returns both state and dispatch. */
export function useAchievementsContext(): AchievementsStateValue & AchievementsDispatchValue {
  const state = useAchievementsState();
  const dispatch = useAchievementsDispatch();
  return { ...state, ...dispatch };
}
