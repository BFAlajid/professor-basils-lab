"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAchievements } from "@/hooks/useAchievements";

type AchievementsContextValue = ReturnType<typeof useAchievements>;

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const achievements = useAchievements();
  return (
    <AchievementsContext.Provider value={achievements}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievementsContext(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error("useAchievementsContext must be used within AchievementsProvider");
  return ctx;
}
