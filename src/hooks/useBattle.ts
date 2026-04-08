"use client";

import { useReducer, useCallback, useState, useEffect, useRef } from "react";
import { BattleTurnAction, BattlePokemon, TeamSlot, BattleMode, BattleFormat, GenerationalMechanic, AltFormeData, DifficultyLevel } from "@/types";
import { isMegaStone, getMegaStone } from "@/data/megaStones";
import { battleReducer, initialBattleState, getActivePokemon } from "@/utils/battle";
import { getActivePokemonBySlot } from "@/utils/battleHelpers";
import { fetchAndCacheMoves } from "@/utils/moveCache";
import { selectAIAction, generateRandomTeam, getBestSwitchIn } from "@/utils/aiWasm";
import { useReplayRecorder } from "./useReplayRecorder";
import { fetchPokemonData } from "@/utils/pokeApiClient";

export function useBattle() {
  const [state, dispatch] = useReducer(battleReducer, initialBattleState);
  const [isLoadingOpponent, setIsLoadingOpponent] = useState(false);
  const [megaLoadFailures, setMegaLoadFailures] = useState<Set<string>>(new Set());
  const recorder = useReplayRecorder();
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevTurnRef = useRef(0);

  // Start recording when battle begins (turn 1, first action_select)
  useEffect(() => {
    if (state.phase === "action_select" && state.turn === 0 && prevTurnRef.current === 0) {
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
            fetchPokemonData(stone.formeApiName)
              .then(data => {
                formeCache.set(slot.pokemon.name, {
                  name: data.name,
                  types: data.types,
                  stats: data.stats,
                  ability: data.abilities?.[0]?.ability?.name ?? "",
                  spriteUrl: data.sprites?.other?.["official-artwork"]?.front_default ?? data.sprites?.front_default ?? null,
                });
              })
              .catch((error) => {
                console.warn("Failed to load mega forme for", slot.pokemon.name, error);
                setMegaLoadFailures(prev => new Set(prev).add(slot.pokemon.name));
              })
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
      difficulty: DifficultyLevel = "normal",
      format: BattleFormat = "singles"
    ) => {
      const allTeams = [...player1Team, ...player2Team];
      await preloadMoves(allTeams);
      const megaFormeCache = await preloadFormeData(allTeams);
      dispatch({
        type: "START_BATTLE",
        player1Team,
        player2Team,
        mode,
        format,
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

  // For doubles: accumulate player's 2 actions before dispatching
  const doublesActionBuffer = useRef<BattleTurnAction | null>(null);

  const submitPlayerAction = useCallback(
    (action: BattleTurnAction) => {
      const current = stateRef.current;
      if (current.mode === "ai") {
        if (current.format === "doubles") {
          // In doubles, player submits 2 actions (one per active slot)
          if (!doublesActionBuffer.current) {
            // First action (slot 0) — buffer it
            doublesActionBuffer.current = { ...action, slot: 0 } as BattleTurnAction;
            return;
          }
          // Second action (slot 1) — dispatch both
          const action1 = doublesActionBuffer.current;
          const action2 = { ...action, slot: 1 } as BattleTurnAction;
          doublesActionBuffer.current = null;

          // AI selects 2 actions
          const aiAction1 = selectAIAction(current);
          const aiSlots = current.player2.activePokemonIndex2 !== null
            ? getActivePokemonBySlot(current.player2, 1)
            : null;
          const aiAction2: BattleTurnAction | null = aiSlots && !aiSlots.isFainted
            ? { type: "MOVE", moveIndex: Math.floor(Math.random() * Math.max(1, (aiSlots.slot.selectedMoves?.length ?? 1))), target: Math.random() < 0.5 ? "opp0" : "opp1", slot: 1 }
            : null;

          dispatch({
            type: "EXECUTE_TURN",
            player1Action: action1,
            player1Action2: action2,
            player2Action: { ...aiAction1, slot: 0 } as BattleTurnAction,
            ...(aiAction2 ? { player2Action2: aiAction2 } : {}),
          });
        } else {
          // Singles: same as before
          const aiAction = selectAIAction(current);
          dispatch({
            type: "EXECUTE_TURN",
            player1Action: action,
            player2Action: aiAction,
          });
        }
      }
    },
    []
  );

  const forceSwitch = useCallback(
    (player: "player1" | "player2", pokemonIndex: number) => {
      dispatch({ type: "FORCE_SWITCH", player, pokemonIndex });
    },
    []
  );

  const autoAISwitch = useCallback(() => {
    const current = stateRef.current;
    if (current.waitingForSwitch === "player2" && current.mode === "ai") {
      const bestIdx = getBestSwitchIn(current, "player2");
      dispatch({ type: "FORCE_SWITCH", player: "player2", pokemonIndex: bestIdx });
    }
  }, []);

  const resetBattle = useCallback(() => {
    recorder.clearRecording();
    doublesActionBuffer.current = null;
    dispatch({ type: "RESET_BATTLE" });
  }, [recorder]);

  // Audio track triggers
  useEffect(() => {
    let cancelled = false;
    // Dynamic import to avoid SSR issues
    import("@/utils/audioManager").then(({ playTrack }) => {
      if (cancelled) return;
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
    return () => { cancelled = true; };
  }, [state.phase, state.winner, state.mode]);

  return {
    state,
    startBattle,
    generateOpponent,
    isLoadingOpponent,
    megaLoadFailures,
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
