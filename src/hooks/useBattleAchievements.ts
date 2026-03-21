"use client";

import { useEffect, useRef } from "react";
import { BattleState } from "@/types";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { useTournament } from "@/hooks/useTournament";
import { useBattleFacility } from "@/hooks/useBattleFacility";

interface UseBattleAchievementsParams {
  state: BattleState;
  activeBattleState: BattleState;
  activeBattleMode: "ai" | "pvp" | "tournament" | "online" | "facility" | "factory" | null;
  isFacilityMode: boolean;
  tournament: ReturnType<typeof useTournament>;
  facility: ReturnType<typeof useBattleFacility>;
}

/**
 * Side-effect-only hook that tracks battle achievements, ELO, and combat stats.
 * Extracted from BattleTab to reduce component complexity.
 */
export function useBattleAchievements({
  state,
  activeBattleState,
  activeBattleMode,
  isFacilityMode,
  tournament,
  facility,
}: UseBattleAchievementsParams): void {
  const { recordBattleWin, recordBattleLoss, incrementStat, setBattleTowerStreak, updateElo } =
    useAchievementsContext();
  const hasRecorded = useRef(false);
  const prevLogLen = useRef(0);
  const facilityRecorded = useRef(false);

  const tournamentReportWin = tournament.reportWin;
  const tournamentReportLoss = tournament.reportLoss;

  // Record battle result exactly once when battle ends (non-facility)
  useEffect(() => {
    if (isFacilityMode) return;
    if (state.phase === "ended" && !hasRecorded.current) {
      hasRecorded.current = true;
      if (state.winner === "player1") {
        recordBattleWin();
        updateElo(true);
        if (activeBattleMode === "tournament") {
          tournamentReportWin();
        }
      } else {
        recordBattleLoss();
        updateElo(false);
        if (activeBattleMode === "tournament") {
          tournamentReportLoss();
        }
      }
    }
    if (state.phase === "setup") {
      hasRecorded.current = false;
    }
  }, [state.phase, state.winner, recordBattleWin, recordBattleLoss, updateElo, activeBattleMode, tournamentReportWin, tournamentReportLoss, isFacilityMode]);

  // Record facility battle result when facility battle ends
  useEffect(() => {
    if (!isFacilityMode) return;
    const fBattle = facility.battle.state;
    if (fBattle.phase === "ended" && !facilityRecorded.current) {
      facilityRecorded.current = true;
      const winner = fBattle.winner;
      if (winner === "player1") {
        recordBattleWin();
      } else {
        recordBattleLoss();
      }
      facility.handleBattleEnd(winner ?? "player2");

      // Track E4 / Battle Tower / Gym achievements
      if (winner === "player1") {
        if (facility.facilityState.mode === "elite_four") {
          const newWins = facility.facilityState.wins + 1;
          if (newWins >= facility.facilityState.totalOpponents) {
            incrementStat("eliteFourCleared", 1);
            incrementStat("hallOfFameEntries", 1);
          }
        } else if (facility.facilityState.mode === "battle_tower") {
          const newStreak = facility.facilityState.streak + 1;
          setBattleTowerStreak(newStreak);
        } else if (facility.facilityState.mode === "gym_challenge") {
          incrementStat("gymBadgesEarned", 1);
          const newWins = facility.facilityState.wins + 1;
          if (newWins >= facility.facilityState.totalOpponents) {
            incrementStat("hallOfFameEntries", 1);
          }
        }
      }
    }
    if (fBattle.phase === "setup") {
      facilityRecorded.current = false;
    }
  }, [facility.battle.state.phase, facility.battle.state.winner, isFacilityMode, facility, recordBattleWin, recordBattleLoss, incrementStat, setBattleTowerStreak]);

  // Track critical hits and super effective hits from active battle log
  useEffect(() => {
    if (activeBattleState.log.length > prevLogLen.current) {
      const newEntries = activeBattleState.log.slice(prevLogLen.current);
      const crits = newEntries.filter((e) => e.kind === "critical").length;
      const supers = newEntries.filter((e) => e.message === "It's super effective!").length;
      if (crits > 0) incrementStat("criticalHits", crits);
      if (supers > 0) incrementStat("superEffectiveHits", supers);
      prevLogLen.current = activeBattleState.log.length;
    }
    if (activeBattleState.phase === "setup") {
      prevLogLen.current = 0;
    }
  }, [activeBattleState.log, activeBattleState.phase, incrementStat]);
}
