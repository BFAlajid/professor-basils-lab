import {
  BattleState,
  BattleAction,
  BattlePokemon,
  BattleTeam,
  BattleTurnAction,
  BattleLogEntry,
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

  // Handle switches first (switches always go before moves)
  if (p1Action.type === "SWITCH") {
    newState = performSwitch(newState, "player1", p1Action.pokemonIndex, log);
  }
  if (p2Action.type === "SWITCH") {
    newState = performSwitch(newState, "player2", p2Action.pokemonIndex, log);
  }

  // Determine move order by speed
  const p1Active = getActivePokemon(newState.player1);
  const p2Active = getActivePokemon(newState.player2);

  let firstPlayer: "player1" | "player2";
  let secondPlayer: "player1" | "player2";
  let firstAction: BattleTurnAction;
  let secondAction: BattleTurnAction;

  const p1Speed = getEffectiveSpeed(p1Active);
  const p2Speed = getEffectiveSpeed(p2Active);

  if (p1Speed > p2Speed || (p1Speed === p2Speed && Math.random() < 0.5)) {
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
  // Activate new
  newPokemon[pokemonIndex] = {
    ...newPokemon[pokemonIndex],
    isActive: true,
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

  return {
    ...state,
    [player]: { pokemon: newPokemon, activePokemonIndex: pokemonIndex, selectedMechanic: team.selectedMechanic },
  };
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

  // We need cached move data — in battle mode, moves are stored on BattlePokemon
  // For now, use a fallback estimation approach based on what we can derive
  // The real move data should be fetched and cached before battle starts
  // We'll use the move data that should be attached to the battle state

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

  if (result.effectiveness === 0) {
    log.push({ turn: state.turn, message: `It has no effect on ${defender.slot.pokemon.name}...`, kind: "info" });
    return state;
  }

  // Calculate actual damage with random factor
  const randomFactor = 0.85 + Math.random() * 0.15;
  const damage = Math.max(1, Math.floor(result.max * randomFactor));

  const newHp = Math.max(0, defender.currentHp - damage);
  let newDefender = { ...defender, currentHp: newHp };

  // Focus Sash check
  if (newHp <= 0 && defender.currentHp === defender.maxHp && defender.slot.heldItem === "focus-sash") {
    newDefender = { ...newDefender, currentHp: 1 };
    log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} hung on using its Focus Sash!`, kind: "info" });
  }

  if (newDefender.currentHp <= 0) {
    newDefender = { ...newDefender, currentHp: 0, isFainted: true, isActive: false };
  }

  log.push({
    turn: state.turn,
    message: `${defender.slot.pokemon.name} took ${damage} damage! (${Math.round((newDefender.currentHp / defender.maxHp) * 100)}% HP remaining)`,
    kind: "damage",
  });

  if (result.isCritical) {
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

  // Life Orb recoil
  if (attacker.slot.heldItem === "life-orb" && damage > 0) {
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
  if (isDynamaxMove && damage > 0) {
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
        newDefender = { ...newDefender, status: newStatus };
        if (newStatus === "sleep") {
          newDefender.sleepTurns = 1 + Math.floor(Math.random() * 3);
        }
        log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(newStatus)}!`, kind: "status" });
        state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
      }
    }
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
        const statLabel = stat === "spAtk" ? "Sp. Atk" : stat === "spDef" ? "Sp. Def" : stat.charAt(0).toUpperCase() + stat.slice(1);
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
        const statLabel = stat === "spAtk" ? "Sp. Atk" : stat === "spDef" ? "Sp. Def" : stat.charAt(0).toUpperCase() + stat.slice(1);
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
      let newDefender = { ...defender, status: effect.targetStatus };
      if (effect.targetStatus === "sleep") {
        newDefender.sleepTurns = 1 + Math.floor(Math.random() * 3);
      }
      state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(effect.targetStatus)}!`, kind: "status" });
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

    // Status damage
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

    // Weather damage (sandstorm/hail)
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

    // Grassy Terrain healing
    if (state.field.terrain === "grassy") {
      const heal = Math.max(1, Math.floor(updated.maxHp / 16));
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was healed by the Grassy Terrain!`, kind: "heal" });
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

// Battle move data — pre-loaded moves should be stored on the battle state
// This is a fallback that creates a minimal Move object from what we know
// In the actual implementation, moves should be fetched and cached before battle
export interface BattleMoveData {
  name: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: { name: string };
  damage_class: { name: "physical" | "special" | "status" };
  meta?: {
    ailment?: { name: string };
    ailment_chance?: number;
  };
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
