import {
  BattleState,
  BattleAction,
  BattlePokemon,
  BattleTeam,
  BattleTurnAction,
  BattleLogEntry,
  BattleMoveData,
  TeamSlot,
  StatusCondition,
  StatStages,
  Move,
  GenerationalMechanic,
  AltFormeData,
  TypeName,
  FieldState,
  BaseStats,
} from "@/types";
import { extractBaseStats, calculateDamage } from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { getHeldItem } from "@/data/heldItems";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { isMegaStone } from "@/data/megaStones";
import { convertToMaxMove, getMaxMoveName, getMaxMoveEffect } from "@/data/maxMoves";
import { getStatLabel } from "./format";
import { getAbilityHooks, getHighestStat } from "@/data/abilities";

// --- Initialization ---

export function initStatStages(): StatStages {
  return { attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}

export function initBattlePokemon(slot: TeamSlot, megaFormeCache?: Map<string, AltFormeData>): BattlePokemon {
  const baseStats = extractBaseStats(slot.pokemon);
  const calc = calculateAllStats(
    baseStats,
    slot.ivs ?? DEFAULT_IVS,
    slot.evs ?? DEFAULT_EVS,
    slot.nature ?? null
  );

  // Pre-attach mega forme data if this Pokemon holds a mega stone
  let megaFormeData: AltFormeData | null = null;
  if (megaFormeCache && slot.heldItem && isMegaStone(slot.heldItem)) {
    megaFormeData = megaFormeCache.get(slot.pokemon.name) ?? null;
  }

  return {
    slot,
    currentHp: calc.hp,
    maxHp: calc.hp,
    status: null,
    statStages: initStatStages(),
    isActive: false,
    isFainted: false,
    toxicCounter: 0,
    sleepTurns: 0,
    // New battle tracking fields
    turnsOnField: 0,
    isProtected: false,
    lastMoveUsed: null,
    consecutiveProtects: 0,
    isFlinched: false,
    // Generational mechanic state
    isMegaEvolved: false,
    isTerastallized: false,
    isDynamaxed: false,
    dynamaxTurnsLeft: 0,
    teraType: slot.teraConfig?.teraType ?? null,
    megaFormeData,
    activeStatOverride: null,
    originalMaxHp: calc.hp,
    hasMegaEvolved: false,
    hasTerastallized: false,
    hasDynamaxed: false,
  };
}

export function initBattleTeam(
  slots: TeamSlot[],
  mechanic: GenerationalMechanic = null,
  megaFormeCache?: Map<string, AltFormeData>
): BattleTeam {
  const pokemon = slots.map((s) => initBattlePokemon(s, megaFormeCache));
  if (pokemon.length > 0) pokemon[0].isActive = true;
  return { pokemon, activePokemonIndex: 0, selectedMechanic: mechanic };
}

export function getActivePokemon(team: BattleTeam): BattlePokemon {
  return team.pokemon[team.activePokemonIndex];
}

// --- Stat Stage Multiplier ---

export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  if (clamped >= 0) return (2 + clamped) / 2;
  return 2 / (2 - clamped);
}

function getEffectiveSpeed(bp: BattlePokemon): number {
  const baseStats = extractBaseStats(bp.slot.pokemon);
  const calc = calculateAllStats(
    baseStats,
    bp.slot.ivs ?? DEFAULT_IVS,
    bp.slot.evs ?? DEFAULT_EVS,
    bp.slot.nature ?? null
  );
  let speed = Math.floor(calc.speed * getStatStageMultiplier(bp.statStages.speed));

  // Paralysis halves speed
  if (bp.status === "paralyze") speed = Math.floor(speed * 0.5);

  // Choice Scarf
  if (bp.slot.heldItem) {
    const item = getHeldItem(bp.slot.heldItem);
    if (item?.battleModifier?.type === "speed_boost" && item.battleModifier.value) {
      speed = Math.floor(speed * item.battleModifier.value);
    }
  }

  return speed;
}

// --- Generational Mechanic Helpers ---

export function getEffectiveTypes(bp: BattlePokemon): TypeName[] {
  if (bp.isTerastallized && bp.teraType) return [bp.teraType];
  if (bp.isMegaEvolved && bp.megaFormeData) return bp.megaFormeData.types.map(t => t.type.name as TypeName);
  return bp.slot.pokemon.types.map(t => t.type.name);
}

function getOriginalTypes(bp: BattlePokemon): TypeName[] {
  return bp.slot.pokemon.types.map(t => t.type.name);
}

function extractStatsFromFormeData(data: AltFormeData): BaseStats {
  const get = (name: string) =>
    data.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  return {
    hp: get("hp"),
    attack: get("attack"),
    defense: get("defense"),
    spAtk: get("special-attack"),
    spDef: get("special-defense"),
    speed: get("speed"),
  };
}

function applyMegaEvolution(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (active.hasMegaEvolved || !active.megaFormeData) return state;
  if (team.selectedMechanic !== "mega") return state;

  const formeStats = extractStatsFromFormeData(active.megaFormeData);
  const updated: BattlePokemon = {
    ...active,
    isMegaEvolved: true,
    hasMegaEvolved: true,
    activeStatOverride: formeStats,
  };

  // Recalculate max HP from mega stats
  const megaCalc = calculateAllStats(
    formeStats,
    active.slot.ivs ?? DEFAULT_IVS,
    active.slot.evs ?? DEFAULT_EVS,
    active.slot.nature ?? null
  );
  const hpDiff = megaCalc.hp - active.maxHp;
  updated.maxHp = megaCalc.hp;
  updated.currentHp = active.currentHp + Math.max(0, hpDiff);
  updated.originalMaxHp = active.originalMaxHp;

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name} Mega Evolved into ${active.megaFormeData.name}!`,
    kind: "mega",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

function applyTerastallization(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (active.hasTerastallized || !active.teraType) return state;
  if (team.selectedMechanic !== "tera") return state;

  const updated: BattlePokemon = {
    ...active,
    isTerastallized: true,
    hasTerastallized: true,
  };

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name} Terastallized into the ${active.teraType} type!`,
    kind: "tera",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

function applyDynamax(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (active.hasDynamaxed) return state;
  if (team.selectedMechanic !== "dynamax") return state;

  const updated: BattlePokemon = {
    ...active,
    isDynamaxed: true,
    hasDynamaxed: true,
    dynamaxTurnsLeft: 3,
    maxHp: active.maxHp * 2,
    currentHp: active.currentHp * 2,
  };

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name} Dynamaxed!`,
    kind: "dynamax",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

function endDynamax(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const active = getActivePokemon(team);

  if (!active.isDynamaxed) return state;

  const originalMaxHp = active.originalMaxHp;
  const newCurrentHp = Math.min(Math.floor(active.currentHp / 2), originalMaxHp);

  const updated: BattlePokemon = {
    ...active,
    isDynamaxed: false,
    dynamaxTurnsLeft: 0,
    maxHp: originalMaxHp,
    currentHp: Math.max(1, newCurrentHp),
  };

  log.push({
    turn: state.turn,
    message: `${active.slot.pokemon.name}'s Dynamax ended!`,
    kind: "dynamax",
  });

  return updatePokemon(state, player, team.activePokemonIndex, updated);
}

function applyFieldEffect(
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

function tickFieldEffects(state: BattleState, log: BattleLogEntry[]): BattleState {
  let field = { ...state.field };

  if (field.weather && field.weatherTurnsLeft > 0) {
    field.weatherTurnsLeft--;
    if (field.weatherTurnsLeft <= 0) {
      log.push({ turn: state.turn, message: `The weather returned to normal.`, kind: "weather" });
      field.weather = null;
    }
  }

  if (field.terrain && field.terrainTurnsLeft > 0) {
    field.terrainTurnsLeft--;
    if (field.terrainTurnsLeft <= 0) {
      log.push({ turn: state.turn, message: `The terrain returned to normal.`, kind: "terrain" });
      field.terrain = null;
    }
  }

  return { ...state, field };
}

function getMoveIndexFromAction(action: BattleTurnAction): number | null {
  if (action.type === "MOVE" || action.type === "MEGA_EVOLVE" || action.type === "TERASTALLIZE" || action.type === "DYNAMAX") {
    return action.moveIndex;
  }
  return null;
}

function getMovePriority(pokemon: BattlePokemon, action: BattleTurnAction): number {
  const moveIndex = getMoveIndexFromAction(action);
  if (moveIndex === null) return 0; // Switches handled separately
  const moveData = getBattleMove(pokemon, moveIndex);
  return moveData.priority ?? 0;
}

// --- Initial State ---

const initialFieldState: FieldState = {
  weather: null,
  weatherTurnsLeft: 0,
  terrain: null,
  terrainTurnsLeft: 0,
};

export const initialBattleState: BattleState = {
  phase: "setup",
  mode: "ai",
  turn: 0,
  player1: { pokemon: [], activePokemonIndex: 0, selectedMechanic: null },
  player2: { pokemon: [], activePokemonIndex: 0, selectedMechanic: null },
  log: [],
  winner: null,
  waitingForSwitch: null,
  currentTurnPlayer: "player1",
  field: { ...initialFieldState },
  difficulty: "normal",
  pendingPivotSwitch: null,
};

// --- Battle Reducer ---

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "START_BATTLE": {
      const p1 = initBattleTeam(action.player1Team, action.player1Mechanic ?? null, action.megaFormeCache);
      const p2 = initBattleTeam(action.player2Team, action.player2Mechanic ?? null, action.megaFormeCache);
      const log: BattleLogEntry[] = [
        { turn: 1, message: `Battle start!`, kind: "info" },
        { turn: 1, message: `${action.player1Team[0].pokemon.name} was sent out!`, kind: "switch" },
        { turn: 1, message: `${action.player2Team[0].pokemon.name} was sent out!`, kind: "switch" },
      ];
      return {
        ...state,
        phase: "action_select",
        mode: action.mode,
        turn: 1,
        player1: p1,
        player2: p2,
        log,
        winner: null,
        waitingForSwitch: null,
        currentTurnPlayer: "player1",
        field: { ...initialFieldState },
        difficulty: action.difficulty ?? "normal",
        pendingPivotSwitch: null,
      };
    }

    case "EXECUTE_TURN": {
      return executeTurn(state, action.player1Action, action.player2Action);
    }

    case "FORCE_SWITCH": {
      const team = { ...state[action.player] };
      const newPokemon = [...team.pokemon];

      // Deactivate old
      newPokemon[team.activePokemonIndex] = {
        ...newPokemon[team.activePokemonIndex],
        isActive: false,
      };
      // Activate new
      newPokemon[action.pokemonIndex] = {
        ...newPokemon[action.pokemonIndex],
        isActive: true,
      };

      const updatedTeam: BattleTeam = {
        pokemon: newPokemon,
        activePokemonIndex: action.pokemonIndex,
        selectedMechanic: team.selectedMechanic,
      };

      const newState: BattleState = {
        ...state,
        [action.player]: updatedTeam,
        log: [
          ...state.log,
          {
            turn: state.turn,
            message: `${newPokemon[action.pokemonIndex].slot.pokemon.name} was sent out!`,
            kind: "switch" as const,
          },
        ],
      };

      // Check if the other player also needs to switch
      if (state.waitingForSwitch === action.player) {
        return { ...newState, phase: "action_select", waitingForSwitch: null };
      }
      return newState;
    }

    case "RESET_BATTLE":
      return initialBattleState;

    default:
      return state;
  }
}

// --- Turn Execution ---

function executeTurn(
  state: BattleState,
  p1Action: BattleTurnAction,
  p2Action: BattleTurnAction
): BattleState {
  let newState = { ...state, turn: state.turn + 1 };
  const log: BattleLogEntry[] = [...state.log];

  log.push({ turn: newState.turn, message: `--- Turn ${newState.turn} ---`, kind: "info" });

  // Reset per-turn flags and increment turnsOnField
  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(newState[player]);
    if (!active.isFainted) {
      newState = updatePokemon(newState, player, newState[player].activePokemonIndex, {
        ...active,
        isProtected: false,
        isFlinched: false,
        turnsOnField: (active.turnsOnField ?? 0) + 1,
      });
    }
  }

  // Handle switches first (switches always go before moves)
  if (p1Action.type === "SWITCH") {
    newState = performSwitch(newState, "player1", p1Action.pokemonIndex, log);
  }
  if (p2Action.type === "SWITCH") {
    newState = performSwitch(newState, "player2", p2Action.pokemonIndex, log);
  }

  // Determine move order by priority, then speed
  const p1Active = getActivePokemon(newState.player1);
  const p2Active = getActivePokemon(newState.player2);

  let firstPlayer: "player1" | "player2";
  let secondPlayer: "player1" | "player2";
  let firstAction: BattleTurnAction;
  let secondAction: BattleTurnAction;

  // Get move priorities (switches already handled above, moves get priority from data)
  const p1Priority = getMovePriority(p1Active, p1Action);
  const p2Priority = getMovePriority(p2Active, p2Action);

  const p1Speed = getEffectiveSpeed(p1Active);
  const p2Speed = getEffectiveSpeed(p2Active);

  // Higher priority goes first; same priority falls through to speed
  if (p1Priority > p2Priority ||
      (p1Priority === p2Priority && (p1Speed > p2Speed || (p1Speed === p2Speed && Math.random() < 0.5)))) {
    firstPlayer = "player1";
    secondPlayer = "player2";
    firstAction = p1Action;
    secondAction = p2Action;
  } else {
    firstPlayer = "player2";
    secondPlayer = "player1";
    firstAction = p2Action;
    secondAction = p1Action;
  }

  // Execute first action (with mechanic transformations)
  const firstMoveIdx = getMoveIndexFromAction(firstAction);
  if (firstMoveIdx !== null) {
    // Apply mechanic transformation before move
    if (firstAction.type === "MEGA_EVOLVE") {
      newState = applyMegaEvolution(newState, firstPlayer, log);
    } else if (firstAction.type === "TERASTALLIZE") {
      newState = applyTerastallization(newState, firstPlayer, log);
    } else if (firstAction.type === "DYNAMAX") {
      newState = applyDynamax(newState, firstPlayer, log);
    }
    newState = executeMove(newState, firstPlayer, firstMoveIdx, log);
  }

  // Check if second player's active Pokemon fainted
  const secondActive = getActivePokemon(newState[secondPlayer]);
  const secondMoveIdx = getMoveIndexFromAction(secondAction);
  if (!secondActive.isFainted && secondMoveIdx !== null) {
    // Apply mechanic transformation before move
    if (secondAction.type === "MEGA_EVOLVE") {
      newState = applyMegaEvolution(newState, secondPlayer, log);
    } else if (secondAction.type === "TERASTALLIZE") {
      newState = applyTerastallization(newState, secondPlayer, log);
    } else if (secondAction.type === "DYNAMAX") {
      newState = applyDynamax(newState, secondPlayer, log);
    }
    newState = executeMove(newState, secondPlayer, secondMoveIdx, log);
  }

  // Dynamax turn countdown
  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(newState[player]);
    if (active.isDynamaxed) {
      const remaining = active.dynamaxTurnsLeft - 1;
      if (remaining <= 0) {
        newState = endDynamax(newState, player, log);
      } else {
        newState = updatePokemon(newState, player, newState[player].activePokemonIndex, {
          ...active, dynamaxTurnsLeft: remaining,
        });
      }
    }
  }

  // End-of-turn effects
  newState = applyEndOfTurnEffects(newState, log);

  // Tick field effects (weather/terrain timers)
  newState = tickFieldEffects(newState, log);

  // Check for faints and handle forced switches
  newState = checkFaints(newState, log);

  // Handle pivot switch (U-turn/Volt Switch) — enter force_switch if pending
  if (newState.pendingPivotSwitch && newState.phase !== "ended") {
    const pivotPlayer = newState.pendingPivotSwitch;
    const pivotActive = getActivePokemon(newState[pivotPlayer]);
    if (!pivotActive.isFainted) {
      const hasSwitch = newState[pivotPlayer].pokemon.some((p, i) => i !== newState[pivotPlayer].activePokemonIndex && !p.isFainted);
      if (hasSwitch) {
        newState = { ...newState, phase: "force_switch", waitingForSwitch: pivotPlayer, pendingPivotSwitch: null };
        log.push({ turn: newState.turn, message: `${pivotActive.slot.pokemon.name} went back!`, kind: "switch" });
      } else {
        newState = { ...newState, pendingPivotSwitch: null };
      }
    } else {
      newState = { ...newState, pendingPivotSwitch: null };
    }
  }

  newState.log = log;
  return newState;
}

function performSwitch(
  state: BattleState,
  player: "player1" | "player2",
  pokemonIndex: number,
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const oldActive = getActivePokemon(team);
  const newPokemon = [...team.pokemon];

  // Deactivate old
  newPokemon[team.activePokemonIndex] = {
    ...oldActive,
    isActive: false,
    statStages: initStatStages(),
  };
  // Activate new — reset turnsOnField on switch-in
  newPokemon[pokemonIndex] = {
    ...newPokemon[pokemonIndex],
    isActive: true,
    turnsOnField: 0,
  };

  log.push({
    turn: state.turn,
    message: `${oldActive.slot.pokemon.name} was withdrawn! ${newPokemon[pokemonIndex].slot.pokemon.name} was sent out!`,
    kind: "switch",
  });

  // End Dynamax if the switching Pokemon was Dynamaxed
  if (oldActive.isDynamaxed) {
    const originalMaxHp = oldActive.originalMaxHp;
    const newCurrentHp = Math.min(Math.floor(oldActive.currentHp / 2), originalMaxHp);
    newPokemon[team.activePokemonIndex] = {
      ...newPokemon[team.activePokemonIndex],
      isDynamaxed: false,
      dynamaxTurnsLeft: 0,
      maxHp: originalMaxHp,
      currentHp: Math.max(1, newCurrentHp),
    };
  }

  let result: BattleState = {
    ...state,
    [player]: { pokemon: newPokemon, activePokemonIndex: pokemonIndex, selectedMechanic: team.selectedMechanic },
  };

  // Ability: onSwitchIn
  const switchedIn = getActivePokemon(result[player]);
  const opponentPlayer = player === "player1" ? "player2" : "player1";
  const opponent = getActivePokemon(result[opponentPlayer]);
  const hooks = getAbilityHooks(switchedIn.slot.ability);
  if (hooks?.onSwitchIn && !opponent.isFainted) {
    const effect = hooks.onSwitchIn({ pokemon: switchedIn, opponent });
    if (effect) {
      if (effect.message) {
        log.push({ turn: state.turn, message: effect.message, kind: "status" });
      }
      if (effect.type === "stat_drop" && effect.stat && effect.stages) {
        const target = getActivePokemon(result[opponentPlayer]);
        const statKey = effect.stat as keyof StatStages;
        const oldStage = target.statStages[statKey] ?? 0;
        const newStage = Math.max(-6, oldStage + effect.stages);
        if (newStage !== oldStage) {
          const updatedStages = { ...target.statStages, [statKey]: newStage };
          result = updatePokemon(result, opponentPlayer, result[opponentPlayer].activePokemonIndex, { ...target, statStages: updatedStages });
        }
      } else if (effect.type === "weather" && effect.weather) {
        result = {
          ...result,
          field: { ...result.field, weather: effect.weather, weatherTurnsLeft: effect.weatherTurns ?? 5 },
        };
      }
    }
  }

  return result;
}

function executeMove(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  moveIndex: number,
  log: BattleLogEntry[]
): BattleState {
  const defenderPlayer = attackerPlayer === "player1" ? "player2" : "player1";
  const attackerTeam = state[attackerPlayer];
  const defenderTeam = state[defenderPlayer];
  const attacker = getActivePokemon(attackerTeam);
  const defender = getActivePokemon(defenderTeam);

  if (attacker.isFainted) return state;

  // Flinch check — flinched Pokemon skip their move
  if (attacker.isFlinched) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} flinched and couldn't move!`, kind: "status" });
    return state;
  }

  // Status check: can the attacker move?
  if (attacker.status === "paralyze" && Math.random() < 0.25) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is paralyzed! It can't move!`, kind: "status" });
    return state;
  }
  if (attacker.status === "sleep") {
    if (attacker.sleepTurns <= 0) {
      // Wake up
      const newAttacker = { ...attacker, status: null as StatusCondition, sleepTurns: 0 };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} woke up!`, kind: "status" });
      return updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
    }
    const newAttacker = { ...attacker, sleepTurns: attacker.sleepTurns - 1 };
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is fast asleep!`, kind: "status" });
    return updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
  }
  if (attacker.status === "freeze") {
    if (Math.random() < 0.2) {
      const newAttacker = { ...attacker, status: null as StatusCondition };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} thawed out!`, kind: "status" });
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
    } else {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is frozen solid!`, kind: "status" });
      return state;
    }
  }

  const moves = attacker.slot.selectedMoves ?? [];
  const moveName = moves[moveIndex];
  if (!moveName) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} has no move to use!`, kind: "info" });
    return state;
  }

  log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used ${moveName.replace(/-/g, " ")}!`, kind: "info" });

  // Check if it's a status move with known effects
  const statusEffect = STATUS_MOVE_EFFECTS[moveName];
  if (statusEffect) {
    return applyStatusMoveEffect(state, attackerPlayer, defenderPlayer, statusEffect, moveName, log);
  }

  // For damaging moves, we need to simulate with a mock Move object
  // since we don't have the full Move data in battle state
  // We'll use a simplified approach
  return executeDamagingMove(state, attackerPlayer, defenderPlayer, moveName, moveIndex, log);
}

function executeDamagingMove(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  moveName: string,
  moveIndex: number,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const defenderTeam = state[defenderPlayer];
  const attacker = getActivePokemon(attackerTeam);
  const defender = getActivePokemon(defenderTeam);

  // Fake Out — only works on first turn on field
  const originalName = (attacker.slot.selectedMoves ?? [])[moveIndex] ?? "";
  if (originalName === "fake-out" && (attacker.turnsOnField ?? 0) > 0) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s Fake Out failed!`, kind: "info" });
    return state;
  }

  // Get move data — convert to Max Move if Dynamaxed
  let moveData = getBattleMove(attacker, moveIndex);
  const isDynamaxMove = attacker.isDynamaxed;
  if (isDynamaxMove) {
    const maxMoveData = convertToMaxMove({
      name: moveData.name,
      power: moveData.power,
      accuracy: moveData.accuracy,
      pp: moveData.pp,
      type: moveData.type,
      damage_class: moveData.damage_class,
      meta: moveData.meta,
    });
    // Max Guard (status → protect-like, skip damage)
    if (maxMoveData.name === "Max Guard") {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used Max Guard!`, kind: "info" });
      return state;
    }
    moveData = {
      ...moveData,
      name: maxMoveData.name,
      power: maxMoveData.power,
      accuracy: null, // Max Moves always hit
      type: { name: maxMoveData.type.name as TypeName },
    };
    // Update the log message to show Max Move name
    const logIdx = log.length - 1;
    if (logIdx >= 0) {
      log[logIdx] = { ...log[logIdx], message: `${attacker.slot.pokemon.name} used ${maxMoveData.name}!` };
    }
  }

  // Handle Tera Blast type override
  const originalMoveName = (attacker.slot.selectedMoves ?? [])[moveIndex] ?? "";
  if (originalMoveName === "tera-blast" && attacker.isTerastallized && attacker.teraType) {
    moveData = { ...moveData, type: { name: attacker.teraType } };
  }

  // Critical hit check
  const isCritical = Math.random() < (1 / 16);

  const result = calculateDamage(
    attacker.slot.pokemon,
    defender.slot.pokemon,
    moveData,
    {
      attackerEvs: attacker.slot.evs,
      attackerIvs: attacker.slot.ivs,
      attackerNature: attacker.slot.nature,
      attackerItem: attacker.slot.heldItem,
      attackerStatus: attacker.status,
      defenderEvs: defender.slot.evs,
      defenderIvs: defender.slot.ivs,
      defenderNature: defender.slot.nature,
      defenderItem: defender.slot.heldItem,
      isCritical,
      attackerStatStage: getRelevantAtkStage(attacker, moveData),
      defenderStatStage: getRelevantDefStage(defender, moveData),
      attackerEffectiveTypes: getEffectiveTypes(attacker),
      defenderEffectiveTypes: getEffectiveTypes(defender),
      attackerOriginalTypes: getOriginalTypes(attacker),
      isTerastallized: attacker.isTerastallized,
      fieldWeather: state.field.weather,
      activeStatOverride: attacker.activeStatOverride,
      attackerAbility: attacker.slot.ability,
      attackerBattlePokemon: attacker,
    }
  );

  // Accuracy check — Max Moves always hit
  if (!isDynamaxMove) {
    const accuracy = moveData.accuracy ?? 100;
    const accMod = getStatStageMultiplier(attacker.statStages.accuracy) /
                   getStatStageMultiplier(defender.statStages.evasion);
    if (Math.random() * 100 >= accuracy * accMod) {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s attack missed!`, kind: "miss" });
      return state;
    }
  }

  // Protect check — blocked moves do no damage
  if (defender.isProtected) {
    log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} protected itself!`, kind: "info" });
    return state;
  }

  if (result.effectiveness === 0) {
    log.push({ turn: state.turn, message: `It has no effect on ${defender.slot.pokemon.name}...`, kind: "info" });
    return state;
  }

  // Ability: modifyIncomingDamage (type immunities like Levitate, absorb abilities)
  const defenderAbility = getAbilityHooks(defender.slot.ability);
  if (defenderAbility?.modifyIncomingDamage) {
    const abilityResult = defenderAbility.modifyIncomingDamage({
      defender,
      attacker,
      moveType: moveData.type.name as TypeName,
      movePower: moveData.power ?? 0,
    });
    if (abilityResult) {
      if (abilityResult.multiplier === 0) {
        if (abilityResult.message) {
          log.push({ turn: state.turn, message: abilityResult.message, kind: "status" });
        }
        // Absorb abilities heal 25% HP
        if (abilityResult.healInstead) {
          const heal = Math.max(1, Math.floor(defender.maxHp / 4));
          const healedHp = Math.min(defender.maxHp, defender.currentHp + heal);
          state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, { ...defender, currentHp: healedHp });
        }
        return state;
      }
    }
  }

  // Determine hit count (multi-hit moves like Bullet Seed, Rock Blast)
  const minHits = moveData.meta?.min_hits ?? null;
  const maxHits = moveData.meta?.max_hits ?? null;
  let hitCount = 1;
  if (minHits && maxHits && maxHits > 1) {
    if (minHits === maxHits) {
      hitCount = minHits; // Fixed hit count (e.g. Double Slap = 2)
    } else {
      // Standard distribution: 35% for 2, 35% for 3, 15% for 4, 15% for 5
      const roll = Math.random();
      if (roll < 0.35) hitCount = 2;
      else if (roll < 0.70) hitCount = 3;
      else if (roll < 0.85) hitCount = 4;
      else hitCount = 5;
      hitCount = Math.min(hitCount, maxHits);
    }
  }

  let totalDamage = 0;
  let newDefender = { ...defender };
  let firstHitSurvivalUsed = false;

  for (let hit = 0; hit < hitCount; hit++) {
    if (newDefender.isFainted) break;

    // Each hit gets independent random factor and crit check (for multi-hit)
    const hitCritical = hitCount > 1 ? Math.random() < (1 / 16) : isCritical;
    const hitRandomFactor = 0.85 + Math.random() * 0.15;
    let hitDamage = Math.max(1, Math.floor(result.max * hitRandomFactor));

    // Ability: Multiscale halves damage at full HP (only applies on first hit)
    if (hit === 0 && defenderAbility?.modifyIncomingDamage) {
      const multiscaleResult = defenderAbility.modifyIncomingDamage({
        defender: newDefender,
        attacker,
        moveType: moveData.type.name as TypeName,
        movePower: moveData.power ?? 0,
      });
      if (multiscaleResult && multiscaleResult.multiplier > 0 && multiscaleResult.multiplier < 1) {
        hitDamage = Math.max(1, Math.floor(hitDamage * multiscaleResult.multiplier));
        if (multiscaleResult.message) {
          log.push({ turn: state.turn, message: multiscaleResult.message, kind: "status" });
        }
      }
    }

    const newHp = Math.max(0, newDefender.currentHp - hitDamage);
    newDefender = { ...newDefender, currentHp: newHp };

    // Ability: modifySurvival (Sturdy) — only on first hit
    if (newHp <= 0 && !firstHitSurvivalUsed && defenderAbility?.modifySurvival) {
      const survivalResult = defenderAbility.modifySurvival({ pokemon: defender, incomingDamage: hitDamage });
      if (survivalResult) {
        newDefender = { ...newDefender, currentHp: survivalResult.surviveWithHp };
        firstHitSurvivalUsed = true;
        if (survivalResult.message) {
          log.push({ turn: state.turn, message: survivalResult.message, kind: "info" });
        }
      }
    }

    // Focus Sash check — only on first hit at full HP
    if (newDefender.currentHp <= 0 && !firstHitSurvivalUsed && defender.currentHp === defender.maxHp && defender.slot.heldItem === "focus-sash") {
      newDefender = { ...newDefender, currentHp: 1 };
      firstHitSurvivalUsed = true;
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} hung on using its Focus Sash!`, kind: "info" });
    }

    if (newDefender.currentHp <= 0) {
      newDefender = { ...newDefender, currentHp: 0, isFainted: true, isActive: false };
    }

    totalDamage += hitDamage;

    if (hitCritical && hitCount === 1) {
      // Only log crit for single-hit moves (multi-hit logs after loop)
    }
  }

  // Log damage
  if (hitCount > 1) {
    log.push({
      turn: state.turn,
      message: `Hit ${Math.min(hitCount, newDefender.isFainted ? hitCount : hitCount)} time(s) for ${totalDamage} total damage! (${Math.round((newDefender.currentHp / defender.maxHp) * 100)}% HP remaining)`,
      kind: "damage",
    });
  } else {
    log.push({
      turn: state.turn,
      message: `${defender.slot.pokemon.name} took ${totalDamage} damage! (${Math.round((newDefender.currentHp / defender.maxHp) * 100)}% HP remaining)`,
      kind: "damage",
    });
  }

  if (result.isCritical && hitCount === 1) {
    log.push({ turn: state.turn, message: "A critical hit!", kind: "critical" });
  }
  if (result.effectiveness > 1) {
    log.push({ turn: state.turn, message: "It's super effective!", kind: "damage" });
  } else if (result.effectiveness < 1) {
    log.push({ turn: state.turn, message: "It's not very effective...", kind: "damage" });
  }

  if (newDefender.isFainted) {
    log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} fainted!`, kind: "faint" });
  }

  state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);

  // Ability: onAfterKO (Moxie, Beast Boost)
  if (newDefender.isFainted) {
    const attackerAbility = getAbilityHooks(attacker.slot.ability);
    if (attackerAbility?.onAfterKO) {
      const koResult = attackerAbility.onAfterKO({ attacker });
      if (koResult) {
        const currentAttacker = getActivePokemon(state[attackerPlayer]);
        let boostStat: keyof StatStages;
        if (koResult.stat === "best") {
          boostStat = getHighestStat(currentAttacker) as keyof StatStages;
        } else {
          boostStat = koResult.stat as keyof StatStages;
        }
        const oldStage = currentAttacker.statStages[boostStat] ?? 0;
        const newStage = Math.min(6, oldStage + koResult.stages);
        if (newStage !== oldStage) {
          const updatedStages = { ...currentAttacker.statStages, [boostStat]: newStage };
          state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, { ...currentAttacker, statStages: updatedStages });
          if (koResult.message) {
            log.push({ turn: state.turn, message: koResult.message, kind: "status" });
          }
        }
      }
    }
  }

  // Life Orb recoil
  if (attacker.slot.heldItem === "life-orb" && totalDamage > 0) {
    const recoil = Math.max(1, Math.floor(attacker.maxHp / 10));
    const attackerAfterRecoil = {
      ...getActivePokemon(state[attackerPlayer]),
      currentHp: Math.max(0, getActivePokemon(state[attackerPlayer]).currentHp - recoil),
    };
    if (attackerAfterRecoil.currentHp <= 0) {
      attackerAfterRecoil.currentHp = 0;
      attackerAfterRecoil.isFainted = true;
      attackerAfterRecoil.isActive = false;
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} was hurt by its Life Orb!`, kind: "damage" });
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} fainted!`, kind: "faint" });
    } else {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} was hurt by its Life Orb!`, kind: "damage" });
    }
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, attackerAfterRecoil);
  }

  // Apply Max Move field effects
  if (isDynamaxMove && totalDamage > 0) {
    const maxEffect = getMaxMoveEffect(moveData.name);
    if (maxEffect) {
      if (maxEffect.type === "weather" || maxEffect.type === "terrain") {
        state = applyFieldEffect(state, maxEffect, log);
      } else if (maxEffect.type === "stat_boost") {
        const active = getActivePokemon(state[attackerPlayer]);
        const statKey = maxEffect.stat as keyof StatStages;
        const oldStage = active.statStages[statKey] ?? 0;
        const newStage = Math.min(6, oldStage + 1);
        if (newStage !== oldStage) {
          const updatedStages = { ...active.statStages, [statKey]: newStage };
          state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, { ...active, statStages: updatedStages });
          log.push({ turn: state.turn, message: `${active.slot.pokemon.name}'s ${maxEffect.stat} rose!`, kind: "status" });
        }
      } else if (maxEffect.type === "stat_drop") {
        const target = getActivePokemon(state[defenderPlayer]);
        if (!target.isFainted) {
          const statKey = maxEffect.stat as keyof StatStages;
          const oldStage = target.statStages[statKey] ?? 0;
          const newStage = Math.max(-6, oldStage - 1);
          if (newStage !== oldStage) {
            const updatedStages = { ...target.statStages, [statKey]: newStage };
            state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...target, statStages: updatedStages });
            log.push({ turn: state.turn, message: `${target.slot.pokemon.name}'s ${maxEffect.stat} fell!`, kind: "status" });
          }
        }
      }
    }
  }

  // Apply secondary status effects from damaging moves
  const moveInfo = getBattleMove(attacker, moveIndex);
  if (moveInfo.meta?.ailment?.name && moveInfo.meta.ailment.name !== "none" && !newDefender.isFainted) {
    const chance = moveInfo.meta.ailment_chance ?? 0;
    if (chance === 0 || Math.random() * 100 < chance) {
      const statusName = moveInfo.meta.ailment.name as string;
      const statusMap: Record<string, StatusCondition> = {
        "burn": "burn",
        "paralysis": "paralyze",
        "poison": "poison",
        "freeze": "freeze",
        "sleep": "sleep",
        "toxic": "toxic",
      };
      const newStatus = statusMap[statusName];
      if (newStatus && !newDefender.status) {
        // Ability: preventStatus
        const defAbilitySecondary = getAbilityHooks(newDefender.slot.ability);
        const statusBlocked = defAbilitySecondary?.preventStatus && defAbilitySecondary.preventStatus({ pokemon: newDefender, status: newStatus });
        if (!statusBlocked) {
          newDefender = { ...newDefender, status: newStatus };
          if (newStatus === "sleep") {
            newDefender.sleepTurns = 1 + Math.floor(Math.random() * 3);
          }
          log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(newStatus)}!`, kind: "status" });
          state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
        }
      }
    }
  }

  // Recoil moves
  const RECOIL_MOVES: Record<string, number> = {
    "brave-bird": 1/3, "flare-blitz": 1/3, "double-edge": 1/3,
    "wild-charge": 1/4, "take-down": 1/4, "submission": 1/4,
    "head-smash": 1/2, "wood-hammer": 1/3,
  };
  const recoilFraction = RECOIL_MOVES[originalName];
  if (recoilFraction && totalDamage > 0) {
    const currentAttacker = getActivePokemon(state[attackerPlayer]);
    // Magic Guard blocks recoil
    const atkAbility = getAbilityHooks(currentAttacker.slot.ability);
    if (!atkAbility?.preventIndirectDamage) {
      const recoilDmg = Math.max(1, Math.floor(totalDamage * recoilFraction));
      const newAtkHp = Math.max(0, currentAttacker.currentHp - recoilDmg);
      let recoilAttacker = { ...currentAttacker, currentHp: newAtkHp };
      log.push({ turn: state.turn, message: `${currentAttacker.slot.pokemon.name} was hurt by recoil!`, kind: "damage" });
      if (newAtkHp <= 0) {
        recoilAttacker = { ...recoilAttacker, currentHp: 0, isFainted: true, isActive: false };
        log.push({ turn: state.turn, message: `${currentAttacker.slot.pokemon.name} fainted!`, kind: "faint" });
      }
      state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, recoilAttacker);
    }
  }

  // Drain moves
  const DRAIN_MOVES: Record<string, number> = {
    "giga-drain": 0.5, "drain-punch": 0.5, "horn-leech": 0.5,
    "absorb": 0.5, "mega-drain": 0.5, "leech-life": 0.5,
    "parabolic-charge": 0.5, "draining-kiss": 0.75,
    "oblivion-wing": 0.75,
  };
  const drainFraction = DRAIN_MOVES[originalName];
  if (drainFraction && totalDamage > 0) {
    const currentAttacker = getActivePokemon(state[attackerPlayer]);
    if (!currentAttacker.isFainted) {
      const healAmount = Math.max(1, Math.floor(totalDamage * drainFraction));
      const newAtkHp = Math.min(currentAttacker.maxHp, currentAttacker.currentHp + healAmount);
      state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, { ...currentAttacker, currentHp: newAtkHp });
      log.push({ turn: state.turn, message: `${currentAttacker.slot.pokemon.name} restored HP!`, kind: "heal" });
    }
  }

  // Fake Out flinch — target flinches on hit
  if (originalName === "fake-out" && !newDefender.isFainted) {
    const latestDefender = getActivePokemon(state[defenderPlayer]);
    state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...latestDefender, isFlinched: true });
  }

  // U-turn / Volt Switch pivot — attacker switches out after dealing damage
  const PIVOT_MOVES = ["u-turn", "volt-switch", "flip-turn"];
  if (PIVOT_MOVES.includes(originalName) && totalDamage > 0) {
    const currentAttacker = getActivePokemon(state[attackerPlayer]);
    if (!currentAttacker.isFainted) {
      // Check if attacker has available switch targets
      const hasSwitch = state[attackerPlayer].pokemon.some((p, i) => i !== state[attackerPlayer].activePokemonIndex && !p.isFainted);
      if (hasSwitch) {
        state = { ...state, pendingPivotSwitch: attackerPlayer };
      }
    }
  }

  // Track last move used and reset consecutiveProtects if not a protect move
  const currentAttackerFinal = getActivePokemon(state[attackerPlayer]);
  if (!currentAttackerFinal.isFainted) {
    const isProtectMove = originalName === "protect" || originalName === "detect";
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...currentAttackerFinal,
      lastMoveUsed: originalName,
      consecutiveProtects: isProtectMove ? currentAttackerFinal.consecutiveProtects : 0,
    });
  }

  return state;
}

function applyStatusMoveEffect(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  effect: typeof STATUS_MOVE_EFFECTS[string],
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const defenderTeam = state[defenderPlayer];

  // Protect moves
  if (effect.protect) {
    const attacker = getActivePokemon(state[attackerPlayer]);
    const consecutiveUses = attacker.consecutiveProtects ?? 0;
    // Success rate: first use always works, then (1/3)^n
    const successChance = consecutiveUses === 0 ? 1 : Math.pow(1 / 3, consecutiveUses);
    if (Math.random() < successChance) {
      const updated = {
        ...attacker,
        isProtected: true,
        consecutiveProtects: consecutiveUses + 1,
        lastMoveUsed: moveName,
      };
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, updated);
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} protected itself!`, kind: "info" });
    } else {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s Protect failed!`, kind: "info" });
      const updated = { ...attacker, consecutiveProtects: consecutiveUses + 1, lastMoveUsed: moveName };
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, updated);
    }
    return state;
  }

  // Self stat changes
  if (effect.selfStatChanges) {
    const attacker = getActivePokemon(state[attackerPlayer]);
    let newStages = { ...attacker.statStages };
    const messages: string[] = [];

    for (const [stat, changeVal] of Object.entries(effect.selfStatChanges)) {
      const change = changeVal ?? 0;
      const oldStage = newStages[stat as keyof StatStages] ?? 0;
      const newStage = Math.max(-6, Math.min(6, oldStage + change));
      newStages = { ...newStages, [stat]: newStage };

      if (newStage !== oldStage) {
        const statLabel = getStatLabel(stat);
        const changeText = change > 0
          ? (change >= 2 ? "rose drastically" : "rose")
          : (change <= -2 ? "fell drastically" : "fell");
        messages.push(`${attacker.slot.pokemon.name}'s ${statLabel} ${changeText}!`);
      }
    }

    const newAttacker = { ...attacker, statStages: newStages };

    // Belly Drum: costs 50% HP
    if (moveName === "belly-drum") {
      const cost = Math.floor(newAttacker.maxHp / 2);
      if (newAttacker.currentHp > cost) {
        newAttacker.currentHp -= cost;
        newAttacker.statStages.attack = 6;
        messages.push(`${attacker.slot.pokemon.name} cut its HP and maximized Attack!`);
      } else {
        log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} doesn't have enough HP!`, kind: "info" });
        return state;
      }
    }

    state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
    messages.forEach((m) => log.push({ turn: state.turn, message: m, kind: "status" }));
  }

  // Target stat changes
  if (effect.targetStatChanges) {
    const defender = getActivePokemon(state[defenderPlayer]);
    let newStages = { ...defender.statStages };
    const messages: string[] = [];

    for (const [stat, changeVal] of Object.entries(effect.targetStatChanges)) {
      const change = changeVal ?? 0;
      const oldStage = newStages[stat as keyof StatStages] ?? 0;
      const newStage = Math.max(-6, Math.min(6, oldStage + change));
      newStages = { ...newStages, [stat]: newStage };

      if (newStage !== oldStage) {
        const statLabel = getStatLabel(stat);
        const changeText = change > 0
          ? (change >= 2 ? "rose drastically" : "rose")
          : (change <= -2 ? "fell drastically" : "fell");
        messages.push(`${defender.slot.pokemon.name}'s ${statLabel} ${changeText}!`);
      }
    }

    state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, { ...defender, statStages: newStages });
    messages.forEach((m) => log.push({ turn: state.turn, message: m, kind: "status" }));
  }

  // Status condition
  if (effect.targetStatus) {
    const defender = getActivePokemon(state[defenderPlayer]);
    if (defender.status) {
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} is already affected by a status condition!`, kind: "info" });
    } else {
      // Ability: preventStatus
      const defAbility = getAbilityHooks(defender.slot.ability);
      if (defAbility?.preventStatus && defAbility.preventStatus({ pokemon: defender, status: effect.targetStatus })) {
        log.push({ turn: state.turn, message: `${defender.slot.pokemon.name}'s ability prevented the status condition!`, kind: "status" });
      } else {
        let newDefender = { ...defender, status: effect.targetStatus };
        if (effect.targetStatus === "sleep") {
          newDefender.sleepTurns = 1 + Math.floor(Math.random() * 3);
        }
        state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
        log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(effect.targetStatus)}!`, kind: "status" });
      }
    }
  }

  // Healing
  if (effect.healPercent) {
    const attacker = getActivePokemon(state[attackerPlayer]);
    const healAmount = Math.floor(attacker.maxHp * effect.healPercent / 100);
    const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
    let newAttacker = { ...attacker, currentHp: newHp };

    // Rest: heals fully but puts you to sleep
    if (moveName === "rest" && effect.targetStatus === "sleep") {
      newAttacker = { ...newAttacker, status: "sleep", sleepTurns: 2, currentHp: attacker.maxHp };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} went to sleep and restored HP!`, kind: "heal" });
    } else {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} restored HP!`, kind: "heal" });
    }

    state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
  }

  return state;
}

// --- End of Turn Effects ---

function applyEndOfTurnEffects(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(state[player]);
    if (active.isFainted) continue;

    let updated = { ...active };
    const abilityHooks = getAbilityHooks(updated.slot.ability);
    const blocksIndirect = abilityHooks?.preventIndirectDamage === true;

    // Ability: Poison Heal (replaces poison/toxic damage with healing)
    let poisonHandled = false;
    if (abilityHooks?.onEndOfTurn && (updated.status === "poison" || updated.status === "toxic")) {
      const endResult = abilityHooks.onEndOfTurn({ pokemon: updated });
      if (endResult?.type === "heal" && endResult.healFraction) {
        const heal = Math.max(1, Math.floor(updated.maxHp * endResult.healFraction));
        updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
        if (endResult.message) {
          log.push({ turn: state.turn, message: endResult.message, kind: "heal" });
        }
        poisonHandled = true;
      }
    }

    // Status damage (skip if Magic Guard or Poison Heal already handled)
    if (!poisonHandled && !blocksIndirect) {
      if (updated.status === "burn") {
        const damage = Math.max(1, Math.floor(updated.maxHp / 16));
        updated.currentHp = Math.max(0, updated.currentHp - damage);
        log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by its burn!`, kind: "status" });
      } else if (updated.status === "poison") {
        const damage = Math.max(1, Math.floor(updated.maxHp / 8));
        updated.currentHp = Math.max(0, updated.currentHp - damage);
        log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by poison!`, kind: "status" });
      } else if (updated.status === "toxic") {
        updated.toxicCounter = (updated.toxicCounter ?? 0) + 1;
        const damage = Math.max(1, Math.floor((updated.maxHp * updated.toxicCounter) / 16));
        updated.currentHp = Math.max(0, updated.currentHp - damage);
        log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by toxic poison!`, kind: "status" });
      }
    }

    // Leftovers / Black Sludge healing
    if (updated.slot.heldItem) {
      const item = getHeldItem(updated.slot.heldItem);
      if (item?.battleModifier?.type === "hp_restore" && item.battleModifier.value) {
        // Black Sludge only works on Poison types
        if (item.name === "black-sludge") {
          const types = updated.slot.pokemon.types.map((t) => t.type.name);
          if (types.includes("poison")) {
            const heal = Math.max(1, Math.floor(updated.maxHp * item.battleModifier.value));
            updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
            log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Black Sludge!`, kind: "heal" });
          }
        } else if (item.name === "leftovers") {
          const heal = Math.max(1, Math.floor(updated.maxHp * item.battleModifier.value));
          updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Leftovers!`, kind: "heal" });
        }
      }
    }

    // Sitrus Berry
    if (updated.slot.heldItem === "sitrus-berry" && updated.currentHp <= updated.maxHp / 2 && updated.currentHp > 0) {
      const heal = Math.floor(updated.maxHp * 0.25);
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      updated = { ...updated, slot: { ...updated.slot, heldItem: null } }; // consumed
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with its Sitrus Berry!`, kind: "heal" });
    }

    // Weather damage (sandstorm/hail) — blocked by Magic Guard
    if (!blocksIndirect) {
      if (state.field.weather === "sandstorm") {
        const types = getEffectiveTypes(updated);
        if (!types.includes("rock") && !types.includes("ground") && !types.includes("steel")) {
          const weatherDmg = Math.max(1, Math.floor(updated.maxHp / 16));
          updated.currentHp = Math.max(0, updated.currentHp - weatherDmg);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was buffeted by the sandstorm!`, kind: "weather" });
        }
      } else if (state.field.weather === "hail") {
        const types = getEffectiveTypes(updated);
        if (!types.includes("ice")) {
          const weatherDmg = Math.max(1, Math.floor(updated.maxHp / 16));
          updated.currentHp = Math.max(0, updated.currentHp - weatherDmg);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was buffeted by the hail!`, kind: "weather" });
        }
      }
    }

    // Grassy Terrain healing
    if (state.field.terrain === "grassy") {
      const heal = Math.max(1, Math.floor(updated.maxHp / 16));
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was healed by the Grassy Terrain!`, kind: "heal" });
    }

    // Ability: onEndOfTurn — Speed Boost (only if not already handled as Poison Heal)
    if (!poisonHandled && abilityHooks?.onEndOfTurn) {
      const endResult = abilityHooks.onEndOfTurn({ pokemon: updated });
      if (endResult?.type === "speed_boost" && endResult.stat && endResult.stages) {
        const statKey = endResult.stat as keyof StatStages;
        const oldStage = updated.statStages[statKey] ?? 0;
        const newStage = Math.min(6, oldStage + endResult.stages);
        if (newStage !== oldStage) {
          updated = { ...updated, statStages: { ...updated.statStages, [statKey]: newStage } };
          if (endResult.message) {
            log.push({ turn: state.turn, message: endResult.message, kind: "status" });
          }
        }
      }
    }

    // Faint from status/weather damage
    if (updated.currentHp <= 0) {
      updated = { ...updated, currentHp: 0, isFainted: true, isActive: false };
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} fainted!`, kind: "faint" });
    }

    state = updatePokemon(state, player, state[player].activePokemonIndex, updated);
  }

  return state;
}

// --- Faint Checking ---

function checkFaints(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(state[player]);
    if (active.isFainted) {
      // Check if team has any alive Pokemon
      const alive = state[player].pokemon.filter((p) => !p.isFainted);
      if (alive.length === 0) {
        const winner = player === "player1" ? "player2" : "player1";
        log.push({ turn: state.turn, message: `${winner === "player1" ? "Player 1" : "Player 2"} wins!`, kind: "info" });
        return { ...state, log, phase: "ended", winner };
      }
      // Need to switch
      return { ...state, log, phase: "force_switch", waitingForSwitch: player };
    }
  }

  return { ...state, log, phase: "action_select" };
}

// --- Helpers ---

function updatePokemon(
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

function getStatusText(status: StatusCondition): string {
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

// Pre-loaded move cache for battle
const battleMoveCache: Map<string, BattleMoveData> = new Map();

export function cacheBattleMove(name: string, data: BattleMoveData) {
  battleMoveCache.set(name, data);
}

export function getCachedMoves(): Map<string, BattleMoveData> {
  return battleMoveCache;
}

function getBattleMove(attacker: BattlePokemon, moveIndex: number): Move {
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
      type: { name: cached.type.name as any },
      damage_class: { name: cached.damage_class.name },
      meta: cached.meta,
    };
  }

  // Fallback: create a default move (shouldn't happen if moves are pre-loaded)
  return {
    id: 0,
    name: moveName,
    power: 80,
    accuracy: 100,
    pp: 15,
    priority: 0,
    type: { name: attacker.slot.pokemon.types[0]?.type.name ?? "normal" as any },
    damage_class: { name: "physical" },
  };
}

function getRelevantAtkStage(attacker: BattlePokemon, move: Move): number {
  return move.damage_class.name === "physical"
    ? attacker.statStages.attack
    : attacker.statStages.spAtk;
}

function getRelevantDefStage(defender: BattlePokemon, move: Move): number {
  return move.damage_class.name === "physical"
    ? defender.statStages.defense
    : defender.statStages.spDef;
}
