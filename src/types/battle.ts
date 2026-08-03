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
  confusionTurns: number;
  // Battle tracking
  turnsOnField: number;
  isProtected: boolean;
  lastMoveUsed: string | null;
  /** Turn `lastMoveUsed` was set on — lets applyMoveLocks tell "moved this turn" apart from a stale value left over from before a bail (paralysis/sleep/etc.) or a switch. */
  lastMoveTurn: number;
  consecutiveProtects: number;
  isFlinched: boolean;
  choiceLockedMove: string | null;
  focusEnergy: boolean;
  substituteHp: number;
  chargingMove: string | null;
  semiInvulnerable: "fly" | "dig" | "dive" | null;
  // Move PP tracking
  movePP: number[];
  moveMaxPP: number[];
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
  roostActive: boolean;
  yawnTurns: number;
  // Volatile status conditions
  isSeeded: boolean;
  seededBy: "player1" | "player2" | null;
  bindingTurns: number;
  bindingMove: string | null;
  boundBy: "player1" | "player2" | null;
  taunted: number;
  encored: number;
  encoredMove: string | null;
  disabledMove: string | null;
  disabledTurns: number;
  tormented: boolean;
  perishCount: number;
  aquaRing: boolean;
  ingrain: boolean;
  cursed: boolean;
  lockInMove: string | null;
  lockInTurns: number;
  healBlocked: number;
  embargoed: number;
  itemConsumed: boolean;
}

export interface BattleTeam {
  pokemon: BattlePokemon[];
  activePokemonIndex: number;
  activePokemonIndex2: number | null; // second active slot for doubles (null in singles)
  selectedMechanic: GenerationalMechanic;
}

export type BattleTurnAction =
  | { type: "MOVE"; moveIndex: number; target?: DoublesTarget; slot?: 0 | 1 }
  | { type: "SWITCH"; pokemonIndex: number; slot?: 0 | 1 }
  | { type: "MEGA_EVOLVE"; moveIndex: number; target?: DoublesTarget; slot?: 0 | 1 }
  | { type: "TERASTALLIZE"; moveIndex: number; target?: DoublesTarget; slot?: 0 | 1 }
  | { type: "DYNAMAX"; moveIndex: number; target?: DoublesTarget; slot?: 0 | 1 };

// Doubles targeting: opponent slot 0/1, or ally (partner)
export type DoublesTarget = "opp0" | "opp1" | "ally" | "spread";

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
export type BattleFormat = "singles" | "doubles";
export type BattleWinner = "player1" | "player2" | null;
export type DifficultyLevel = "easy" | "normal" | "hard";

export interface BattleState {
  phase: BattlePhase;
  mode: BattleMode;
  format: BattleFormat;
  difficulty: DifficultyLevel;
  turn: number;
  player1: BattleTeam;
  player2: BattleTeam;
  log: BattleLogEntry[];
  winner: BattleWinner;
  waitingForSwitch: "player1" | "player2" | null;
  waitingForSwitchSlot: 0 | 1 | null; // which doubles slot needs a replacement
  currentTurnPlayer: "player1" | "player2";
  field: FieldState;
  pendingPivotSwitch: "player1" | "player2" | null;
  // True when the pending pivot switch is specifically from Baton Pass (as
  // opposed to U-turn/Volt Switch, which share `pendingPivotSwitch` but do
  // NOT transfer stat stages/volatile status) — read once, by the FORCE_SWITCH
  // reducer case, to decide whether to transfer the outgoing Pokemon's
  // statStages/focusEnergy/substituteHp/aquaRing/ingrain to the replacement
  // instead of clearing them as a normal switch does.
  pendingBatonPass: boolean;
  spreadDamageModifier?: number;
  /** Shared seed for online PvP determinism. Unset for local/AI battles (falls back to Math.random). */
  rngSeed?: number;
}

export type BattleAction =
  | { type: "START_BATTLE"; player1Team: TeamSlot[]; player2Team: TeamSlot[]; mode: BattleMode; format?: BattleFormat; difficulty?: DifficultyLevel; player1Mechanic?: GenerationalMechanic; player2Mechanic?: GenerationalMechanic; megaFormeCache?: Map<string, AltFormeData>; rngSeed?: number }
  | { type: "EXECUTE_TURN"; player1Action: BattleTurnAction; player2Action: BattleTurnAction; player1Action2?: BattleTurnAction; player2Action2?: BattleTurnAction }
  | { type: "FORCE_SWITCH"; player: "player1" | "player2"; pokemonIndex: number; slot?: 0 | 1 }
  | { type: "RESET_BATTLE" };
