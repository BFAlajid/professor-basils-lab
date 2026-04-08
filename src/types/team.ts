import type { Pokemon, TypeName, TeraConfig } from "./pokemon";

// --- Natures ---
export type StatKey = "attack" | "defense" | "spAtk" | "spDef" | "speed";

export interface Nature {
  name: string;
  increased: StatKey | null;
  decreased: StatKey | null;
}

// --- EVs/IVs ---
export interface StatSpread {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export type EVSpread = StatSpread;
export type IVSpread = StatSpread;

// --- Held Items ---
export interface HeldItem {
  name: string;
  displayName: string;
  effect: string;
  battleModifier?: {
    type: "damage_boost" | "speed_boost" | "hp_restore" | "survive_ko" | "stat_boost" | "mega_stone" | "crit_boost";
    value?: number;
    condition?: string;
  };
  megaTarget?: string;
  formeApiName?: string;
}

export interface TeamSlot {
  pokemon: Pokemon;
  position: number;
  nature?: Nature | null;
  evs?: EVSpread;
  ivs?: IVSpread;
  ability?: string | null;
  heldItem?: string | null;
  selectedMoves?: string[];
  teraConfig?: TeraConfig;
  formeOverride?: string | null;
  startingHpPercent?: number;
}

// --- Team Actions ---
export type TeamAction =
  | { type: "ADD_POKEMON"; pokemon: Pokemon }
  | { type: "REMOVE_POKEMON"; position: number }
  | { type: "REORDER"; from: number; to: number }
  | { type: "CLEAR_TEAM" }
  | { type: "SET_TEAM"; slots: TeamSlot[] }
  | { type: "SET_NATURE"; position: number; nature: Nature }
  | { type: "SET_EVS"; position: number; evs: EVSpread }
  | { type: "SET_IVS"; position: number; ivs: IVSpread }
  | { type: "SET_ABILITY"; position: number; ability: string }
  | { type: "SET_HELD_ITEM"; position: number; item: string }
  | { type: "SET_MOVES"; position: number; moves: string[] }
  | { type: "SET_TERA_TYPE"; position: number; teraType: TypeName }
  | { type: "SET_FORME"; position: number; forme: string | null };
