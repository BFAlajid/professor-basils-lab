"use client";

import { useReducer, useCallback, useState, useRef } from "react";
import { silentWarn } from "@/utils/silentWarn";
import { SHINY_RATE } from "@/data/constants";
import {
  SafariPhase,
  SafariAction,
  SafariPokemonState,
  SafariCaughtEntry,
  SafariZoneState,
  Pokemon,
} from "@/types";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import {
  SAFARI_ENCOUNTERS,
  SafariEncounterDef,
} from "@/data/safariZoneEncounters";

// ── Local extended state: adds base rates for catch/flee calculations ──

interface SafariPokemonFull extends SafariPokemonState {
  baseCatchRate: number;
  baseFleeRate: number;
}

interface InternalSafariState extends Omit<SafariZoneState, "currentPokemon"> {
  currentPokemon: SafariPokemonFull | null;
}

// ── Reducer action types ────────────────────────────────────────────────

type ReducerAction =
  | { type: "ENTER_SAFARI"; region: string }
  | { type: "USE_STEPS"; steps: number }
  | {
      type: "ENCOUNTER";
      pokemon: SafariPokemonFull;
    }
  | { type: "THROW_BALL" }
  | { type: "THROW_ROCK" }
  | { type: "THROW_BAIT" }
  | { type: "RUN" }
  | { type: "CONTINUE" }
  | { type: "EXIT_SAFARI" }
  | { type: "RESET" };

// ── Initial state ───────────────────────────────────────────────────────

const initialState: InternalSafariState = {
  phase: "entrance",
  ballsRemaining: 30,
  stepsRemaining: 500,
  currentPokemon: null,
  caughtPokemon: [],
  lastAction: null,
  lastResult: null,
  isCaught: false,
  isFled: false,
  region: "kanto",
};

// ── Weighted random selection from encounter pool ───────────────────────

const RARITY_WEIGHTS: Record<string, number> = {
  common: 60,
  uncommon: 30,
  rare: 10,
};

function weightedRandom(pool: SafariEncounterDef[]): SafariEncounterDef {
  const totalWeight = pool.reduce(
    (sum, entry) => sum + (RARITY_WEIGHTS[entry.rarity] ?? 30),
    0
  );
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= RARITY_WEIGHTS[entry.rarity] ?? 30;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1];
}

// ── Reducer ─────────────────────────────────────────────────────────────

function safariReducer(
  state: InternalSafariState,
  action: ReducerAction
): InternalSafariState {
  switch (action.type) {
    case "ENTER_SAFARI":
      return {
        ...initialState,
        phase: "walking",
        region: action.region,
        ballsRemaining: 30,
        stepsRemaining: 500,
      };

    case "USE_STEPS":
      return {
        ...state,
        stepsRemaining: Math.max(0, state.stepsRemaining - action.steps),
      };

    case "ENCOUNTER":
      return {
        ...state,
        phase: "encounter",
        currentPokemon: action.pokemon,
        isCaught: false,
        isFled: false,
        lastAction: null,
        lastResult: null,
      };

    case "THROW_BALL": {
      if (!state.currentPokemon || state.ballsRemaining <= 0) return state;

      const p = state.currentPokemon;
      const newBalls = state.ballsRemaining - 1;
      const catchChance = Math.min(1, p.baseCatchRate * p.catchModifier);
      const caught = Math.random() < catchChance;

      if (caught) {
        const entry: SafariCaughtEntry = {
          pokemon: p.pokemon,
          level: p.level,
          isShiny: p.isShiny,
        };
        return {
          ...state,
          ballsRemaining: newBalls,
          phase: "catch_result",
          isCaught: true,
          isFled: false,
          lastAction: "ball",
          lastResult: `You caught ${p.pokemon.name}!`,
          caughtPokemon: [...state.caughtPokemon, entry],
        };
      }

      // Missed — check flee
      const fleeChance = Math.min(1, p.baseFleeRate * p.fleeModifier);
      const fled = Math.random() < fleeChance;

      if (fled) {
        return {
          ...state,
          ballsRemaining: newBalls,
          phase: "catch_result",
          isCaught: false,
          isFled: true,
          lastAction: "ball",
          lastResult: `${p.pokemon.name} fled!`,
        };
      }

      // Still in encounter
      return {
        ...state,
        ballsRemaining: newBalls,
        lastAction: "ball",
        lastResult: `You missed ${p.pokemon.name}!`,
      };
    }

    case "THROW_ROCK": {
      if (!state.currentPokemon) return state;

      const p = state.currentPokemon;
      const updated: SafariPokemonFull = {
        ...p,
        catchModifier: Math.min(4, Math.max(0.25, p.catchModifier * 2)),
        fleeModifier: Math.min(4, Math.max(0.25, p.fleeModifier * 2)),
      };

      // Immediate flee check with new flee modifier
      const fleeChance = Math.min(1, updated.baseFleeRate * updated.fleeModifier);
      const fled = Math.random() < fleeChance;

      if (fled) {
        return {
          ...state,
          currentPokemon: updated,
          phase: "catch_result",
          isCaught: false,
          isFled: true,
          lastAction: "rock",
          lastResult: `${p.pokemon.name} fled after being hit by a rock!`,
        };
      }

      return {
        ...state,
        currentPokemon: updated,
        lastAction: "rock",
        lastResult: `${p.pokemon.name} is angry! Catch rate up, but it might flee!`,
      };
    }

    case "THROW_BAIT": {
      if (!state.currentPokemon) return state;

      const p = state.currentPokemon;
      const updated: SafariPokemonFull = {
        ...p,
        fleeModifier: Math.min(4, Math.max(0.25, p.fleeModifier * 0.5)),
        catchModifier: Math.min(4, Math.max(0.25, p.catchModifier * 0.5)),
      };

      // Immediate flee check with new flee modifier
      const fleeChance = Math.min(1, updated.baseFleeRate * updated.fleeModifier);
      const fled = Math.random() < fleeChance;

      if (fled) {
        return {
          ...state,
          currentPokemon: updated,
          phase: "catch_result",
          isCaught: false,
          isFled: true,
          lastAction: "bait",
          lastResult: `${p.pokemon.name} ate the bait and fled!`,
        };
      }

      return {
        ...state,
        currentPokemon: updated,
        lastAction: "bait",
        lastResult: `${p.pokemon.name} is watching the bait. It's less likely to flee, but harder to catch.`,
      };
    }

    case "RUN":
      return {
        ...state,
        phase: "walking",
        currentPokemon: null,
        isCaught: false,
        isFled: false,
        lastAction: "run",
        lastResult: "Got away safely!",
      };

    case "CONTINUE":
      return {
        ...state,
        phase: "walking",
        currentPokemon: null,
        isCaught: false,
        isFled: false,
        lastAction: null,
        lastResult: null,
      };

    case "EXIT_SAFARI":
      return {
        ...state,
        phase: "summary",
        currentPokemon: null,
      };

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useSafariZone() {
  const [state, dispatch] = useReducer(safariReducer, initialState);
  const [isSearching, setIsSearching] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const enterSafari = useCallback((region: string) => {
    dispatch({ type: "ENTER_SAFARI", region });
  }, []);

  const searchingRef = useRef(false);

  const search = useCallback(async () => {
    if (searchingRef.current) return;
    const s = stateRef.current;
    if (s.phase !== "walking") return;
    searchingRef.current = true;
    setIsSearching(true);

    const stepCost = 15 + Math.floor(Math.random() * 11); // 15-25

    // Check if out of steps after this search
    if (s.stepsRemaining - stepCost <= 0) {
      dispatch({ type: "EXIT_SAFARI" });
      setIsSearching(false);
      searchingRef.current = false;
      return;
    }

    dispatch({ type: "USE_STEPS", steps: stepCost });

    // 70% chance of encounter
    if (Math.random() < 0.7) {
      const pool =
        SAFARI_ENCOUNTERS[s.region] ?? SAFARI_ENCOUNTERS.kanto;
      const encounter = weightedRandom(pool);

      try {
        const pokemon: Pokemon = await fetchPokemonData(encounter.pokemonId);

        const level =
          encounter.minLevel +
          Math.floor(
            Math.random() * (encounter.maxLevel - encounter.minLevel + 1)
          );
        const isShiny = Math.random() < SHINY_RATE;

        dispatch({
          type: "ENCOUNTER",
          pokemon: {
            pokemon,
            level,
            catchModifier: 1,
            fleeModifier: 1,
            isShiny,
            baseCatchRate: encounter.baseCatchRate,
            baseFleeRate: encounter.baseFleeRate,
          },
        });
      } catch (e) {
        silentWarn("safariEncounterFetch", e);
      }
    }

    setIsSearching(false);
    searchingRef.current = false;
  }, []);

  const throwBall = useCallback(() => {
    dispatch({ type: "THROW_BALL" });
  }, []);

  const throwRock = useCallback(() => {
    dispatch({ type: "THROW_ROCK" });
  }, []);

  const throwBait = useCallback(() => {
    dispatch({ type: "THROW_BAIT" });
  }, []);

  const run = useCallback(() => {
    dispatch({ type: "RUN" });
  }, []);

  const continueAfterResult = useCallback(() => {
    if (state.ballsRemaining <= 0 || state.stepsRemaining <= 0) {
      dispatch({ type: "EXIT_SAFARI" });
    } else {
      dispatch({ type: "CONTINUE" });
    }
  }, [state.ballsRemaining, state.stepsRemaining]);

  const exitSafari = useCallback(() => {
    dispatch({ type: "EXIT_SAFARI" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Expose state cast to the public SafariZoneState type
  const publicState = state as SafariZoneState;

  return {
    state: publicState,
    isSearching,
    enterSafari,
    search,
    throwBall,
    throwRock,
    throwBait,
    run,
    continueAfterResult,
    exitSafari,
    reset,
  };
}
