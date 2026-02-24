"use client";

import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import {
  BattleFacilityState,
  BattleFacilityMode,
  BattleFacilityPhase,
  EliteFourMember,
  TeamSlot,
  StatusCondition,
  DifficultyLevel,
} from "@/types";
import { useBattle } from "./useBattle";
import { ELITE_FOUR } from "@/data/eliteFour";
import { generateScaledTeam } from "@/utils/ai";

// ── Action types ──────────────────────────────────────────────────────

type FacilityAction =
  | { type: "START_ELITE_FOUR" }
  | { type: "START_BATTLE_TOWER" }
  | { type: "SET_OPPONENTS"; opponents: EliteFourMember[] }
  | { type: "BEGIN_BATTLE" }
  | { type: "BATTLE_WON"; hpPercents: number[]; statuses: StatusCondition[] }
  | { type: "BATTLE_LOST" }
  | { type: "NEXT_BATTLE" }
  | { type: "HEAL_TEAM" }
  | { type: "LOAD_BEST_STREAK"; streak: number }
  | { type: "RESET" };

// ── Initial state ─────────────────────────────────────────────────────

const initialFacilityState: BattleFacilityState = {
  mode: "elite_four",
  phase: "lobby",
  currentOpponentIndex: 0,
  totalOpponents: 5,
  wins: 0,
  streak: 0,
  bestStreak: 0,
  teamHpPercents: [],
  teamStatuses: [],
  opponents: [],
};

// ── Reducer ───────────────────────────────────────────────────────────

function facilityReducer(
  state: BattleFacilityState,
  action: FacilityAction
): BattleFacilityState {
  switch (action.type) {
    case "START_ELITE_FOUR":
      return {
        ...initialFacilityState,
        mode: "elite_four",
        phase: "pre_battle",
        totalOpponents: 5,
        opponents: ELITE_FOUR,
      };

    case "START_BATTLE_TOWER":
      return {
        ...initialFacilityState,
        mode: "battle_tower",
        phase: "pre_battle",
        totalOpponents: Infinity,
        bestStreak: state.bestStreak, // preserve persisted best streak
      };

    case "SET_OPPONENTS":
      return { ...state, opponents: action.opponents };

    case "BEGIN_BATTLE":
      return { ...state, phase: "battling" };

    case "BATTLE_WON": {
      const newWins = state.wins + 1;
      const newIndex = state.currentOpponentIndex + 1;

      if (state.mode === "elite_four") {
        return {
          ...state,
          wins: newWins,
          currentOpponentIndex: newIndex,
          teamHpPercents: action.hpPercents,
          teamStatuses: action.statuses,
          phase: newWins >= state.totalOpponents ? "victory" : "between_battles",
        };
      }

      // battle_tower
      const newStreak = state.streak + 1;
      const newBest = Math.max(state.bestStreak, newStreak);
      return {
        ...state,
        wins: newWins,
        currentOpponentIndex: newIndex,
        streak: newStreak,
        bestStreak: newBest,
        teamHpPercents: action.hpPercents,
        teamStatuses: action.statuses,
        phase: "between_battles",
      };
    }

    case "BATTLE_LOST":
      return { ...state, phase: "defeat" };

    case "NEXT_BATTLE":
      return { ...state, phase: "pre_battle" };

    case "HEAL_TEAM":
      return {
        ...state,
        teamHpPercents: state.teamHpPercents.map(() => 1),
        teamStatuses: state.teamStatuses.map(() => null),
      };

    case "LOAD_BEST_STREAK":
      return { ...state, bestStreak: action.streak };

    case "RESET":
      return { ...initialFacilityState, bestStreak: state.bestStreak };

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useBattleFacility() {
  const [facilityState, dispatch] = useReducer(facilityReducer, initialFacilityState);
  const battle = useBattle();
  const [isLoadingOpponent, setIsLoadingOpponent] = useState(false);
  const hasLoadedStreak = useRef(false);

  // Load persisted best streak on mount
  useEffect(() => {
    if (hasLoadedStreak.current) return;
    hasLoadedStreak.current = true;
    try {
      const saved = localStorage.getItem("pokemon-battle-tower-streak");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          dispatch({ type: "LOAD_BEST_STREAK", streak: parsed });
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // ── Current opponent helper ───────────────────────────────────────

  const currentOpponent: EliteFourMember | null =
    facilityState.opponents[facilityState.currentOpponentIndex] ?? null;

  // ── Start modes ───────────────────────────────────────────────────

  const startEliteFour = useCallback(() => {
    dispatch({ type: "START_ELITE_FOUR" });
  }, []);

  const startBattleTower = useCallback(async () => {
    dispatch({ type: "START_BATTLE_TOWER" });
    // Generate first opponent for battle tower
    setIsLoadingOpponent(true);
    try {
      const teamSlots = await generateScaledTeam(1);
      const opponent: EliteFourMember = {
        name: "Tower Trainer",
        title: `Floor 1`,
        specialty: "mixed",
        quote: "Let's battle!",
        team: teamSlots.map((slot) => ({
          pokemonId: slot.pokemon.id,
          moves: slot.selectedMoves ?? [],
          ability: slot.ability ?? undefined,
          nature: slot.nature?.name,
          heldItem: slot.heldItem ?? undefined,
        })),
      };
      dispatch({ type: "SET_OPPONENTS", opponents: [opponent] });
    } finally {
      setIsLoadingOpponent(false);
    }
  }, []);

  // ── Begin current battle ──────────────────────────────────────────

  const beginCurrentBattle = useCallback(
    async (playerTeam: TeamSlot[]) => {
      const opponent = facilityState.opponents[facilityState.currentOpponentIndex];
      if (!opponent) return;

      setIsLoadingOpponent(true);
      try {
        // Apply HP / status carry-over
        const modifiedPlayerTeam: TeamSlot[] = playerTeam.map((slot, i) => ({
          ...slot,
          startingHpPercent:
            facilityState.teamHpPercents[i] !== undefined
              ? facilityState.teamHpPercents[i]
              : 1,
        }));

        // Build opponent TeamSlot[] from EliteFourMember
        const opponentSlots: TeamSlot[] = await Promise.all(
          opponent.team.map(async (member, i) => {
            const res = await fetch(
              `https://pokeapi.co/api/v2/pokemon/${member.pokemonId}`
            );
            const pokemon = await res.json();
            return {
              pokemon,
              position: i,
              selectedMoves: member.moves,
              ability: member.ability ?? null,
              heldItem: member.heldItem ?? null,
            } as TeamSlot;
          })
        );

        // Determine difficulty
        let difficulty: DifficultyLevel = "normal";
        if (facilityState.mode === "elite_four") {
          difficulty = facilityState.currentOpponentIndex >= 3 ? "hard" : "normal";
        } else {
          // battle_tower: scale difficulty by floor
          const floor = facilityState.wins + 1;
          difficulty = floor < 8 ? "easy" : floor < 15 ? "normal" : "hard";
        }

        dispatch({ type: "BEGIN_BATTLE" });
        await battle.startBattle(
          modifiedPlayerTeam,
          opponentSlots,
          "ai",
          null,
          null,
          difficulty
        );
      } finally {
        setIsLoadingOpponent(false);
      }
    },
    [facilityState, battle]
  );

  // ── Handle battle end ─────────────────────────────────────────────

  const handleBattleEnd = useCallback(
    (winner: "player1" | "player2") => {
      if (winner === "player1") {
        // Extract HP carry-over from battle state
        const hpPercents = battle.state.player1.pokemon.map((bp) =>
          bp.maxHp > 0 ? bp.currentHp / bp.maxHp : 0
        );
        const statuses: StatusCondition[] = battle.state.player1.pokemon.map(
          (bp) => bp.status
        );

        dispatch({ type: "BATTLE_WON", hpPercents, statuses });

        // Persist best streak for battle tower
        if (facilityState.mode === "battle_tower") {
          try {
            const newStreak = facilityState.streak + 1;
            const newBest = Math.max(facilityState.bestStreak, newStreak);
            localStorage.setItem(
              "pokemon-battle-tower-streak",
              String(newBest)
            );
          } catch {
            // localStorage unavailable
          }
        }
      } else {
        dispatch({ type: "BATTLE_LOST" });
      }
    },
    [battle.state, facilityState.mode, facilityState.streak, facilityState.bestStreak]
  );

  // ── Next battle ───────────────────────────────────────────────────

  const nextBattle = useCallback(async () => {
    // Battle tower: heal every 7 wins
    if (
      facilityState.mode === "battle_tower" &&
      facilityState.wins > 0 &&
      facilityState.wins % 7 === 0
    ) {
      dispatch({ type: "HEAL_TEAM" });
    }

    if (facilityState.mode === "battle_tower") {
      // Generate new opponent for next floor
      setIsLoadingOpponent(true);
      try {
        const floor = facilityState.wins + 1;
        const teamSlots = await generateScaledTeam(floor);
        const opponent: EliteFourMember = {
          name: "Tower Trainer",
          title: `Floor ${floor}`,
          specialty: "mixed",
          quote: "I won't lose!",
          team: teamSlots.map((slot) => ({
            pokemonId: slot.pokemon.id,
            moves: slot.selectedMoves ?? [],
            ability: slot.ability ?? undefined,
            nature: slot.nature?.name,
            heldItem: slot.heldItem ?? undefined,
          })),
        };
        dispatch({
          type: "SET_OPPONENTS",
          opponents: [...facilityState.opponents, opponent],
        });
      } finally {
        setIsLoadingOpponent(false);
      }
    }

    dispatch({ type: "NEXT_BATTLE" });
  }, [facilityState.mode, facilityState.wins, facilityState.opponents]);

  // ── Heal team ─────────────────────────────────────────────────────

  const healTeam = useCallback(() => {
    dispatch({ type: "HEAL_TEAM" });
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────

  const resetFacility = useCallback(() => {
    dispatch({ type: "RESET" });
    battle.resetBattle();
  }, [battle]);

  return {
    facilityState,
    battle,
    startEliteFour,
    startBattleTower,
    beginCurrentBattle,
    handleBattleEnd,
    nextBattle,
    healTeam,
    resetFacility,
    isLoadingOpponent,
    currentOpponent,
  };
}
