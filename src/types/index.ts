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

export interface FieldState {
  weather: WeatherType | null;
  weatherTurnsLeft: number;
  terrain: TerrainType | null;
  terrainTurnsLeft: number;
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
}

export interface Move {
  id: number;
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
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

// --- Natures ---
export type StatKey = "attack" | "defense" | "spAtk" | "spDef" | "speed";

export interface Nature {
  name: string;
  increased: StatKey | null;
  decreased: StatKey | null;
}

// --- EVs/IVs ---
export interface EVSpread {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

export interface IVSpread {
  hp: number;
  attack: number;
  defense: number;
  spAtk: number;
  spDef: number;
  speed: number;
}

// --- Held Items ---
export interface HeldItem {
  name: string;
  displayName: string;
  effect: string;
  battleModifier?: {
    type: "damage_boost" | "speed_boost" | "hp_restore" | "survive_ko" | "stat_boost" | "mega_stone";
    value?: number;
    condition?: string;
  };
  megaTarget?: string;
  formeApiName?: string;
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

// --- Battle Types ---
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

export interface BattlePokemon {
  slot: TeamSlot;
  currentHp: number;
  maxHp: number;
  status: StatusCondition;
  statStages: StatStages;
  isActive: boolean;
  isFainted: boolean;
  toxicCounter: number;
  sleepTurns: number;
  // Generational mechanic state
  isMegaEvolved: boolean;
  isTerastallized: boolean;
  isDynamaxed: boolean;
  dynamaxTurnsLeft: number;
  teraType: TypeName | null;
  megaFormeData: AltFormeData | null;
  activeStatOverride: BaseStats | null;
  originalMaxHp: number;
  hasMegaEvolved: boolean;
  hasTerastallized: boolean;
  hasDynamaxed: boolean;
}

export interface BattleTeam {
  pokemon: BattlePokemon[];
  activePokemonIndex: number;
  selectedMechanic: GenerationalMechanic;
}

export type BattleTurnAction =
  | { type: "MOVE"; moveIndex: number }
  | { type: "SWITCH"; pokemonIndex: number }
  | { type: "MEGA_EVOLVE"; moveIndex: number }
  | { type: "TERASTALLIZE"; moveIndex: number }
  | { type: "DYNAMAX"; moveIndex: number };

export interface BattleLogEntry {
  turn: number;
  message: string;
  kind: "damage" | "status" | "switch" | "faint" | "info" | "critical" | "miss" | "heal" | "mega" | "tera" | "dynamax" | "weather" | "terrain";
}

export type BattlePhase = "setup" | "action_select" | "executing" | "force_switch" | "ended";
export type BattleMode = "ai" | "pvp";
export type BattleWinner = "player1" | "player2" | null;

export interface BattleState {
  phase: BattlePhase;
  mode: BattleMode;
  turn: number;
  player1: BattleTeam;
  player2: BattleTeam;
  log: BattleLogEntry[];
  winner: BattleWinner;
  waitingForSwitch: "player1" | "player2" | null;
  currentTurnPlayer: "player1" | "player2";
  field: FieldState;
}

export type BattleAction =
  | { type: "START_BATTLE"; player1Team: TeamSlot[]; player2Team: TeamSlot[]; mode: BattleMode; player1Mechanic?: GenerationalMechanic; player2Mechanic?: GenerationalMechanic; megaFormeCache?: Map<string, AltFormeData> }
  | { type: "SELECT_MOVE"; player: "player1" | "player2"; moveIndex: number }
  | { type: "SELECT_SWITCH"; player: "player1" | "player2"; pokemonIndex: number }
  | { type: "EXECUTE_TURN"; player1Action: BattleTurnAction; player2Action: BattleTurnAction }
  | { type: "FORCE_SWITCH"; player: "player1" | "player2"; pokemonIndex: number }
  | { type: "RESET_BATTLE" };

// --- Wild Encounter Types ---

export type BallType =
  | "poke-ball" | "great-ball" | "ultra-ball" | "master-ball"
  | "quick-ball" | "dusk-ball" | "timer-ball" | "net-ball"
  | "repeat-ball" | "luxury-ball" | "premier-ball" | "dive-ball"
  | "nest-ball" | "heal-ball";

export interface BallData {
  name: BallType;
  displayName: string;
  description: string;
  baseModifier: number;
  dynamicModifier?: (context: CatchContext) => number;
  spriteColor: string;
}

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
  playerBallInventory: Record<BallType, number>;
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
}

export type WildEncounterAction =
  | { type: "SELECT_AREA"; area: RouteArea }
  | { type: "START_ENCOUNTER"; pokemon: Pokemon; level: number; captureRate: number; playerHp: number; playerMaxHp: number; wildHp: number; wildMaxHp: number }
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
