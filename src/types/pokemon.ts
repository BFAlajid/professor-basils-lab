export type TypeName =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export interface PokemonListItem {
  name: string;
  url: string;
}

export interface PokemonStat {
  base_stat: number;
  stat: {
    name: string;
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: TypeName;
  };
}

export interface PokemonMoveRef {
  move: {
    name: string;
    url: string;
  };
  version_group_details?: {
    move_learn_method: { name: string };
    version_group: { name: string };
    level_learned_at: number;
  }[];
}

export interface PokemonAbilityRef {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
  stats: PokemonStat[];
  types: PokemonType[];
  moves: PokemonMoveRef[];
  abilities?: PokemonAbilityRef[];
  cries?: {
    latest: string;
    legacy: string;
  };
}

export interface Move {
  id: number;
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  type: {
    name: TypeName;
  };
  damage_class: {
    name: "physical" | "special" | "status";
  };
  meta?: {
    ailment?: { name: string };
    ailment_chance?: number;
    stat_chance?: number;
    min_hits?: number | null;
    max_hits?: number | null;
    drain?: number;
  };
  stat_changes?: { change: number; stat: { name: string } }[];
}

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

// --- Generational Mechanics ---
export type GenerationalMechanic = "mega" | "tera" | "dynamax" | null;

export interface TeraConfig {
  teraType: TypeName;
}

export interface AltFormeData {
  name: string;
  types: PokemonType[];
  stats: PokemonStat[];
  ability: string;
  spriteUrl: string | null;
}

export type WeatherType = "sun" | "rain" | "sandstorm" | "hail";
export type TerrainType = "electric" | "grassy" | "misty" | "psychic";

export interface SideConditions {
  stealthRock: boolean;
  spikesLayers: number;       // 0-3
  toxicSpikesLayers: number;  // 0-2
  stickyWeb: boolean;
  reflect: number;            // turns remaining (0 = inactive)
  lightScreen: number;        // turns remaining (0 = inactive)
  tailwind: number;           // turns remaining (0 = inactive)
}

export interface FieldState {
  weather: WeatherType | null;
  weatherTurnsLeft: number;
  terrain: TerrainType | null;
  terrainTurnsLeft: number;
  trickRoom: number;          // turns remaining (0 = inactive)
  player1Side: SideConditions;
  player2Side: SideConditions;
}

export type StatusCondition = "burn" | "paralyze" | "poison" | "toxic" | "sleep" | "freeze" | null;

export interface StatStages {
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
  accuracy: number;
  evasion: number;
}
