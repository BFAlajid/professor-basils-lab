"use client";

import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import { silentWarn } from "@/utils/silentWarn";
import {
  EliteFourMember,
  TeamSlot,
  StatusCondition,
  DifficultyLevel,
} from "@/types";
import { useBattle } from "./useBattle";
import { facilityReducer, initialFacilityState } from "./useBattleFacilityReducer";
import { GYM_BADGE_NAMES } from "@/data/gymLeaders";
import { generateScaledTeam } from "@/utils/aiWasm";
import { fetchPokemonData } from "@/utils/pokeApiClient";

// ── Hook ──────────────────────────────────────────────────────────────

export function useBattleFacility() {
  const [facilityState, dispatch] = useReducer(facilityReducer, initialFacilityState);
  const battle = useBattle();
  const [isLoadingOpponent, setIsLoadingOpponent] = useState(false);
  const hasLoadedStreak = useRef(false);

  // Load persisted best streak and badges on mount
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
      const savedBadges = localStorage.getItem("pokemon-gym-badges");
      if (savedBadges) {
        const badges = JSON.parse(savedBadges);
        if (Array.isArray(badges)) {
          dispatch({ type: "LOAD_BADGES", badges });
        }
      }
    } catch (e) {
      silentWarn("loadGymBadges", e);
    }
  }, []);

  // ── Current opponent helper ───────────────────────────────────────

  const currentOpponent: EliteFourMember | null =
    facilityState.opponents[facilityState.currentOpponentIndex] ?? null;

  // ── Start modes ───────────────────────────────────────────────────

  const startEliteFour = useCallback(() => {
    dispatch({ type: "START_ELITE_FOUR" });
  }, []);

  const startGymChallenge = useCallback(() => {
    dispatch({ type: "START_GYM_CHALLENGE" });
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
            const pokemon = await fetchPokemonData(member.pokemonId);
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
        } else if (facilityState.mode === "gym_challenge") {
          // Gyms 1-3 easy, 4-6 normal, 7-8 hard
          const gymIndex = facilityState.currentOpponentIndex;
          difficulty = gymIndex < 3 ? "easy" : gymIndex < 6 ? "normal" : "hard";
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
          } catch (e) {
            silentWarn("saveBattleTowerStreak", e);
          }
        }

        // Persist gym badges
        if (facilityState.mode === "gym_challenge") {
          try {
            const badgeName = GYM_BADGE_NAMES[facilityState.currentOpponentIndex] ?? "";
            const currentBadges = facilityState.badges ? [...facilityState.badges] : [];
            if (badgeName && !currentBadges.includes(badgeName)) {
              currentBadges.push(badgeName);
            }
            localStorage.setItem("pokemon-gym-badges", JSON.stringify(currentBadges));
          } catch (e) {
            silentWarn("saveGymBadges", e);
          }
        }
      } else {
        dispatch({ type: "BATTLE_LOST" });
      }
    },
    [battle.state, facilityState.mode, facilityState.streak, facilityState.bestStreak, facilityState.currentOpponentIndex, facilityState.badges]
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
    startGymChallenge,
    beginCurrentBattle,
    handleBattleEnd,
    nextBattle,
    healTeam,
    resetFacility,
    isLoadingOpponent,
    currentOpponent,
  };
}
