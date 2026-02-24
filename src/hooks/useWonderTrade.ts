"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import {
  WonderTradeState,
  WonderTradeAction,
  WonderTradeRecord,
  PCBoxPokemon,
  IVSpread,
} from "@/types";
import { pickRandomFromPool } from "@/data/wonderTradePool";
import { NATURES } from "@/data/natures";
import { generateRandomIVs } from "@/utils/wildBattle";

const WONDER_TRADE_KEY = "pokemon-wonder-trade";

const initialState: WonderTradeState = {
  phase: "idle",
  selectedBoxIndex: null,
  receivedPokemon: null,
  history: [],
};

function wonderTradeReducer(
  state: WonderTradeState,
  action: WonderTradeAction
): WonderTradeState {
  switch (action.type) {
    case "SELECT_POKEMON":
      return { ...state, phase: "selecting", selectedBoxIndex: action.index };
    case "START_TRADE":
      return { ...state, phase: "searching" };
    case "TRADE_COMPLETE":
      return {
        ...state,
        phase: "result",
        receivedPokemon: action.received,
        history: [action.record, ...state.history].slice(0, 20),
      };
    case "RESET":
      return {
        ...state,
        phase: "idle",
        selectedBoxIndex: null,
        receivedPokemon: null,
      };
    case "LOAD":
      return { ...state, history: action.history };
    default:
      return state;
  }
}

export function useWonderTrade() {
  const [state, dispatch] = useReducer(wonderTradeReducer, initialState);
  const initialized = useRef(false);

  // Load history from localStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const saved = localStorage.getItem(WONDER_TRADE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          dispatch({ type: "LOAD", history: parsed });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(WONDER_TRADE_KEY, JSON.stringify(state.history));
    } catch {
      // ignore
    }
  }, [state.history]);

  const selectPokemon = useCallback((index: number) => {
    dispatch({ type: "SELECT_POKEMON", index });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const executeTrade = useCallback(
    async (box: PCBoxPokemon[]): Promise<PCBoxPokemon | null> => {
      if (state.selectedBoxIndex === null) return null;
      const offeredPokemon = box[state.selectedBoxIndex];
      if (!offeredPokemon) return null;

      dispatch({ type: "START_TRADE" });

      try {
        // Pick a random species from the trade pool
        const poolEntry = pickRandomFromPool();

        // Fetch Pokemon data from PokeAPI
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${poolEntry.pokemonId}`
        );
        if (!response.ok) throw new Error("Failed to fetch Pokemon");
        const pokemonData = await response.json();

        // Random level 1-50
        const level = Math.floor(Math.random() * 50) + 1;

        // Random nature
        const nature = NATURES[Math.floor(Math.random() * NATURES.length)];

        // Random IVs with 3 guaranteed perfect stats
        const ivs: IVSpread = generateRandomIVs();
        const allStats: (keyof IVSpread)[] = [
          "hp",
          "attack",
          "defense",
          "spAtk",
          "spDef",
          "speed",
        ];
        const shuffledStats = [...allStats].sort(() => Math.random() - 0.5);
        const perfectStats = shuffledStats.slice(0, 3);
        for (const stat of perfectStats) {
          ivs[stat] = 31;
        }

        // Random ability from species abilities
        const abilities = pokemonData.abilities ?? [];
        const ability =
          abilities.length > 0
            ? abilities[Math.floor(Math.random() * abilities.length)].ability
                .name
            : "unknown";

        // Shiny chance
        const isShiny = Math.random() < 1 / 4096;

        const receivedPokemon: PCBoxPokemon = {
          pokemon: pokemonData,
          nickname: undefined,
          caughtWith: "poke-ball",
          caughtInArea: "Wonder Trade",
          caughtDate: new Date().toISOString(),
          level,
          nature,
          ivs,
          ability,
          isShiny,
        };

        // Simulate searching delay (2-3 seconds)
        await new Promise((r) =>
          setTimeout(r, 2000 + Math.random() * 1000)
        );

        const record: WonderTradeRecord = {
          id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          offeredPokemon,
          receivedPokemon,
          timestamp: new Date().toISOString(),
        };

        dispatch({ type: "TRADE_COMPLETE", received: receivedPokemon, record });

        return receivedPokemon;
      } catch {
        // On error, reset back to idle
        dispatch({ type: "RESET" });
        return null;
      }
    },
    [state.selectedBoxIndex]
  );

  return {
    state,
    selectPokemon,
    executeTrade,
    reset,
  };
}
