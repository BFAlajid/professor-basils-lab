import type { Pokemon, TypeName, StatusCondition, StatStages } from "./pokemon";
import type { Nature, IVSpread } from "./team";

export type BallType =
  | "poke-ball" | "great-ball" | "ultra-ball" | "master-ball"
  | "quick-ball" | "dusk-ball" | "timer-ball" | "net-ball"
  | "repeat-ball" | "luxury-ball" | "premier-ball" | "dive-ball"
  | "nest-ball" | "heal-ball";

export interface CatchContext {
  turn: number;
  isNight: boolean;
  isCave: boolean;
  isWater: boolean;
  wildPokemonTypes: TypeName[];
  wildPokemonLevel: number;
  playerPokemonLevel: number;
  wildHpPercent: number;
  wildStatus: StatusCondition;
  isRepeatCatch: boolean;
}

export interface BallData {
  name: BallType;
  displayName: string;
  description: string;
  baseModifier: number;
  dynamicModifier?: (context: CatchContext) => number;
  spriteColor: string;
}

export interface WildPokemonData {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  encounterRate: number;
}

export type RouteTheme = "grass" | "cave" | "water" | "forest" | "mountain" | "urban" | "desert";

export interface RouteArea {
  id: string;
  name: string;
  description: string;
  theme: RouteTheme;
  region: string;
  encounterPool: WildPokemonData[];
  position: { x: number; y: number; width: number; height: number };
}

export type WildEncounterPhase = "map" | "encounter_intro" | "battle" | "catching" | "catch_result" | "fled";

export interface WildEncounterState {
  phase: WildEncounterPhase;
  currentArea: RouteArea | null;
  wildPokemon: Pokemon | null;
  wildLevel: number;
  wildCaptureRate: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  wildStatus: StatusCondition;
  wildStatStages: StatStages;
  playerCurrentHp: number;
  playerMaxHp: number;
  playerStatus: StatusCondition;
  playerStatStages: StatStages;
  encounterTurn: number;
  shakeCount: number;
  isCaught: boolean;
  isShiny: boolean;
  selectedBall: BallType | null;
}

export interface PCBoxPokemon {
  pokemon: Pokemon;
  nickname?: string;
  caughtWith: BallType;
  caughtInArea: string;
  caughtDate: string;
  level: number;
  nature: Nature;
  ivs: IVSpread;
  ability: string;
  isShiny?: boolean;
}

export type WildEncounterAction =
  | { type: "SELECT_AREA"; area: RouteArea }
  | { type: "START_ENCOUNTER"; pokemon: Pokemon; level: number; captureRate: number; playerHp: number; playerMaxHp: number; wildHp: number; wildMaxHp: number; isShiny: boolean }
  | { type: "PLAYER_ATTACK"; newWildHp: number; newWildStatus: StatusCondition; newPlayerHp: number; newPlayerStatus: StatusCondition; logMessages: string[] }
  | { type: "THROW_BALL"; ball: BallType; shakeChecks: boolean[]; isCaught: boolean }
  | { type: "WILD_FLED" }
  | { type: "PLAYER_RUN" }
  | { type: "PLAYER_FAINTED" }
  | { type: "RETURN_TO_MAP" }
  | { type: "RESET" };

export type PCBoxAction =
  | { type: "ADD_POKEMON"; pokemon: PCBoxPokemon }
  | { type: "REMOVE_POKEMON"; index: number }
  | { type: "SET_NICKNAME"; index: number; nickname: string }
  | { type: "LOAD_BOX"; pokemon: PCBoxPokemon[] };
