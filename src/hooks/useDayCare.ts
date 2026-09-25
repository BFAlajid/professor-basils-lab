"use client";

import { useReducer, useEffect, useRef, useCallback, useState, useMemo } from "react";
import { silentWarn } from "@/utils/silentWarn";
import { DayCareState, DayCareAction, BreedingPair, PCBoxPokemon } from "@/types";
import { fetchEggGroups, checkCompatibility, getOffspringSpeciesId, createEgg } from "@/utils/breedingWasm";
import { NATURES } from "@/data/natures";
import { generateRandomIVs } from "@/utils/wildBattle";
import { fetchPokemonData } from "@/utils/pokeApiClient";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/utils/persistence";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";

const initialState: DayCareState = {
  currentPair: null,
  eggs: [],
  isCompatible: false,
  compatibilityMessage: "Select two Pokemon to check compatibility.",
};

function pairsEqual(a: BreedingPair | null, b: BreedingPair | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.parent1Index === b.parent1Index && a.parent2Index === b.parent2Index;
}

function dayCareReducer(state: DayCareState, action: DayCareAction): DayCareState {
  switch (action.type) {
    case "SET_PAIR":
      return { ...state, currentPair: action.pair };
    case "CLEAR_PAIR":
      return { ...state, currentPair: null, isCompatible: false, compatibilityMessage: "Select two Pokemon to check compatibility." };
    case "CREATE_EGG":
      return { ...state, eggs: [...state.eggs, action.egg] };
    case "ADVANCE_STEPS":
      return {
        ...state,
        eggs: state.eggs.map((egg) =>
          egg.isHatched ? egg : { ...egg, stepsCompleted: Math.min(egg.stepsCompleted + action.steps, egg.stepsRequired) }
        ),
      };
    case "HATCH_EGG":
      return {
        ...state,
        eggs: state.eggs.map((egg, i) =>
          i === action.index ? { ...egg, isHatched: true, hatchedPokemon: action.pokemon } : egg
        ),
      };
    case "REMOVE_EGG":
      return { ...state, eggs: state.eggs.filter((_, i) => i !== action.index) };
    case "LOAD":
      return { ...state, currentPair: action.pair, eggs: action.eggs };
    default:
      return state;
  }
}

interface PersistedDayCare {
  pair: BreedingPair | null;
  eggs: DayCareState["eggs"];
}

/** Lazy-load the saved pair/eggs from storage (SSR-safe: window is undefined on the server). */
function loadInitialState(): DayCareState {
  const data = readStorage<Partial<PersistedDayCare>>(STORAGE_KEYS.dayCare, {});
  return { ...initialState, currentPair: data.pair ?? null, eggs: data.eggs ?? [] };
}

export function useDayCare(box: PCBoxPokemon[]) {
  const [state, dispatch] = useReducer(dayCareReducer, undefined, loadInitialState);
  const boxRef = useRef(box);
  useEffect(() => {
    boxRef.current = box;
  });
  const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist to storage, debounced — eggs tick every 3s while incubating
  // (see the step interval below), which would otherwise re-serialize the
  // pair + full egg list on every tick.
  const persisted = useMemo<PersistedDayCare>(
    () => ({ pair: state.currentPair, eggs: state.eggs }),
    [state.currentPair, state.eggs]
  );
  useDebouncedPersist(persisted, useCallback((data: PersistedDayCare) => {
    writeStorage(STORAGE_KEYS.dayCare, data);
  }, []));

  // Stable boolean dep to avoid re-creating interval on every egg state change
  const hasUnhatchedEggs = useMemo(() => state.eggs.some((e) => !e.isHatched), [state.eggs]);

  // Step counter interval — advances eggs every 3 seconds
  useEffect(() => {
    if (hasUnhatchedEggs) {
      stepInterval.current = setInterval(() => {
        dispatch({ type: "ADVANCE_STEPS", steps: 128 });
      }, 3000);
    }
    return () => {
      if (stepInterval.current) clearInterval(stepInterval.current);
    };
  }, [hasUnhatchedEggs]);

  const [compatState, setCompatState] = useState<{ pair: BreedingPair | null; compatible: boolean; message: string }>({
    pair: null,
    compatible: false,
    message: "Select two Pokemon to check compatibility.",
  });

  // "Checking" is derived rather than a separate setState-in-effect: true whenever
  // a pair is selected but compatState hasn't caught up to it yet (covers both the
  // initial fetch and any newer pair superseding an in-flight one).
  const isCheckingCompat = state.currentPair !== null && !pairsEqual(compatState.pair, state.currentPair);

  // Check compatibility when pair changes (use boxRef to avoid re-running on every box mutation)
  useEffect(() => {
    if (!state.currentPair) return;
    const pairAtStart = state.currentPair;
    const currentBox = boxRef.current;
    const p1 = currentBox[pairAtStart.parent1Index];
    const p2 = currentBox[pairAtStart.parent2Index];
    if (!p1 || !p2) return;

    // Ignore-flag guard: if the pair changes again before this fetch resolves,
    // the cleanup below flips `ignore` so the stale result can't overwrite the
    // compatibility state for the newer pair.
    let ignore = false;
    Promise.all([
      fetchEggGroups(p1.pokemon.id),
      fetchEggGroups(p2.pokemon.id),
    ]).then(([groups1, groups2]) => {
      if (ignore) return;
      const isDitto1 = p1.pokemon.name === "ditto";
      const isDitto2 = p2.pokemon.name === "ditto";
      const result = checkCompatibility(groups1, groups2, isDitto1, isDitto2);
      setCompatState({ pair: pairAtStart, ...result });
    });

    return () => {
      ignore = true;
    };
  }, [state.currentPair]);

  const setPair = useCallback((pair: BreedingPair) => {
    dispatch({ type: "SET_PAIR", pair });
  }, []);

  const clearPair = useCallback(() => {
    dispatch({ type: "CLEAR_PAIR" });
    setCompatState({ pair: null, compatible: false, message: "Select two Pokemon to check compatibility." });
  }, []);

  const collectEgg = useCallback(async () => {
    if (!state.currentPair || !compatState.compatible) return;
    const currentBox = boxRef.current;
    const p1 = currentBox[state.currentPair.parent1Index];
    const p2 = currentBox[state.currentPair.parent2Index];
    if (!p1 || !p2) return;

    const speciesId = await getOffspringSpeciesId(p1, p2);
    // Fetch species name
    let speciesName = p1.pokemon.name;
    try {
      const data = await fetchPokemonData(speciesId);
      speciesName = data.name;
    } catch (e) {
      silentWarn("fetchOffspringSpecies", e);
    }

    const egg = createEgg(p1, p2, speciesId, speciesName);
    dispatch({ type: "CREATE_EGG", egg });
  }, [state.currentPair, compatState.compatible]);

  const hatchEgg = useCallback(async (index: number) => {
    const egg = state.eggs[index];
    if (!egg || egg.isHatched || egg.stepsCompleted < egg.stepsRequired) return;

    // Fetch the offspring Pokemon data
    let pokemon;
    try {
      pokemon = await fetchPokemonData(egg.speciesId);
    } catch (e) {
      silentWarn("hatchEggFetchPokemon", e);
      return;
    }

    // Build IV spread from inheritance
    const ivs = generateRandomIVs();
    for (const { stat, fromParent } of egg.inheritedIVs) {
      ivs[stat] = fromParent === 1 ? egg.parent1.ivs[stat] : egg.parent2.ivs[stat];
    }

    const hatched: PCBoxPokemon = {
      pokemon,
      caughtWith: "poke-ball",
      caughtInArea: "Day Care",
      caughtDate: new Date().toISOString(),
      level: 1,
      nature: egg.inheritedNature === 1 ? egg.parent1.nature : egg.inheritedNature === 2 ? egg.parent2.nature : NATURES[Math.floor(Math.random() * NATURES.length)],
      ivs,
      ability: egg.inheritedAbility,
    };

    dispatch({ type: "HATCH_EGG", index, pokemon: hatched });
  }, [state.eggs]);

  const removeEgg = useCallback((index: number) => {
    dispatch({ type: "REMOVE_EGG", index });
  }, []);

  return {
    state: {
      ...state,
      isCompatible: compatState.compatible,
      compatibilityMessage: compatState.message,
    },
    isCheckingCompat,
    setPair,
    clearPair,
    collectEgg,
    hatchEgg,
    removeEgg,
  };
}
