import type { IVSpread } from "./team";
import type { PCBoxPokemon } from "./wild";

export interface BreedingEgg {
  id: string;
  parent1: PCBoxPokemon;
  parent2: PCBoxPokemon;
  speciesId: number;
  speciesName: string;
  stepsRequired: number;
  stepsCompleted: number;
  isHatched: boolean;
  hatchedPokemon: PCBoxPokemon | null;
  inheritedIVs: { stat: keyof IVSpread; fromParent: 1 | 2 }[];
  inheritedNature: 1 | 2 | "random";
  inheritedAbility: string;
  eggMoves: string[];
}

export interface BreedingPair {
  parent1Index: number;
  parent2Index: number;
}

export interface DayCareState {
  currentPair: BreedingPair | null;
  eggs: BreedingEgg[];
  isCompatible: boolean;
  compatibilityMessage: string;
}

export type DayCareAction =
  | { type: "SET_PAIR"; pair: BreedingPair }
  | { type: "CLEAR_PAIR" }
  | { type: "CREATE_EGG"; egg: BreedingEgg }
  | { type: "ADVANCE_STEPS"; steps: number }
  | { type: "HATCH_EGG"; index: number; pokemon: PCBoxPokemon }
  | { type: "REMOVE_EGG"; index: number }
  | { type: "LOAD"; pair: BreedingPair | null; eggs: BreedingEgg[] };
