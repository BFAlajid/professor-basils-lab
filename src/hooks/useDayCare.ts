"use client";

import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { DayCareState, DayCareAction, BreedingPair, PCBoxPokemon, BreedingEgg } from "@/types";
import { fetchEggGroups, checkCompatibility, getOffspringSpeciesId, createEgg } from "@/utils/breedingWasm";
import { NATURES } from "@/data/natures";
import { generateRandomIVs } from "@/utils/wildBattle";
import { fetchPokemonData } from "@/utils/pokeApiClient";

const STORAGE_KEY = "pokemon-daycare";

const initialState: DayCareState = {
  currentPair: null,
  eggs: [],
  isCompatible: false,
  compatibilityMessage: "Select two Pokemon to check compatibility.",
};

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

export function useDayCare(box: PCBoxPokemon[]) {
  const [state, dispatch] = useReducer(dayCareReducer, initialState);
  const [isCheckingCompat, setIsCheckingCompat] = useState(false);
  const initialized = useRef(false);
  const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        dispatch({ type: "LOAD", pair: data.pair ?? null, eggs: data.eggs ?? [] });
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pair: state.currentPair, eggs: state.eggs }));
    } catch {
      // ignore
    }
  }, [state.currentPair, state.eggs]);

  // Step counter interval — advances eggs every 3 seconds
  useEffect(() => {
    if (state.eggs.some((e) => !e.isHatched)) {
      stepInterval.current = setInterval(() => {
        dispatch({ type: "ADVANCE_STEPS", steps: 128 });
      }, 3000);
    }
    return () => {
      if (stepInterval.current) clearInterval(stepInterval.current);
    };
  }, [state.eggs]);

  // Check compatibility when pair changes
  useEffect(() => {
    if (!state.currentPair) return;
    const p1 = box[state.currentPair.parent1Index];
    const p2 = box[state.currentPair.parent2Index];
    if (!p1 || !p2) return;

    setIsCheckingCompat(true);
    Promise.all([
      fetchEggGroups(p1.pokemon.id),
      fetchEggGroups(p2.pokemon.id),
    ]).then(([groups1, groups2]) => {
      const isDitto1 = p1.pokemon.name === "ditto";
      const isDitto2 = p2.pokemon.name === "ditto";
      const result = checkCompatibility(groups1, groups2, isDitto1, isDitto2);
      // Mutate state directly through a fresh SET_PAIR won't help, so we use a small hack:
      // We just update the compatibility fields based on the check
      dispatch({ type: "SET_PAIR", pair: state.currentPair! });
      // We store compatibility in local state since it's derived
      setCompatState(result);
    }).finally(() => setIsCheckingCompat(false));
  }, [state.currentPair, box]);

  const [compatState, setCompatState] = useState<{ compatible: boolean; message: string }>({
    compatible: false,
    message: "Select two Pokemon to check compatibility.",
  });

  const setPair = useCallback((pair: BreedingPair) => {
    dispatch({ type: "SET_PAIR", pair });
  }, []);

  const clearPair = useCallback(() => {
    dispatch({ type: "CLEAR_PAIR" });
    setCompatState({ compatible: false, message: "Select two Pokemon to check compatibility." });
  }, []);

  const collectEgg = useCallback(async () => {
    if (!state.currentPair || !compatState.compatible) return;
    const p1 = box[state.currentPair.parent1Index];
    const p2 = box[state.currentPair.parent2Index];
    if (!p1 || !p2) return;

    const speciesId = await getOffspringSpeciesId(p1, p2);
    // Fetch species name
    let speciesName = p1.pokemon.name;
    try {
      const data = await fetchPokemonData(speciesId);
      speciesName = data.name;
    } catch {
      // use parent name
    }

    const egg = createEgg(p1, p2, speciesId, speciesName);
    dispatch({ type: "CREATE_EGG", egg });
  }, [state.currentPair, compatState.compatible, box]);

  const hatchEgg = useCallback(async (index: number) => {
    const egg = state.eggs[index];
    if (!egg || egg.isHatched || egg.stepsCompleted < egg.stepsRequired) return;

    // Fetch the offspring Pokemon data
    let pokemon;
    try {
      pokemon = await fetchPokemonData(egg.speciesId);
    } catch {
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
