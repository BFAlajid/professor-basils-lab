"use client";

import { useReducer, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MysteryGiftState,
  MysteryGiftAction,
  MysteryGiftDefinition,
  PCBoxPokemon,
  IVSpread,
  Pokemon,
} from "@/types";
import { getTodaysGift } from "@/data/mysteryGifts";
import { NATURES } from "@/data/natures";
import { generateRandomIVs } from "@/utils/wildBattle";

const STORAGE_KEY = "pokemon-mystery-gift";

const initialState: MysteryGiftState = {
  claimedDates: [],
  totalClaimed: 0,
};

function mysteryGiftReducer(
  state: MysteryGiftState,
  action: MysteryGiftAction
): MysteryGiftState {
  switch (action.type) {
    case "CLAIM":
      return {
        claimedDates: [...state.claimedDates, action.date],
        totalClaimed: state.totalClaimed + 1,
      };
    case "LOAD":
      return {
        claimedDates: action.claimedDates,
        totalClaimed: action.totalClaimed,
      };
    default:
      return state;
  }
}

export function useMysteryGift() {
  const [state, dispatch] = useReducer(mysteryGiftReducer, initialState);
  const initialized = useRef(false);

  // Load from localStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.claimedDates)) {
          dispatch({
            type: "LOAD",
            claimedDates: parsed.claimedDates,
            totalClaimed: parsed.totalClaimed ?? parsed.claimedDates.length,
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const todaysGift = useMemo<{
    gift: MysteryGiftDefinition;
    reason: string;
  } | null>(() => {
    try {
      return getTodaysGift();
    } catch {
      return null;
    }
  }, []);

  const isClaimedToday = useMemo<boolean>(() => {
    const today = new Date().toISOString().split("T")[0];
    return state.claimedDates.includes(today);
  }, [state.claimedDates]);

  const claimGift = useCallback(async (): Promise<PCBoxPokemon | null> => {
    const today = new Date().toISOString().split("T")[0];

    // Already claimed today
    if (state.claimedDates.includes(today)) return null;

    const giftResult = getTodaysGift();
    if (!giftResult) return null;
    const gift = giftResult.gift;

    // Fetch the Pokemon from PokeAPI
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${gift.pokemonId}`
    );
    if (!res.ok) return null;
    const data: Pokemon = await res.json();

    // Nature: use gift-specified nature or random
    const nature = gift.nature
      ? NATURES.find((n) => n.name === gift.nature) ??
        NATURES[Math.floor(Math.random() * NATURES.length)]
      : NATURES[Math.floor(Math.random() * NATURES.length)];

    // IVs: generate random, then override perfect stats
    const ivs: IVSpread = generateRandomIVs();
    if (gift.perfectIvStats) {
      for (const stat of gift.perfectIvStats) {
        ivs[stat] = 31;
      }
    }

    // Ability: random from species abilities, or first if only one
    const abilities = data.abilities ?? [];
    const ability =
      abilities.length > 1
        ? abilities[Math.floor(Math.random() * abilities.length)].ability.name
        : abilities[0]?.ability.name ?? "unknown";

    const pokemon: PCBoxPokemon = {
      pokemon: data,
      nickname: undefined,
      caughtWith: gift.ballType,
      caughtInArea: "Mystery Gift",
      caughtDate: new Date().toISOString(),
      level: gift.level,
      nature,
      ivs,
      ability,
      isShiny: gift.isShiny ?? false,
    };

    dispatch({ type: "CLAIM", date: today });

    return pokemon;
  }, [state.claimedDates]);

  return {
    state,
    todaysGift,
    isClaimedToday,
    claimGift,
  };
}
