"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { Pokemon, TeamSlot, TeamAction, Nature, EVSpread, IVSpread, TypeName } from "@/types";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";
import { fetchPokemonData } from "@/utils/pokeApiClient";

const MAX_TEAM_SIZE = 6;
const STORAGE_KEY = "pokemon-team-builder-team";

function createSlot(pokemon: Pokemon, position: number): TeamSlot {
  return {
    pokemon,
    position,
    nature: null,
    evs: { ...DEFAULT_EVS },
    ivs: { ...DEFAULT_IVS },
    ability: pokemon.abilities?.[0]?.ability.name ?? null,
    heldItem: null,
    selectedMoves: [],
  };
}

function teamReducer(state: TeamSlot[], action: TeamAction): TeamSlot[] {
  switch (action.type) {
    case "ADD_POKEMON": {
      if (state.length >= MAX_TEAM_SIZE) return state;
      if (state.some((s) => s.pokemon.id === action.pokemon.id)) return state;
      const nextPosition =
        state.length > 0
          ? Math.max(...state.map((s) => s.position)) + 1
          : 0;
      return [...state, createSlot(action.pokemon, nextPosition)];
    }
    case "REMOVE_POKEMON":
      return state.filter((s) => s.position !== action.position);
    case "REORDER": {
      const newState = [...state];
      const [moved] = newState.splice(action.from, 1);
      newState.splice(action.to, 0, moved);
      return newState.map((s, i) => ({ ...s, position: i }));
    }
    case "CLEAR_TEAM":
      return [];
    case "SET_TEAM":
      return action.slots;
    case "SET_NATURE":
      return state.map((s) =>
        s.position === action.position ? { ...s, nature: action.nature } : s
      );
    case "SET_EVS":
      return state.map((s) =>
        s.position === action.position ? { ...s, evs: action.evs } : s
      );
    case "SET_IVS":
      return state.map((s) =>
        s.position === action.position ? { ...s, ivs: action.ivs } : s
      );
    case "SET_ABILITY":
      return state.map((s) =>
        s.position === action.position ? { ...s, ability: action.ability } : s
      );
    case "SET_HELD_ITEM":
      return state.map((s) =>
        s.position === action.position ? { ...s, heldItem: action.item } : s
      );
    case "SET_MOVES":
      return state.map((s) =>
        s.position === action.position ? { ...s, selectedMoves: action.moves } : s
      );
    case "SET_TERA_TYPE":
      return state.map((s) =>
        s.position === action.position ? { ...s, teraConfig: { teraType: action.teraType } } : s
      );
    case "SET_FORME":
      return state.map((s) =>
        s.position === action.position ? { ...s, formeOverride: action.forme } : s
      );
    default:
      return state;
  }
}

interface SavedSlot {
  pokemonId: number;
  nature: Nature | null;
  evs: EVSpread;
  ivs: IVSpread;
  ability: string | null;
  heldItem: string | null;
  selectedMoves: string[];
  teraConfig?: { teraType: TypeName } | null;
  formeOverride?: string | null;
}

function saveTeamData(slots: TeamSlot[]) {
  if (typeof window === "undefined") return;
  const data: SavedSlot[] = slots.map((s) => ({
    pokemonId: s.pokemon.id,
    nature: s.nature ?? null,
    evs: s.evs ?? DEFAULT_EVS,
    ivs: s.ivs ?? DEFAULT_IVS,
    ability: s.ability ?? null,
    heldItem: s.heldItem ?? null,
    selectedMoves: s.selectedMoves ?? [],
    teraConfig: s.teraConfig ?? null,
    formeOverride: s.formeOverride ?? null,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadTeamData(): SavedSlot[] | number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function useTeam() {
  const [team, dispatch] = useReducer(teamReducer, []);
  const initialized = useRef(false);

  // Load team from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const saved = loadTeamData();
    if (saved.length === 0) return;

    // Detect old format (number[]) vs new format (SavedSlot[])
    const isOldFormat = typeof saved[0] === "number";

    if (isOldFormat) {
      const ids = saved as number[];
      Promise.all(
        ids.map(async (id) => {
          try {
            return await fetchPokemonData(id) as Pokemon;
          } catch {
            return null;
          }
        })
      ).then((pokemonList) => {
        const slots: TeamSlot[] = pokemonList
          .filter((p): p is Pokemon => p !== null)
          .map((pokemon, i) => createSlot(pokemon, i));
        if (slots.length > 0) {
          dispatch({ type: "SET_TEAM", slots });
        }
      });
    } else {
      const savedSlots = saved as SavedSlot[];
      Promise.all(
        savedSlots.map(async (s) => {
          try {
            const pokemon = await fetchPokemonData(s.pokemonId) as Pokemon;
            return {
              pokemon,
              position: 0,
              nature: s.nature,
              evs: s.evs,
              ivs: s.ivs,
              ability: s.ability,
              heldItem: s.heldItem,
              selectedMoves: s.selectedMoves,
              teraConfig: s.teraConfig ?? undefined,
              formeOverride: s.formeOverride ?? undefined,
            } as TeamSlot;
          } catch {
            return null;
          }
        })
      ).then((slots) => {
        const validSlots = slots
          .filter((s): s is TeamSlot => s !== null)
          .map((s, i) => ({ ...s, position: i }));
        if (validSlots.length > 0) {
          dispatch({ type: "SET_TEAM", slots: validSlots });
        }
      });
    }
  }, []);

  // Save to localStorage whenever team changes
  useEffect(() => {
    if (!initialized.current) return;
    saveTeamData(team);
  }, [team]);

  const addPokemon = useCallback((pokemon: Pokemon) => {
    dispatch({ type: "ADD_POKEMON", pokemon });
  }, []);

  const removePokemon = useCallback((position: number) => {
    dispatch({ type: "REMOVE_POKEMON", position });
  }, []);

  const clearTeam = useCallback(() => {
    dispatch({ type: "CLEAR_TEAM" });
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    dispatch({ type: "REORDER", from, to });
  }, []);

  const setNature = useCallback((position: number, nature: Nature) => {
    dispatch({ type: "SET_NATURE", position, nature });
  }, []);

  const setEvs = useCallback((position: number, evs: EVSpread) => {
    dispatch({ type: "SET_EVS", position, evs });
  }, []);

  const setIvs = useCallback((position: number, ivs: IVSpread) => {
    dispatch({ type: "SET_IVS", position, ivs });
  }, []);

  const setAbility = useCallback((position: number, ability: string) => {
    dispatch({ type: "SET_ABILITY", position, ability });
  }, []);

  const setHeldItem = useCallback((position: number, item: string) => {
    dispatch({ type: "SET_HELD_ITEM", position, item });
  }, []);

  const setMoves = useCallback((position: number, moves: string[]) => {
    dispatch({ type: "SET_MOVES", position, moves });
  }, []);

  const setTeraType = useCallback((position: number, teraType: TypeName) => {
    dispatch({ type: "SET_TERA_TYPE", position, teraType });
  }, []);

  const setForme = useCallback((position: number, forme: string | null) => {
    dispatch({ type: "SET_FORME", position, forme });
  }, []);

  const setTeam = useCallback((slots: TeamSlot[]) => {
    dispatch({ type: "SET_TEAM", slots });
  }, []);

  return {
    team,
    addPokemon,
    removePokemon,
    clearTeam,
    reorder,
    setNature,
    setEvs,
    setIvs,
    setAbility,
    setHeldItem,
    setMoves,
    setTeraType,
    setForme,
    setTeam,
    isFull: team.length >= MAX_TEAM_SIZE,
  };
}

// Encode/decode for URL sharing (full team data)
interface ShareableSlot {
  id: number;
  n?: string;       // nature name
  e?: number[];      // EVs [hp,atk,def,spa,spd,spe]
  i?: number[];      // IVs
  a?: string | null;  // ability
  h?: string | null;  // held item
  m?: string[];      // moves
  t?: string;        // tera type
  f?: string | null;  // forme override
}

export function encodeTeam(team: TeamSlot[]): string {
  const data: ShareableSlot[] = team.map((s) => ({
    id: s.pokemon.id,
    n: s.nature?.name,
    e: s.evs ? [s.evs.hp, s.evs.attack, s.evs.defense, s.evs.spAtk, s.evs.spDef, s.evs.speed] : undefined,
    i: s.ivs ? [s.ivs.hp, s.ivs.attack, s.ivs.defense, s.ivs.spAtk, s.ivs.spDef, s.ivs.speed] : undefined,
    a: s.ability,
    h: s.heldItem,
    m: s.selectedMoves?.length ? s.selectedMoves : undefined,
    t: s.teraConfig?.teraType,
    f: s.formeOverride,
  }));
  return btoa(JSON.stringify(data));
}

export type DecodedTeamData = ShareableSlot[];

export function decodeTeam(encoded: string): number[] | DecodedTeamData {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return [];
  }
}
