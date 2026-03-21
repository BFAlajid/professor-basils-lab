"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { silentWarn } from "@/utils/silentWarn";
import { PCBoxPokemon, PCBoxAction, BallType, TeamSlot } from "@/types";
import { DEFAULT_BALL_INVENTORY } from "@/data/pokeBalls";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";

const PC_BOX_KEY = "pokemon-team-builder-pc-box";
const BALL_INVENTORY_KEY = "pokemon-team-builder-ball-inventory";

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
    case "LOAD_BOX":
      return action.pokemon;
    default:
      return state;
  }
}

export function usePCBox() {
  const [box, dispatch] = useReducer(pcBoxReducer, []);
  const [ballInventory, setBallInventory] = useState<Record<BallType, number>>({ ...DEFAULT_BALL_INVENTORY });
  const initialized = useRef(false);

  // Load from localStorage
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const savedBox = localStorage.getItem(PC_BOX_KEY);
      if (savedBox) {
        const parsed = JSON.parse(savedBox);
        if (Array.isArray(parsed)) {
          dispatch({ type: "LOAD_BOX", pokemon: parsed });
        }
      }
    } catch (e) {
      silentWarn("loadPCBox", e);
    }

    try {
      const savedBalls = localStorage.getItem(BALL_INVENTORY_KEY);
      if (savedBalls) {
        const parsed = JSON.parse(savedBalls);
        setBallInventory({ ...DEFAULT_BALL_INVENTORY, ...parsed });
      }
    } catch (e) {
      silentWarn("loadBallInventory", e);
    }
  }, []);

  // Save box to localStorage
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(PC_BOX_KEY, JSON.stringify(box));
    } catch (e) {
      silentWarn("savePCBox", e);
    }
  }, [box]);

  // Save balls to localStorage
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(BALL_INVENTORY_KEY, JSON.stringify(ballInventory));
    } catch (e) {
      silentWarn("saveBallInventory", e);
    }
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
    moveToTeam,
    useBall,
    isAlreadyCaught,
  };
}
