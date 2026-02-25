"use client";

import { useReducer, useCallback, useEffect, useRef, useState } from "react";
import { TeamSlot } from "@/types";
import { generateScaledTeam } from "@/utils/aiWasm";

// ── State ────────────────────────────────────────────────────────────

export interface BattleFactoryState {
  phase: "idle" | "pick" | "battling" | "swap" | "victory" | "defeat";
  rentalPool: TeamSlot[]; // 6 random Pokemon for picking
  selectedIndices: number[]; // indices into rentalPool (max 3)
  playerTeam: TeamSlot[]; // the 3 chosen rentals
  opponentTeam: TeamSlot[]; // current opponent's team
  wins: number;
  bestRun: number;
  totalRuns: number;
}

// ── Actions ──────────────────────────────────────────────────────────

type FactoryAction =
  | { type: "GENERATE_POOL"; pool: TeamSlot[] }
  | { type: "SELECT_RENTAL"; index: number }
  | { type: "DESELECT_RENTAL"; index: number }
  | { type: "CONFIRM_TEAM" }
  | { type: "SET_OPPONENT"; team: TeamSlot[] }
  | { type: "BATTLE_WON" }
  | { type: "BATTLE_LOST" }
  | { type: "SWAP_POKEMON"; myIndex: number; opponentIndex: number }
  | { type: "SKIP_SWAP" }
  | { type: "LOAD_BEST"; bestRun: number }
  | { type: "RESET" };

// ── Initial state ────────────────────────────────────────────────────

const initialState: BattleFactoryState = {
  phase: "idle",
  rentalPool: [],
  selectedIndices: [],
  playerTeam: [],
  opponentTeam: [],
  wins: 0,
  bestRun: 0,
  totalRuns: 0,
};

// ── Reducer ──────────────────────────────────────────────────────────

function factoryReducer(
  state: BattleFactoryState,
  action: FactoryAction
): BattleFactoryState {
  switch (action.type) {
    case "GENERATE_POOL":
      return {
        ...state,
        phase: "pick",
        rentalPool: action.pool,
        selectedIndices: [],
        playerTeam: [],
        opponentTeam: [],
        wins: 0,
      };

    case "SELECT_RENTAL": {
      if (state.selectedIndices.length >= 3) return state;
      if (state.selectedIndices.includes(action.index)) return state;
      return {
        ...state,
        selectedIndices: [...state.selectedIndices, action.index],
      };
    }

    case "DESELECT_RENTAL": {
      return {
        ...state,
        selectedIndices: state.selectedIndices.filter((i) => i !== action.index),
      };
    }

    case "CONFIRM_TEAM": {
      if (state.selectedIndices.length !== 3) return state;
      const team = state.selectedIndices.map((idx, pos) => ({
        ...state.rentalPool[idx],
        position: pos,
      }));
      return {
        ...state,
        phase: "battling",
        playerTeam: team,
      };
    }

    case "SET_OPPONENT":
      return {
        ...state,
        opponentTeam: action.team,
        phase: "battling",
      };

    case "BATTLE_WON": {
      const newWins = state.wins + 1;
      if (newWins >= 7) {
        // Victory — completed all 7 battles
        const newBest = Math.max(state.bestRun, newWins);
        return {
          ...state,
          wins: newWins,
          bestRun: newBest,
          totalRuns: state.totalRuns + 1,
          phase: "victory",
        };
      }
      return {
        ...state,
        wins: newWins,
        phase: "swap",
      };
    }

    case "BATTLE_LOST": {
      const newBest = Math.max(state.bestRun, state.wins);
      return {
        ...state,
        bestRun: newBest,
        totalRuns: state.totalRuns + 1,
        phase: "defeat",
      };
    }

    case "SWAP_POKEMON": {
      const { myIndex, opponentIndex } = action;
      if (
        myIndex < 0 ||
        myIndex >= state.playerTeam.length ||
        opponentIndex < 0 ||
        opponentIndex >= state.opponentTeam.length
      ) {
        return state;
      }
      const newTeam = [...state.playerTeam];
      newTeam[myIndex] = {
        ...state.opponentTeam[opponentIndex],
        position: myIndex,
      };
      return {
        ...state,
        playerTeam: newTeam,
        phase: "battling",
      };
    }

    case "SKIP_SWAP":
      return {
        ...state,
        phase: "battling",
      };

    case "LOAD_BEST":
      return {
        ...state,
        bestRun: action.bestRun,
      };

    case "RESET":
      return {
        ...initialState,
        bestRun: state.bestRun,
        totalRuns: state.totalRuns,
      };

    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "pokemon-battle-factory-best";

export function useBattleFactory() {
  const [factoryState, dispatch] = useReducer(factoryReducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedBest = useRef(false);

  // Load best run from localStorage on mount
  useEffect(() => {
    if (hasLoadedBest.current) return;
    hasLoadedBest.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
          dispatch({ type: "LOAD_BEST", bestRun: parsed });
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Persist best run whenever it changes
  useEffect(() => {
    if (factoryState.bestRun > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, String(factoryState.bestRun));
      } catch {
        // localStorage unavailable
      }
    }
  }, [factoryState.bestRun]);

  // ── Start factory — generate rental pool of 6 Pokemon ──────────────

  const startFactory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Generate 6 rental Pokemon (floor 5 = mid-tier difficulty)
      const pool = await generateScaledTeam(5);
      // Ensure we have exactly 6 — pad if the API returned fewer
      const sixPool = pool.slice(0, 6);
      while (sixPool.length < 6) {
        const extra = await generateScaledTeam(5);
        for (const p of extra) {
          if (sixPool.length >= 6) break;
          // Avoid duplicates
          if (!sixPool.some((s) => s.pokemon.id === p.pokemon.id)) {
            sixPool.push(p);
          }
        }
      }
      // Reindex positions
      const indexed = sixPool.map((s, i) => ({ ...s, position: i }));
      dispatch({ type: "GENERATE_POOL", pool: indexed });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Selection ──────────────────────────────────────────────────────

  const selectRental = useCallback((index: number) => {
    dispatch({ type: "SELECT_RENTAL", index });
  }, []);

  const deselectRental = useCallback((index: number) => {
    dispatch({ type: "DESELECT_RENTAL", index });
  }, []);

  // ── Confirm team ───────────────────────────────────────────────────

  const confirmTeam = useCallback(() => {
    dispatch({ type: "CONFIRM_TEAM" });
  }, []);

  // ── Generate opponent — 3 Pokemon scaled to current win count ──────

  const generateOpponent = useCallback(async () => {
    setIsLoading(true);
    try {
      // Scale difficulty: floor rises with wins
      const floor = factoryState.wins + 1;
      const opponentTeam = await generateScaledTeam(floor);
      // Take only 3 for the opponent
      const threeOpponents = opponentTeam.slice(0, 3).map((s, i) => ({
        ...s,
        position: i,
      }));
      dispatch({ type: "SET_OPPONENT", team: threeOpponents });
    } finally {
      setIsLoading(false);
    }
  }, [factoryState.wins]);

  // ── Battle results ─────────────────────────────────────────────────

  const reportWin = useCallback(() => {
    dispatch({ type: "BATTLE_WON" });
  }, []);

  const reportLoss = useCallback(() => {
    dispatch({ type: "BATTLE_LOST" });
  }, []);

  // ── Swap ───────────────────────────────────────────────────────────

  const swapPokemon = useCallback(
    (myIndex: number, opponentIndex: number) => {
      dispatch({ type: "SWAP_POKEMON", myIndex, opponentIndex });
    },
    []
  );

  const skipSwap = useCallback(() => {
    dispatch({ type: "SKIP_SWAP" });
  }, []);

  // ── Reset ──────────────────────────────────────────────────────────

  const resetFactory = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    factoryState,
    isLoading,
    startFactory,
    selectRental,
    deselectRental,
    confirmTeam,
    generateOpponent,
    reportWin,
    reportLoss,
    swapPokemon,
    skipSwap,
    resetFactory,
  };
}
