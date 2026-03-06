import type {
  TypeName,
  GenerationalMechanic,
  AltFormeData,
  BaseStats,
  StatusCondition,
  StatStages,
  FieldState,
} from "./pokemon";
import type { TeamSlot } from "./team";

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
  choiceLockedMove: string | null;
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
  kind: "damage" | "status" | "switch" | "faint" | "info" | "critical" | "miss" | "heal" | "mega" | "tera" | "dynamax" | "weather" | "terrain" | "hazard";
}

// -- Move Animations --

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
