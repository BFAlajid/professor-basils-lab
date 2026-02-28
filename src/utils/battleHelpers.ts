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

// --- Initialization ---

export function initStatStages(): StatStages {
  return { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

export function getActivePokemon(team: BattleTeam): BattlePokemon {
  const idx = Math.max(0, Math.min(team.activePokemonIndex, team.pokemon.length - 1));
  return team.pokemon[idx];
}

// --- Stat Stage Multiplier ---

export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  if (clamped >= 0) return (2 + clamped) / 2;
  return 2 / (2 - clamped);
}

export function getEffectiveSpeed(bp: BattlePokemon): number {
  const baseStats = extractBaseStats(bp.slot.pokemon);
  const calc = calculateAllStats(
    baseStats,
    bp.slot.ivs ?? DEFAULT_IVS,
    bp.slot.evs ?? DEFAULT_EVS,
    bp.slot.nature ?? null
  );
  let speed = Math.floor(calc.speed * getStatStageMultiplier(bp.statStages.speed));

  if (bp.status === "paralyze") speed = Math.floor(speed * 0.5);

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
  if (bp.isMegaEvolved && bp.megaFormeData) return bp.megaFormeData.types.map(t => t.type.name as TypeName);
  return bp.slot.pokemon.types.map(t => t.type.name);
}

export function getOriginalTypes(bp: BattlePokemon): TypeName[] {
  return bp.slot.pokemon.types.map(t => t.type.name);
}

// --- Side Conditions ---

export function initSideConditions(): SideConditions {
  return { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 };
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

const battleMoveCache: Map<string, BattleMoveData> = new Map();

export function cacheBattleMove(name: string, data: BattleMoveData) {
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

export function getMovePriority(pokemon: BattlePokemon, action: BattleTurnAction): number {
  const moveIndex = getMoveIndexFromAction(action);
  if (moveIndex === null) return 0;
  const moveData = getBattleMove(pokemon, moveIndex);
  return moveData.priority ?? 0;
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
