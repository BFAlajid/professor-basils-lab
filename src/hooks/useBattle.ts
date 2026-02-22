"use client";

import { useReducer, useCallback, useState, useEffect, useRef } from "react";
import { BattleTurnAction, TeamSlot, BattleMode, GenerationalMechanic, AltFormeData, DifficultyLevel } from "@/types";
import { isMegaStone, getMegaStone } from "@/data/megaStones";
import { battleReducer, initialBattleState } from "@/utils/battle";
import { fetchAndCacheMoves } from "@/utils/moveCache";
import { selectAIAction, generateRandomTeam, getBestSwitchIn } from "@/utils/ai";
import { useReplayRecorder } from "./useReplayRecorder";

export function useBattle() {
  const [state, dispatch] = useReducer(battleReducer, initialBattleState);
  const [isLoadingOpponent, setIsLoadingOpponent] = useState(false);
  const recorder = useReplayRecorder();
  const prevTurnRef = useRef(0);

  // Start recording when battle begins (turn 1, first action_select)
  useEffect(() => {
    if (state.phase === "action_select" && state.turn === 1 && prevTurnRef.current === 0) {
      recorder.startRecording(state);
      prevTurnRef.current = 1;
    }
  }, [state.phase, state.turn, recorder]);

  // Record snapshot on each new turn
  useEffect(() => {
    if (state.turn > prevTurnRef.current && state.phase !== "setup") {
      recorder.recordSnapshot(state);
      prevTurnRef.current = state.turn;
    }
    // Also capture the ended state
    if (state.phase === "ended" && prevTurnRef.current > 0) {
      recorder.recordSnapshot(state);
    }
    if (state.phase === "setup") {
      prevTurnRef.current = 0;
    }
  }, [state.turn, state.phase, recorder]);

  const preloadMoves = useCallback(async (teams: TeamSlot[]) => {
    const allMoves = new Set<string>();
    teams.forEach((slot) => {
      (slot.selectedMoves ?? []).forEach((m) => allMoves.add(m));
    });
    await fetchAndCacheMoves(Array.from(allMoves));
  }, []);

  const preloadFormeData = useCallback(async (teams: TeamSlot[]): Promise<Map<string, AltFormeData>> => {
    const formeCache = new Map<string, AltFormeData>();
    const megaFetches: Promise<void>[] = [];

    for (const slot of teams) {
      if (slot.heldItem && isMegaStone(slot.heldItem)) {
        const stone = getMegaStone(slot.heldItem);
        if (stone && stone.formeApiName) {
          megaFetches.push(
            fetch(`https://pokeapi.co/api/v2/pokemon/${stone.formeApiName}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data) {
                  formeCache.set(slot.pokemon.name, {
                    name: data.name,
                    types: data.types,
                    stats: data.stats,
                    ability: data.abilities?.[0]?.ability?.name ?? "",
                    spriteUrl: data.sprites?.other?.["official-artwork"]?.front_default ?? data.sprites?.front_default ?? null,
                  });
                }
              })
              .catch(() => {})
          );
        }
      }
    }

    await Promise.all(megaFetches);
    return formeCache;
  }, []);

  const startBattle = useCallback(
    async (
      player1Team: TeamSlot[],
      player2Team: TeamSlot[],
      mode: BattleMode,
      player1Mechanic: GenerationalMechanic = null,
      player2Mechanic: GenerationalMechanic = null,
      difficulty: DifficultyLevel = "normal"
    ) => {
      const allTeams = [...player1Team, ...player2Team];
      await preloadMoves(allTeams);
      const megaFormeCache = await preloadFormeData(allTeams);
      dispatch({
        type: "START_BATTLE",
        player1Team,
        player2Team,
        mode,
        player1Mechanic,
        player2Mechanic,
        megaFormeCache,
        difficulty,
      });
    },
    [preloadMoves, preloadFormeData]
  );

  const generateOpponent = useCallback(async (): Promise<TeamSlot[]> => {
    setIsLoadingOpponent(true);
    try {
      return await generateRandomTeam();
    } finally {
      setIsLoadingOpponent(false);
    }
  }, []);

  const submitActions = useCallback(
    (player1Action: BattleTurnAction, player2Action: BattleTurnAction) => {
      dispatch({
        type: "EXECUTE_TURN",
        player1Action,
        player2Action,
      });
    },
    []
  );

  const submitPlayerAction = useCallback(
    (action: BattleTurnAction) => {
      if (state.mode === "ai") {
        // AI selects its action
        const aiAction = selectAIAction(state);
        dispatch({
          type: "EXECUTE_TURN",
          player1Action: action,
          player2Action: aiAction,
        });
      }
    },
    [state]
  );

  const forceSwitch = useCallback(
    (player: "player1" | "player2", pokemonIndex: number) => {
      dispatch({ type: "FORCE_SWITCH", player, pokemonIndex });
    },
    []
  );

  const autoAISwitch = useCallback(() => {
    if (state.waitingForSwitch === "player2" && state.mode === "ai") {
      const bestIdx = getBestSwitchIn(state, "player2");
      dispatch({ type: "FORCE_SWITCH", player: "player2", pokemonIndex: bestIdx });
    }
  }, [state]);

  const resetBattle = useCallback(() => {
    dispatch({ type: "RESET_BATTLE" });
  }, []);

  // Audio track triggers
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("@/utils/audioManager").then(({ playTrack }) => {
      if (state.phase === "action_select" || state.phase === "executing" || state.phase === "force_switch") {
        playTrack("battle");
      } else if (state.phase === "ended") {
        if (state.winner === "player1" || (state.mode === "pvp" && state.winner === "player2")) {
          playTrack("victory");
        } else {
          playTrack("defeat");
        }
      } else if (state.phase === "setup") {
        playTrack("teamBuilder");
      }
    });
  }, [state.phase, state.winner, state.mode]);

  return {
    state,
    startBattle,
    generateOpponent,
    isLoadingOpponent,
    submitPlayerAction,
    submitActions,
    forceSwitch,
    autoAISwitch,
    resetBattle,
    saveReplay: recorder.saveReplay,
    loadReplays: recorder.loadReplays,
    deleteReplay: recorder.deleteReplay,
  };
}
