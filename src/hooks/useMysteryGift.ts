"use client";

import { useReducer, useEffect, useCallback, useRef, useMemo, useState } from "react";
import { silentWarn } from "@/utils/silentWarn";
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
import { fetchPokemonData } from "@/utils/pokeApiClient";

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
  const claimingRef = useRef(false);

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
    } catch (e) {
      silentWarn("loadMysteryGift", e);
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      silentWarn("saveMysteryGift", e);
    }
  }, [state]);

  const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10));

  // Check for date rollover every 60s
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date().toISOString().slice(0, 10);
      if (now !== dateKey) setDateKey(now);
    }, 60_000);
    return () => clearInterval(id);
  }, [dateKey]);

  const todaysGift = useMemo<{
    gift: MysteryGiftDefinition;
    reason: string;
  } | null>(() => {
    try {
      return getTodaysGift();
    } catch (e) {
      silentWarn("getTodaysGift", e);
      return null;
    }
  }, [dateKey]);

  const isClaimedToday = useMemo<boolean>(() => {
    const today = new Date().toISOString().split("T")[0];
    return state.claimedDates.includes(today);
  }, [state.claimedDates]);

  const claimGift = useCallback(async (): Promise<PCBoxPokemon | null> => {
    if (claimingRef.current) return null;
    claimingRef.current = true;

    try {
    const today = new Date().toISOString().split("T")[0];

    // Already claimed today
    if (state.claimedDates.includes(today)) return null;

    const giftResult = getTodaysGift();
    if (!giftResult) return null;
    const gift = giftResult.gift;

    // Fetch the Pokemon from PokeAPI
    let data: Pokemon;
    try {
      data = await fetchPokemonData(gift.pokemonId);
    } catch {
      return null;
    }

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
    } finally {
      claimingRef.current = false;
    }
  }, [state.claimedDates]);

  return {
    state,
    todaysGift,
    isClaimedToday,
    claimGift,
  };
}
