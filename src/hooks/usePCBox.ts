"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { silentWarn } from "@/utils/silentWarn";
import { PCBoxPokemon, PCBoxAction, BallType, TeamSlot } from "@/types";
import { DEFAULT_BALL_INVENTORY } from "@/data/pokeBalls";
import { DEFAULT_EVS } from "@/utils/stats";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import { STORAGE_KEYS, readStorage, readStorageValidated, writeStorage } from "@/utils/persistence";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import { toSlimBoxEntry, fromSlimBoxEntry, isLegacyBoxEntry, normalizeStoredBoxEntry, SlimBoxEntry } from "@/utils/pcBoxStorage";

function pcBoxReducer(state: PCBoxPokemon[], action: PCBoxAction): PCBoxPokemon[] {
  switch (action.type) {
    case "ADD_POKEMON":
      return [...state, action.pokemon];
    case "REMOVE_POKEMON":
      return state.filter((_, i) => i !== action.index);
    case "SET_NICKNAME":
      return state.map((p, i) =>
        i === action.index ? { ...p, nickname: action.nickname } : p
      );
    case "UPDATE_POKEMON":
      return state.map((p, i) =>
        i === action.index ? { ...p, ...action.updates } : p
      );
    case "LOAD_BOX":
      return action.pokemon;
    default:
      return state;
  }
}

function validateBallInventory(raw: unknown): Record<BallType, number> | null {
  if (raw == null || typeof raw !== "object") return null;
  return { ...DEFAULT_BALL_INVENTORY, ...(raw as Record<BallType, number>) };
}

export function usePCBox() {
  const [box, dispatch] = useReducer(pcBoxReducer, []);
  const [ballInventory, setBallInventory] = useState<Record<BallType, number>>(() =>
    readStorageValidated(STORAGE_KEYS.ballInventory, { ...DEFAULT_BALL_INVENTORY }, validateBallInventory)
  );

  // Whether the box has finished its initial load (see the hydration effect
  // below). Gates the debounced persist effect so it can't schedule a write
  // of the empty placeholder state ahead of the real loaded data — see
  // useDebouncedPersist's `enabled` docs.
  const [isHydrated, setIsHydrated] = useState(false);
  const startedHydration = useRef(false);

  // Slim form of entries whose hydration fetch failed (e.g. a transient PokeAPI
  // error or a proxy rate-limit), paired with their index in the raw stored
  // array. Kept here — separate from `box`, which only ever holds
  // fully-hydrated entries — so the persist effect below can re-serialize them
  // untouched instead of silently dropping them, AND splice them back at their
  // original position instead of appending at the tail (a tail-append reorders
  // the box on every failed-hydration session and makes isAlreadyCaught()/
  // box.length blind to the missing species). Cleared implicitly: a future
  // reload retries the fetch for whatever's still stored.
  const unhydratedEntriesRef = useRef<{ index: number; entry: SlimBoxEntry }[]>([]);

  // Load + migrate the box on mount. Box entries used to persist the FULL
  // PokeAPI Pokemon object (20-100KB, re-serialized on every catch) — new
  // entries persist only `pokemonId` and rehydrate the full object from
  // pokeApiClient's in-memory cache. Old-format entries already embed the
  // full object (no fetch needed); new-format entries need one fetch each.
  useEffect(() => {
    if (startedHydration.current) return;
    startedHydration.current = true;

    const raw = readStorage<unknown[]>(STORAGE_KEYS.pcBox, []);
    const entriesToHydrate = Array.isArray(raw) ? raw : [];

    Promise.all(
      entriesToHydrate.map(async (entry, index): Promise<PCBoxPokemon | null> => {
        if (isLegacyBoxEntry(entry)) return entry;
        const slim = normalizeStoredBoxEntry(entry);
        if (!slim) return null;
        try {
          const pokemon = await fetchPokemonData(slim.pokemonId);
          return fromSlimBoxEntry(slim, pokemon);
        } catch (e) {
          silentWarn("hydratePCBoxEntry", e);
          // Keep it around (verbatim, with its original slot index) so the
          // next persist doesn't erase it or silently move it to the tail.
          unhydratedEntriesRef.current.push({ index, entry: slim });
          return null;
        }
      })
    ).then((entries) => {
      const valid = entries.filter((p): p is PCBoxPokemon => p !== null);
      if (valid.length > 0) dispatch({ type: "LOAD_BOX", pokemon: valid });
      setIsHydrated(true);
    });
  }, []);

  // Persist box (slimmed), debounced so rapid catches don't each
  // re-serialize the full Pokemon payload of every box entry. Entries that
  // failed to hydrate are spliced back in at their original stored index
  // (lowest index first, so each splice position is already correct once the
  // lower-indexed entries are in place) instead of being appended untouched
  // at the tail — a tail-append silently reorders the box and makes it look
  // like those species were never caught.
  useDebouncedPersist(
    box,
    useCallback((current: PCBoxPokemon[]) => {
      const merged: SlimBoxEntry[] = current.map(toSlimBoxEntry);
      const failed = [...unhydratedEntriesRef.current].sort((a, b) => a.index - b.index);
      for (const { index, entry } of failed) {
        merged.splice(Math.min(index, merged.length), 0, entry);
      }
      writeStorage(STORAGE_KEYS.pcBox, merged);
    }, []),
    undefined,
    isHydrated,
  );

  // Save balls to storage
  useEffect(() => {
    writeStorage(STORAGE_KEYS.ballInventory, ballInventory);
  }, [ballInventory]);

  const addToBox = useCallback((pokemon: PCBoxPokemon) => {
    dispatch({ type: "ADD_POKEMON", pokemon });
  }, []);

  const removeFromBox = useCallback((index: number) => {
    dispatch({ type: "REMOVE_POKEMON", index });
  }, []);

  const setNickname = useCallback((index: number, nickname: string) => {
    dispatch({ type: "SET_NICKNAME", index, nickname });
  }, []);

  const updatePokemon = useCallback((index: number, updates: Partial<PCBoxPokemon>) => {
    dispatch({ type: "UPDATE_POKEMON", index, updates });
  }, []);

  const moveToTeam = useCallback((index: number): TeamSlot | null => {
    const pokemon = box[index];
    if (!pokemon) return null;

    return {
      pokemon: pokemon.pokemon,
      position: 0,
      nature: pokemon.nature,
      evs: { ...DEFAULT_EVS },
      ivs: pokemon.ivs,
      ability: pokemon.ability,
      heldItem: null,
      selectedMoves: [],
    };
  }, [box]);

  const addBalls = useCallback((ball: BallType, qty: number) => {
    setBallInventory((prev) => ({ ...prev, [ball]: (prev[ball] ?? 0) + qty }));
  }, []);

  const useBall = useCallback((ball: BallType): boolean => {
    let success = false;
    setBallInventory((prev) => {
      if ((prev[ball] ?? 0) <= 0) return prev;
      success = true;
      return { ...prev, [ball]: prev[ball] - 1 };
    });
    return success;
  }, []);

  const isAlreadyCaught = useCallback((pokemonId: number): boolean => {
    return box.some((p) => p.pokemon.id === pokemonId);
  }, [box]);

  return {
    box,
    ballInventory,
    addToBox,
    removeFromBox,
    setNickname,
    updatePokemon,
    moveToTeam,
    addBalls,
    useBall,
    isAlreadyCaught,
  };
}
