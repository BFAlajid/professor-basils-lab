import type { Pokemon, TypeName, StatusCondition } from "./pokemon";
import type { TeamSlot, EVSpread } from "./team";

// --- Elite Four & Battle Facility ---

export interface EliteFourMember {
  name: string;
  title: string;
  specialty: TypeName | "mixed";
  quote: string;
  prizeMoney?: number;
  team: {
    pokemonId: number;
    moves: string[];
    ability?: string;
    nature?: string;
    evSpread?: EVSpread;
    heldItem?: string;
  }[];
}

export type BattleFacilityMode = "elite_four" | "battle_tower" | "gym_challenge";
export type BattleFacilityPhase =
  | "lobby"
  | "pre_battle"
  | "battling"
  | "between_battles"
  | "victory"
  | "defeat";

export interface BattleFacilityState {
  mode: BattleFacilityMode;
  phase: BattleFacilityPhase;
  currentOpponentIndex: number;
  totalOpponents: number;
  wins: number;
  streak: number;
  bestStreak: number;
  teamHpPercents: number[];
  teamStatuses: (StatusCondition)[];
  opponents: EliteFourMember[];
  badges?: string[];
}

// --- Safari Zone ---

export type SafariPhase =
  | "entrance"
  | "walking"
  | "encounter"
  | "throwing"
  | "catch_result"
  | "summary";

export type SafariAction = "ball" | "rock" | "bait" | "run";

export interface SafariPokemonState {
  pokemon: Pokemon;
  level: number;
  catchModifier: number;
  fleeModifier: number;
  isShiny: boolean;
}

export interface SafariCaughtEntry {
  pokemon: Pokemon;
  level: number;
  isShiny: boolean;
}

export interface SafariZoneState {
  phase: SafariPhase;
  ballsRemaining: number;
  stepsRemaining: number;
  currentPokemon: SafariPokemonState | null;
  caughtPokemon: SafariCaughtEntry[];
  lastAction: SafariAction | null;
  lastResult: string | null;
  isCaught: boolean;
  isFled: boolean;
  region: string;
}
