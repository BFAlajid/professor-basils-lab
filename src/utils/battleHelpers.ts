import { normalizeAbilityKey } from "./format";
import {
  BattleState,
  BattlePokemon,
  BattleTeam,
  BattleTurnAction,
  BattleLogEntry,
  BattleMoveData,
  StatusCondition,
  StatStages,
  Move,
  TypeName,
  SideConditions,
} from "@/types";
import { extractBaseStats } from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { getHeldItem } from "@/data/heldItems";
import { getAbilityHooks } from "@/data/abilities";
import { getMaxMoveEffect } from "@/data/maxMoves";
import { getStatLabel } from "./format";
import { HIGH_CRIT_MOVES, CRIT_STAGE_RATES } from "@/data/constants";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";

// --- Initialization ---

export function initStatStages(): StatStages {
  return { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

export function getActivePokemon(team: BattleTeam): BattlePokemon {
  const idx = Math.max(0, Math.min(team.activePokemonIndex, team.pokemon.length - 1));
  return team.pokemon[idx];
}

// Get active Pokemon by doubles slot (0 = primary, 1 = secondary)
export function getActivePokemonBySlot(team: BattleTeam, slot: 0 | 1): BattlePokemon | null {
  if (slot === 0) return getActivePokemon(team);
  if (slot === 1 && team.activePokemonIndex2 !== null) {
    return team.pokemon[team.activePokemonIndex2] ?? null;
  }
  return null;
}

// Get both active Pokemon in doubles (filters out null/fainted)
export function getActiveDoublesSlots(team: BattleTeam): { slot: 0 | 1; pokemon: BattlePokemon; index: number }[] {
  const result: { slot: 0 | 1; pokemon: BattlePokemon; index: number }[] = [];
  const p0 = getActivePokemon(team);
  if (p0 && !p0.isFainted) result.push({ slot: 0, pokemon: p0, index: team.activePokemonIndex });
  if (team.activePokemonIndex2 !== null) {
    const p1 = team.pokemon[team.activePokemonIndex2];
    if (p1 && !p1.isFainted) result.push({ slot: 1, pokemon: p1, index: team.activePokemonIndex2 });
  }
  return result;
}

// --- Stat Stage Multiplier ---

export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  if (clamped >= 0) return (2 + clamped) / 2;
  return 2 / (2 - clamped);
}

export function getEffectiveSpeed(bp: BattlePokemon, sideConditions?: SideConditions): number {
  const baseStats = extractBaseStats(bp.slot.pokemon);
  const calc = calculateAllStats(
    baseStats,
    bp.slot.ivs ?? DEFAULT_IVS,
    bp.slot.evs ?? DEFAULT_EVS,
    bp.slot.nature ?? null
  );
  let speed = Math.floor(calc.speed * getStatStageMultiplier(bp.statStages.speed));

  if (bp.status === "paralyze") speed = Math.floor(speed * 0.5);

  // Tailwind doubles speed
  if (sideConditions && sideConditions.tailwind > 0) {
    speed = speed * 2;
  }

  if (bp.slot.heldItem) {
    const item = getHeldItem(bp.slot.heldItem);
    if (item?.battleModifier?.type === "speed_boost" && item.battleModifier.value) {
      speed = Math.floor(speed * item.battleModifier.value);
    }
  }

  return speed;
}

// --- Type Helpers ---

export function getEffectiveTypes(bp: BattlePokemon): TypeName[] {
  if (bp.isTerastallized && bp.teraType) return [bp.teraType];
  let types: TypeName[];
  if (bp.isMegaEvolved && bp.megaFormeData) {
    types = bp.megaFormeData.types.map(t => t.type.name as TypeName);
  } else {
    types = bp.slot.pokemon.types.map(t => t.type.name as TypeName);
  }
  // Roost removes Flying type for the remainder of the turn; pure Flying becomes Normal
  if (bp.roostActive) {
    types = types.filter(t => t !== "flying");
    if (types.length === 0) types = ["normal"];
  }
  return types;
}

export function getOriginalTypes(bp: BattlePokemon): TypeName[] {
  return bp.slot.pokemon.types.map(t => t.type.name);
}

// --- Side Conditions ---

export function initSideConditions(): SideConditions {
  return { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0, tailwind: 0, wishPending: 0, wishAmount: 0 };
}

// --- Field Effects ---

export function applyFieldEffect(
  state: BattleState,
  effect: ReturnType<typeof getMaxMoveEffect>,
  log: BattleLogEntry[]
): BattleState {
  if (!effect) return state;
  let field = { ...state.field };

  if (effect.type === "weather") {
    field.weather = effect.weather;
    field.weatherTurnsLeft = 5;
    const weatherNames: Record<string, string> = {
      sun: "harsh sunlight", rain: "rain", sandstorm: "a sandstorm", hail: "hail",
    };
    log.push({ turn: state.turn, message: `${weatherNames[effect.weather] ?? effect.weather} began!`, kind: "weather" });
  } else if (effect.type === "terrain") {
    field.terrain = effect.terrain;
    field.terrainTurnsLeft = 5;
    const terrainNames: Record<string, string> = {
      electric: "Electric Terrain", grassy: "Grassy Terrain", misty: "Misty Terrain", psychic: "Psychic Terrain",
    };
    log.push({ turn: state.turn, message: `${terrainNames[effect.terrain] ?? effect.terrain} appeared!`, kind: "terrain" });
  }

  return { ...state, field };
}

// --- Move Helpers ---

export function getMoveIndexFromAction(action: BattleTurnAction): number | null {
  if (action.type === "MOVE" || action.type === "MEGA_EVOLVE" || action.type === "TERASTALLIZE" || action.type === "DYNAMAX") {
    return action.moveIndex;
  }
  return null;
}

const BATTLE_MOVE_CACHE_LIMIT = 500;
const battleMoveCache: Map<string, BattleMoveData> = new Map();

export function cacheBattleMove(name: string, data: BattleMoveData) {
  if (battleMoveCache.size >= BATTLE_MOVE_CACHE_LIMIT) {
    battleMoveCache.clear();
  }
  battleMoveCache.set(name, data);
}

export function getCachedMoves(): Map<string, BattleMoveData> {
  return battleMoveCache;
}

export function getBattleMove(attacker: BattlePokemon, moveIndex: number): Move {
  const moveName = (attacker.slot.selectedMoves ?? [])[moveIndex] ?? "";
  const cached = battleMoveCache.get(moveName);

  if (cached) {
    return {
      id: 0,
      name: cached.name,
      power: cached.power,
      accuracy: cached.accuracy,
      pp: cached.pp,
      priority: cached.priority ?? 0,
      type: { name: cached.type.name as TypeName },
      damage_class: { name: cached.damage_class.name },
      meta: cached.meta,
    };
  }

  return {
    id: 0,
    name: moveName,
    power: 80,
    accuracy: 100,
    pp: 15,
    priority: 0,
    type: { name: (attacker.slot.pokemon.types[0]?.type.name ?? "normal") as TypeName },
    damage_class: { name: "physical" },
  };
}

// Drain moves for Triage priority check
const TRIAGE_DRAIN_MOVES = new Set([
  "giga-drain", "drain-punch", "horn-leech", "absorb", "mega-drain",
  "leech-life", "parabolic-charge", "draining-kiss", "oblivion-wing", "bouncy-bubble",
]);

export function getMovePriority(pokemon: BattlePokemon, action: BattleTurnAction): number {
  const moveIndex = getMoveIndexFromAction(action);
  if (moveIndex === null) return 0;
  const moveData = getBattleMove(pokemon, moveIndex);
  let priority = moveData.priority ?? 0;
  const moveName = (pokemon.slot.selectedMoves ?? [])[moveIndex] ?? "";

  const abilityKey = normalizeAbilityKey(pokemon.slot.ability);

  // Prankster: +1 priority to status moves
  if (abilityKey === "prankster") {
    const isStatus = moveData.damage_class.name === "status" || moveName in STATUS_MOVE_EFFECTS;
    if (isStatus) priority += 1;
  }

  // Gale Wings: +1 priority to Flying-type moves at full HP
  if (abilityKey === "gale-wings") {
    if (moveData.type.name === "flying" && pokemon.currentHp === pokemon.maxHp) {
      priority += 1;
    }
  }

  // Triage: +3 priority to healing/drain moves
  if (abilityKey === "triage") {
    if (TRIAGE_DRAIN_MOVES.has(moveName) || (moveData.meta?.drain && moveData.meta.drain > 0)) {
      priority += 3;
    }
  }

  return priority;
}

export function getRelevantAtkStage(attacker: BattlePokemon, move: Move): number {
  return move.damage_class.name === "physical"
    ? attacker.statStages.attack
    : attacker.statStages.spAtk;
}

export function getRelevantDefStage(defender: BattlePokemon, move: Move): number {
  return move.damage_class.name === "physical"
    ? defender.statStages.defense
    : defender.statStages.spDef;
}

// --- State Update Helpers ---

export function updatePokemon(
  state: BattleState,
  player: "player1" | "player2",
  index: number,
  updated: BattlePokemon
): BattleState {
  const team = state[player];
  const newPokemon = [...team.pokemon];
  newPokemon[index] = updated;
  return {
    ...state,
    [player]: { ...team, pokemon: newPokemon },
  };
}

export function getStatusText(status: StatusCondition): string {
  switch (status) {
    case "burn": return "burned";
    case "paralyze": return "paralyzed";
    case "poison": return "poisoned";
    case "toxic": return "badly poisoned";
    case "sleep": return "put to sleep";
    case "freeze": return "frozen solid";
    default: return "";
  }
}

// --- Stat Drop Trigger (Defiant/Competitive) ---

export function triggerOnStatDrop(
  state: BattleState,
  player: "player1" | "player2",
  stat: string,
  stages: number,
  log: BattleLogEntry[]
): BattleState {
  const pokemon = getActivePokemon(state[player]);
  if (pokemon.isFainted) return state;
  const hooks = getAbilityHooks(pokemon.slot.ability);
  if (!hooks?.onStatDrop) return state;

  const result = hooks.onStatDrop({ pokemon, stat, stages });
  if (!result) return state;

  const boostStat = result.stat as keyof StatStages;
  const oldStage = pokemon.statStages[boostStat] ?? 0;
  const newStage = Math.min(6, oldStage + result.stages);
  if (newStage !== oldStage) {
    state = updatePokemon(state, player, state[player].activePokemonIndex, {
      ...getActivePokemon(state[player]),
      statStages: { ...getActivePokemon(state[player]).statStages, [boostStat]: newStage },
    });
    if (result.message) {
      log.push({ turn: state.turn, message: result.message, kind: "status" });
    }
  }
  return state;
}

// --- Critical Hit Stage ---

export function getCritStage(attacker: BattlePokemon, moveName: string): number {
  let stage = 0;
  if (HIGH_CRIT_MOVES.has(moveName)) stage += 1;
  const abilityKey = normalizeAbilityKey(attacker.slot.ability);
  if (abilityKey === "super-luck") stage += 1;
  const itemKey = attacker.slot.heldItem?.toLowerCase().replace(/\s+/g, "-") ?? "";
  if (itemKey === "scope-lens" || itemKey === "razor-claw") stage += 1;
  if (attacker.focusEnergy) stage += 2;
  return Math.min(stage, CRIT_STAGE_RATES.length - 1);
}

export function getCritRate(attacker: BattlePokemon, moveName: string): number {
  const stage = getCritStage(attacker, moveName);
  return CRIT_STAGE_RATES[stage];
}
