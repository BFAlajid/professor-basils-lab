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
  cries?: {
    latest: string;
    legacy: string;
  };
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
  startingHpPercent?: number;
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
  // Battle tracking
  turnsOnField: number;
  isProtected: boolean;
  lastMoveUsed: string | null;
  consecutiveProtects: number;
  isFlinched: boolean;
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

// ── Move Animations ────────────────────────────────────────────────────

export type SpriteAnimationState = "idle" | "attacking" | "hit" | "fainting" | "entering";

export interface MoveAnimationConfig {
  damageClass: "physical" | "special" | "status";
  typeColor: string;
  duration: number; // ms
}

export interface ActiveAnimation {
  id: string;
  config: MoveAnimationConfig;
  attacker: "left" | "right";
  isCritical: boolean;
  isSuperEffective: boolean;
  startTime: number;
}

export interface BattleMoveData {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: { name: string };
  damage_class: { name: "physical" | "special" | "status" };
  priority?: number;
  meta?: {
    ailment?: { name: string };
    ailment_chance?: number;
    stat_chance?: number;
    min_hits?: number | null;
    max_hits?: number | null;
    drain?: number;
  };
}

export type BattlePhase = "setup" | "action_select" | "executing" | "force_switch" | "ended";
export type BattleMode = "ai" | "pvp" | "online" | "tournament";
export type BattleWinner = "player1" | "player2" | null;
export type DifficultyLevel = "easy" | "normal" | "hard";

export interface BattleState {
  phase: BattlePhase;
  mode: BattleMode;
  difficulty: DifficultyLevel;
  turn: number;
  player1: BattleTeam;
  player2: BattleTeam;
  log: BattleLogEntry[];
  winner: BattleWinner;
  waitingForSwitch: "player1" | "player2" | null;
  currentTurnPlayer: "player1" | "player2";
  field: FieldState;
  pendingPivotSwitch: "player1" | "player2" | null;
}

export type BattleAction =
  | { type: "START_BATTLE"; player1Team: TeamSlot[]; player2Team: TeamSlot[]; mode: BattleMode; difficulty?: DifficultyLevel; player1Mechanic?: GenerationalMechanic; player2Mechanic?: GenerationalMechanic; megaFormeCache?: Map<string, AltFormeData> }
  | { type: "SELECT_MOVE"; player: "player1" | "player2"; moveIndex: number }
  | { type: "SELECT_SWITCH"; player: "player1" | "player2"; pokemonIndex: number }
  | { type: "EXECUTE_TURN"; player1Action: BattleTurnAction; player2Action: BattleTurnAction }
  | { type: "FORCE_SWITCH"; player: "player1" | "player2"; pokemonIndex: number }
  | { type: "RESET_BATTLE" };

// --- Battle Replay Types ---

export interface ReplaySnapshot {
  turn: number;
  state: BattleState;
}

export interface BattleReplay {
  id: string;
  date: string;
  player1TeamNames: string[];
  player2TeamNames: string[];
  winner: BattleWinner;
  mode: BattleMode;
  totalTurns: number;
  snapshots: ReplaySnapshot[];
}

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

// --- Nuzlocke Types ---

export interface NuzlockeState {
  enabled: boolean;
  encounteredAreas: string[];
  graveyard: NuzlockeGravePokemon[];
  isGameOver: boolean;
}

export interface NuzlockeGravePokemon {
  pokemon: Pokemon;
  nickname: string;
  causeOfDeath: string;
  area: string;
  level: number;
}

// --- Breeding Types ---

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

// --- Tournament Types ---

export interface TournamentTrainer {
  name: string;
  title: string;
  theme: TypeName | "mixed";
  team: TeamSlot[];
  difficulty: DifficultyLevel;
  defeated: boolean;
}

export type TournamentPhase = "bracket" | "pre_match" | "battling" | "post_match" | "completed";

export interface TournamentState {
  phase: TournamentPhase;
  round: number;
  trainers: TournamentTrainer[];
  currentOpponentIndex: number;
  playerWins: number;
  isChampion: boolean;
}

export type TournamentAction =
  | { type: "START_TOURNAMENT"; trainers: TournamentTrainer[] }
  | { type: "BEGIN_MATCH"; opponentIndex: number }
  | { type: "MATCH_WON" }
  | { type: "MATCH_LOST" }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_TOURNAMENT" };

// --- Online Multiplayer Types ---

export type OnlinePhase = "idle" | "creating_lobby" | "waiting" | "joining" | "connected" | "team_preview" | "battling" | "disconnected";
export type LinkMode = "idle" | "battle" | "trade";

export interface OnlineMessage {
  type: "TEAM_SUBMIT" | "ACTION" | "FORCE_SWITCH_ACTION" | "READY" | "PING" | "PONG" | "DISCONNECT"
    | "LINK_MODE" | "PC_BOX_SHARE" | "TRADE_OFFER" | "TRADE_ACCEPT" | "TRADE_REJECT" | "TRADE_CONFIRM" | "TRADE_COMPLETE";
  payload: unknown;
  timestamp: number;
}

export interface TradeOffer {
  fromHost: boolean;
  pokemonIndex: number;
  pokemon: PCBoxPokemon;
}

export interface LinkTradeState {
  mode: LinkMode;
  myBoxShared: boolean;
  opponentBox: PCBoxPokemon[];
  myOffer: TradeOffer | null;
  opponentOffer: TradeOffer | null;
  myConfirmed: boolean;
  opponentConfirmed: boolean;
  tradeComplete: boolean;
  lastTradedReceived: PCBoxPokemon | null;
}

export interface OnlineState {
  phase: OnlinePhase;
  roomCode: string | null;
  isHost: boolean;
  opponentTeam: TeamSlot[] | null;
  lastPing: number;
  error: string | null;
  trade: LinkTradeState;
}

// --- Wonder Trade Types ---

export interface WonderTradeRecord {
  id: string;
  offeredPokemon: PCBoxPokemon;
  receivedPokemon: PCBoxPokemon;
  timestamp: string;
}

export type WonderTradePhase = "idle" | "selecting" | "searching" | "result";

export interface WonderTradeState {
  phase: WonderTradePhase;
  selectedBoxIndex: number | null;
  receivedPokemon: PCBoxPokemon | null;
  history: WonderTradeRecord[];
}

export type WonderTradeAction =
  | { type: "SELECT_POKEMON"; index: number }
  | { type: "START_TRADE" }
  | { type: "TRADE_COMPLETE"; received: PCBoxPokemon; record: WonderTradeRecord }
  | { type: "RESET" }
  | { type: "LOAD"; history: WonderTradeRecord[] };

// --- Mystery Gift Types ---

export interface MysteryGiftDefinition {
  pokemonId: number;
  level: number;
  nature?: string;
  perfectIvStats?: (keyof IVSpread)[];
  specialMoves?: string[];
  isShiny?: boolean;
  ballType: BallType;
  ribbonText?: string;
}

export interface MysteryGiftState {
  claimedDates: string[];
  totalClaimed: number;
}

export type MysteryGiftAction =
  | { type: "CLAIM"; date: string }
  | { type: "LOAD"; claimedDates: string[]; totalClaimed: number };

// --- Battle Facility Types (Elite Four + Battle Tower) ---

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

// --- Battle Factory Types ---

export interface BattleFactoryState {
  phase: "idle" | "pick" | "battling" | "swap" | "victory" | "defeat";
  rentalPool: TeamSlot[];
  selectedIndices: number[];
  playerTeam: TeamSlot[];
  opponentTeam: TeamSlot[];
  wins: number;
  bestRun: number;
  totalRuns: number;
}

// ── Safari Zone ───────────────────────────────────────────────────────

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
