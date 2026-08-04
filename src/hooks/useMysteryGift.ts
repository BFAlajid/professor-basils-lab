"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { usePersistedReducer } from "@/hooks/usePersistedReducer";
import { STORAGE_KEYS } from "@/utils/persistence";

const initialState: MysteryGiftState = {
  claimedDates: [],
  totalClaimed: 0,
};

function validateMysteryGiftState(raw: unknown): MysteryGiftState | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as { claimedDates?: unknown; totalClaimed?: unknown };
  if (!Array.isArray(r.claimedDates)) return null;
  const claimedDates = r.claimedDates.filter((d): d is string => typeof d === "string");
  return {
    claimedDates,
    totalClaimed: typeof r.totalClaimed === "number" ? r.totalClaimed : claimedDates.length,
  };
}

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
  const [state, dispatch] = usePersistedReducer(
    STORAGE_KEYS.mysteryGift,
    mysteryGiftReducer,
    initialState,
    validateMysteryGiftState,
  );
  const claimingRef = useRef(false);

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
  // dateKey is a deliberate recompute trigger (date rollover), not a value
  // read inside the callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [state.claimedDates, dispatch]);

  return {
    state,
    todaysGift,
    isClaimedToday,
    claimGift,
  };
}
