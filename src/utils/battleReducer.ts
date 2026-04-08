import {
  BattleState,
  BattleAction,
  BattlePokemon,
  BattleTeam,
  BattleTurnAction,
  BattleLogEntry,
  DoublesTarget,
  TeamSlot,
  GenerationalMechanic,
  AltFormeData,
  FieldState,
  SideConditions,
  StatStages,
} from "@/types";
import { extractBaseStats } from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { isMegaStone } from "@/data/megaStones";
import { getCachedMoves } from "./battleHelpers";
import { getAbilityHooks } from "@/data/abilities";
import {
  initStatStages,
  getActivePokemon,
  getActivePokemonBySlot,
  getActiveDoublesSlots,
  getEffectiveSpeed,
  updatePokemon,
  getMoveIndexFromAction,
  getMovePriority,
  initSideConditions,
  triggerOnStatDrop,
} from "./battleHelpers";

// --- Doubles Constants ---
export const SPREAD_MOVES = new Set([
  "earthquake", "surf", "rock-slide", "heat-wave", "dazzling-gleam",
  "discharge", "muddy-water", "blizzard", "sludge-wave",
]);
export const ALLY_TARGET_MOVES = new Set(["helping-hand"]);
export const SPREAD_DAMAGE_MODIFIER = 0.75;
import { applyMegaEvolution, applyTerastallization, applyDynamax, endDynamax } from "./battleMechanics";
import { executeMove } from "./battleExecution";
import { applyEndOfTurnEffects, applyHazardsOnSwitchIn } from "./battleEffects";

// --- Initialization ---

export function initBattlePokemon(slot: TeamSlot, megaFormeCache?: Map<string, AltFormeData>): BattlePokemon {
  const baseStats = extractBaseStats(slot.pokemon);
  const calc = calculateAllStats(
    baseStats,
    slot.ivs ?? DEFAULT_IVS,
    slot.evs ?? DEFAULT_EVS,
    slot.nature ?? null
  );

  let megaFormeData: AltFormeData | null = null;
  if (megaFormeCache && slot.heldItem && isMegaStone(slot.heldItem)) {
    megaFormeData = megaFormeCache.get(slot.pokemon.name) ?? null;
  }

  const startHp = slot.startingHpPercent != null
    ? Math.max(1, Math.floor(calc.hp * slot.startingHpPercent))
    : calc.hp;

  // Initialize move PP from cached move data
  const cachedMoves = getCachedMoves();
  const selectedMoves = slot.selectedMoves ?? [];
  const moveMaxPP = selectedMoves.map((moveName) => {
    const cached = cachedMoves.get(moveName);
    return cached?.pp ?? 15;
  });
  const movePP = [...moveMaxPP];

  return {
    slot,
    currentHp: startHp,
    maxHp: calc.hp,
    status: null,
    statStages: initStatStages(),
    isActive: false,
    isFainted: false,
    toxicCounter: 0,
    sleepTurns: 0,
    confusionTurns: 0,
    movePP,
    moveMaxPP,
    turnsOnField: 0,
    isProtected: false,
    lastMoveUsed: null,
    consecutiveProtects: 0,
    isFlinched: false,
    choiceLockedMove: null,
    focusEnergy: false,
    substituteHp: 0,
    chargingMove: null,
    semiInvulnerable: null,
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
    roostActive: false,
    yawnTurns: 0,
  };
}

export function initBattleTeam(
  slots: TeamSlot[],
  mechanic: GenerationalMechanic = null,
  megaFormeCache?: Map<string, AltFormeData>,
  format: "singles" | "doubles" = "singles"
): BattleTeam {
  const pokemon = slots.map((s) => initBattlePokemon(s, megaFormeCache));
  if (pokemon.length > 0) pokemon[0].isActive = true;
  let activePokemonIndex2: number | null = null;
  if (format === "doubles" && pokemon.length > 1) {
    pokemon[1].isActive = true;
    activePokemonIndex2 = 1;
  }
  return { pokemon, activePokemonIndex: 0, activePokemonIndex2, selectedMechanic: mechanic };
}

// --- Initial State ---

const initialFieldState: FieldState = {
  weather: null,
  weatherTurnsLeft: 0,
  terrain: null,
  terrainTurnsLeft: 0,
  trickRoom: 0,
  player1Side: initSideConditions(),
  player2Side: initSideConditions(),
};

export const initialBattleState: BattleState = {
  phase: "setup",
  mode: "ai",
  format: "singles",
  turn: 0,
  player1: { pokemon: [], activePokemonIndex: 0, activePokemonIndex2: null, selectedMechanic: null },
  player2: { pokemon: [], activePokemonIndex: 0, activePokemonIndex2: null, selectedMechanic: null },
  log: [],
  winner: null,
  waitingForSwitch: null,
  waitingForSwitchSlot: null,
  currentTurnPlayer: "player1",
  field: { ...initialFieldState },
  difficulty: "normal",
  pendingPivotSwitch: null,
};

// --- Battle Reducer ---

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "START_BATTLE": {
      const format = action.format ?? "singles";
      const p1 = initBattleTeam(action.player1Team, action.player1Mechanic ?? null, action.megaFormeCache, format);
      const p2 = initBattleTeam(action.player2Team, action.player2Mechanic ?? null, action.megaFormeCache, format);
      const log: BattleLogEntry[] = [
        { turn: 0, message: `${format === "doubles" ? "Doubles b" : "B"}attle start!`, kind: "info" },
        { turn: 0, message: `${action.player1Team[0].pokemon.name} was sent out!`, kind: "switch" },
        { turn: 0, message: `${action.player2Team[0].pokemon.name} was sent out!`, kind: "switch" },
      ];
      if (format === "doubles") {
        if (action.player1Team.length > 1) {
          log.push({ turn: 0, message: `${action.player1Team[1].pokemon.name} was sent out!`, kind: "switch" });
        }
        if (action.player2Team.length > 1) {
          log.push({ turn: 0, message: `${action.player2Team[1].pokemon.name} was sent out!`, kind: "switch" });
        }
      }
      let newState: BattleState = {
        ...state,
        phase: "action_select",
        mode: action.mode,
        format,
        turn: 0,
        player1: p1,
        player2: p2,
        log,
        winner: null,
        waitingForSwitch: null,
        waitingForSwitchSlot: null,
        currentTurnPlayer: "player1",
        field: { ...initialFieldState },
        difficulty: action.difficulty ?? "normal",
        pendingPivotSwitch: null,
      };

      // Trigger lead abilities (Intimidate, Drizzle, etc.) for both players
      for (const player of ["player1", "player2"] as const) {
        const oppPlayer = player === "player1" ? "player2" : "player1";
        const switchedIn = getActivePokemon(newState[player]);
        const opp = getActivePokemon(newState[oppPlayer]);
        const abilityHooks = getAbilityHooks(switchedIn.slot.ability);
        if (abilityHooks?.onSwitchIn && !opp.isFainted) {
          const effect = abilityHooks.onSwitchIn({ pokemon: switchedIn, opponent: opp });
          if (effect) {
            if (effect.message) {
              newState = { ...newState, log: [...newState.log, { turn: 0, message: effect.message, kind: "status" }] };
            }
            if (effect.type === "stat_drop" && effect.stat && effect.stages) {
              const target = getActivePokemon(newState[oppPlayer]);
              const statKey = effect.stat as keyof StatStages;
              const oldStage = target.statStages[statKey] ?? 0;
              const newStage = Math.max(-6, oldStage + effect.stages);
              if (newStage !== oldStage) {
                newState = updatePokemon(newState, oppPlayer, newState[oppPlayer].activePokemonIndex, {
                  ...target, statStages: { ...target.statStages, [statKey]: newStage },
                });
              }
            } else if (effect.type === "weather" && effect.weather) {
              newState = { ...newState, field: { ...newState.field, weather: effect.weather, weatherTurnsLeft: effect.weatherTurns ?? 5 } };
            } else if (effect.type === "terrain" && effect.terrain) {
              newState = { ...newState, field: { ...newState.field, terrain: effect.terrain, terrainTurnsLeft: effect.terrainTurns ?? 5 } };
            }
          }
        }
      }

      return newState;
    }

    case "EXECUTE_TURN": {
      if (state.format === "doubles" && action.player1Action2 && action.player2Action2) {
        return executeDoublesTurn(state, action.player1Action, action.player1Action2, action.player2Action, action.player2Action2);
      }
      return executeTurn(state, action.player1Action, action.player2Action);
    }

    case "FORCE_SWITCH": {
      const team = { ...state[action.player] };
      const newPokemon = [...team.pokemon];

      // Determine which active slot is being replaced
      const switchSlot = action.slot ?? state.waitingForSwitchSlot ?? 0;
      const oldIndex = switchSlot === 1 && team.activePokemonIndex2 !== null
        ? team.activePokemonIndex2
        : team.activePokemonIndex;

      newPokemon[oldIndex] = {
        ...newPokemon[oldIndex],
        isActive: false,
        statStages: initStatStages(),
        confusionTurns: 0,
        toxicCounter: 0,
        consecutiveProtects: 0,
        isProtected: false,
        isFlinched: false,
        turnsOnField: 0,
        focusEnergy: false,
        substituteHp: 0,
        chargingMove: null,
        semiInvulnerable: null,
        yawnTurns: 0,
      };
      newPokemon[action.pokemonIndex] = {
        ...newPokemon[action.pokemonIndex],
        isActive: true,
        turnsOnField: 0,
      };

      const updatedTeam: BattleTeam = {
        pokemon: newPokemon,
        activePokemonIndex: switchSlot === 0 ? action.pokemonIndex : team.activePokemonIndex,
        activePokemonIndex2: switchSlot === 1 ? action.pokemonIndex : team.activePokemonIndex2,
        selectedMechanic: team.selectedMechanic,
      };

      const log = [
        ...state.log,
        {
          turn: state.turn,
          message: `${newPokemon[action.pokemonIndex].slot.pokemon.name} was sent out!`,
          kind: "switch" as const,
        },
      ];

      let newState: BattleState = {
        ...state,
        [action.player]: updatedTeam,
        log,
      };

      // Apply ability onSwitchIn (use correct slot for doubles)
      const switchedInIdx = switchSlot === 1 ? updatedTeam.activePokemonIndex2 : updatedTeam.activePokemonIndex;
      const switchedIn = switchedInIdx !== null ? newState[action.player].pokemon[switchedInIdx] : getActivePokemon(newState[action.player]);
      const oppPlayer = action.player === "player1" ? "player2" : "player1";
      const opp = getActivePokemon(newState[oppPlayer]);
      const abilityHooks = getAbilityHooks(switchedIn.slot.ability);
      if (abilityHooks?.onSwitchIn && !opp.isFainted) {
        const effect = abilityHooks.onSwitchIn({ pokemon: switchedIn, opponent: opp });
        if (effect) {
          if (effect.message) {
            const log: BattleLogEntry[] = [...newState.log, { turn: state.turn, message: effect.message, kind: "status" }];
            newState = { ...newState, log };
          }
          if (effect.type === "stat_drop" && effect.stat && effect.stages) {
            const target = getActivePokemon(newState[oppPlayer]);
            const statKey = effect.stat as keyof StatStages;
            const oldStage = target.statStages[statKey] ?? 0;
            const newStage = Math.max(-6, oldStage + effect.stages);
            if (newStage !== oldStage) {
              newState = updatePokemon(newState, oppPlayer, newState[oppPlayer].activePokemonIndex, {
                ...target, statStages: { ...target.statStages, [statKey]: newStage },
              });
            }
          } else if (effect.type === "weather" && effect.weather) {
            newState = { ...newState, field: { ...newState.field, weather: effect.weather, weatherTurnsLeft: effect.weatherTurns ?? 5 } };
          } else if (effect.type === "terrain" && effect.terrain) {
            newState = { ...newState, field: { ...newState.field, terrain: effect.terrain, terrainTurnsLeft: effect.terrainTurns ?? 5 } };
          }
        }
      }

      newState = applyHazardsOnSwitchIn(newState, action.player, newState.log);

      if (state.waitingForSwitch === action.player) {
        return { ...newState, phase: "action_select", waitingForSwitch: null, waitingForSwitchSlot: null };
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
        roostActive: false,
        consecutiveProtects: 0,
        turnsOnField: (active.turnsOnField ?? 0) + 1,
      });
    }
  }

  // Handle switches first
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

  const p1Priority = getMovePriority(p1Active, p1Action);
  const p2Priority = getMovePriority(p2Active, p2Action);

  let p1Speed = getEffectiveSpeed(p1Active, newState.field.player1Side);
  let p2Speed = getEffectiveSpeed(p2Active, newState.field.player2Side);

  // Trick Room reverses speed order
  if (newState.field.trickRoom > 0) {
    const temp = p1Speed;
    p1Speed = p2Speed;
    p2Speed = temp;
  }

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
    if (firstAction.type === "MEGA_EVOLVE") {
      newState = applyMegaEvolution(newState, firstPlayer, log);
    } else if (firstAction.type === "TERASTALLIZE") {
      newState = applyTerastallization(newState, firstPlayer, log);
    } else if (firstAction.type === "DYNAMAX") {
      newState = applyDynamax(newState, firstPlayer, log);
    }
    newState = executeMove(newState, firstPlayer, firstMoveIdx, log);
  }

  // Execute second action if not fainted
  const secondActive = getActivePokemon(newState[secondPlayer]);
  const secondMoveIdx = getMoveIndexFromAction(secondAction);
  if (!secondActive.isFainted && secondMoveIdx !== null) {
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

  // Handle pivot switch (U-turn/Volt Switch)
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

// --- Doubles Turn Execution ---

interface DoublesActionEntry {
  player: "player1" | "player2";
  slot: 0 | 1;
  action: BattleTurnAction;
  pokemonIndex: number;
}

function executeDoublesTurn(
  state: BattleState,
  p1Action1: BattleTurnAction,
  p1Action2: BattleTurnAction,
  p2Action1: BattleTurnAction,
  p2Action2: BattleTurnAction,
): BattleState {
  let newState = { ...state, turn: state.turn + 1 };
  const log: BattleLogEntry[] = [...state.log];

  log.push({ turn: newState.turn, message: `--- Turn ${newState.turn} ---`, kind: "info" });

  // Reset per-turn flags for all active Pokemon
  for (const player of ["player1", "player2"] as const) {
    const slots = getActiveDoublesSlots(newState[player]);
    for (const { index, pokemon } of slots) {
      newState = updatePokemon(newState, player, index, {
        ...pokemon,
        isProtected: false,
        isFlinched: false,
        roostActive: false,
        consecutiveProtects: 0,
        turnsOnField: (pokemon.turnsOnField ?? 0) + 1,
      });
    }
  }

  // Build action entries with their Pokemon
  const allEntries: DoublesActionEntry[] = [
    { player: "player1", slot: 0, action: p1Action1, pokemonIndex: newState.player1.activePokemonIndex },
    { player: "player1", slot: 1, action: p1Action2, pokemonIndex: newState.player1.activePokemonIndex2 ?? -1 },
    { player: "player2", slot: 0, action: p2Action1, pokemonIndex: newState.player2.activePokemonIndex },
    { player: "player2", slot: 1, action: p2Action2, pokemonIndex: newState.player2.activePokemonIndex2 ?? -1 },
  ];
  const entries = allEntries.filter(e => e.pokemonIndex >= 0);

  // Handle switches first (switches always go before moves)
  for (const entry of entries) {
    if (entry.action.type === "SWITCH") {
      newState = performDoublesSwitch(newState, entry.player, entry.slot, entry.action.pokemonIndex, log);
    }
  }

  // Sort remaining move actions by priority, then speed
  const moveEntries = entries.filter(e => e.action.type !== "SWITCH");
  moveEntries.sort((a, b) => {
    const aPkmn = getActivePokemonBySlot(newState[a.player], a.slot);
    const bPkmn = getActivePokemonBySlot(newState[b.player], b.slot);
    if (!aPkmn || !bPkmn) return 0;

    const aPri = getMovePriority(aPkmn, a.action);
    const bPri = getMovePriority(bPkmn, b.action);
    if (aPri !== bPri) return bPri - aPri; // higher priority first

    const aSideKey = a.player === "player1" ? "player1Side" : "player2Side";
    const bSideKey = b.player === "player1" ? "player1Side" : "player2Side";
    let aSpeed = getEffectiveSpeed(aPkmn, newState.field[aSideKey]);
    let bSpeed = getEffectiveSpeed(bPkmn, newState.field[bSideKey]);

    if (newState.field.trickRoom > 0) {
      const tmp = aSpeed;
      aSpeed = bSpeed;
      bSpeed = tmp;
    }

    if (aSpeed !== bSpeed) return bSpeed - aSpeed; // higher speed first
    return Math.random() < 0.5 ? -1 : 1; // speed tie
  });

  // Execute each move action
  for (const entry of moveEntries) {
    const pokemon = getActivePokemonBySlot(newState[entry.player], entry.slot);
    if (!pokemon || pokemon.isFainted) continue;

    const moveIdx = getMoveIndexFromAction(entry.action);
    if (moveIdx === null) continue;

    // Apply mechanic transformations
    if (entry.action.type === "MEGA_EVOLVE") {
      newState = applyMegaEvolution(newState, entry.player, log);
    } else if (entry.action.type === "TERASTALLIZE") {
      newState = applyTerastallization(newState, entry.player, log);
    } else if (entry.action.type === "DYNAMAX") {
      newState = applyDynamax(newState, entry.player, log);
    }

    // Determine target for doubles
    const target = "target" in entry.action ? entry.action.target : undefined;
    newState = executeMoveDoubles(newState, entry.player, entry.slot, moveIdx, target, log);
  }

  // End-of-turn effects
  newState = applyEndOfTurnEffects(newState, log);

  // Tick field effects
  newState = tickFieldEffects(newState, log);

  // Check for faints
  newState = checkFaints(newState, log);

  newState.log = log;
  return newState;
}

function performDoublesSwitch(
  state: BattleState,
  player: "player1" | "player2",
  slot: 0 | 1,
  pokemonIndex: number,
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const oldIndex = slot === 0 ? team.activePokemonIndex : (team.activePokemonIndex2 ?? -1);
  if (oldIndex < 0) return state;

  const oldActive = team.pokemon[oldIndex];
  const newPokemon = [...team.pokemon];

  newPokemon[oldIndex] = {
    ...oldActive,
    isActive: false,
    statStages: initStatStages(),
    choiceLockedMove: null,
    confusionTurns: 0,
    toxicCounter: 0,
    focusEnergy: false,
    substituteHp: 0,
    chargingMove: null,
    semiInvulnerable: null,
    yawnTurns: 0,
  };
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

  const updatedTeam: BattleTeam = {
    pokemon: newPokemon,
    activePokemonIndex: slot === 0 ? pokemonIndex : team.activePokemonIndex,
    activePokemonIndex2: slot === 1 ? pokemonIndex : team.activePokemonIndex2,
    selectedMechanic: team.selectedMechanic,
  };

  let result: BattleState = { ...state, [player]: updatedTeam };
  result = applyHazardsOnSwitchIn(result, player, log);
  return result;
}

function executeMoveDoubles(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  attackerSlot: 0 | 1,
  moveIndex: number,
  target: DoublesTarget | undefined,
  log: BattleLogEntry[]
): BattleState {
  const defenderPlayer = attackerPlayer === "player1" ? "player2" : "player1";
  const attackerTeam = state[attackerPlayer];
  const attackerPokemon = getActivePokemonBySlot(attackerTeam, attackerSlot);
  if (!attackerPokemon || attackerPokemon.isFainted) return state;

  const moveName = (attackerPokemon.slot.selectedMoves ?? [])[moveIndex] ?? "";
  const isSpread = SPREAD_MOVES.has(moveName);

  if (isSpread || target === "spread") {
    // Hit both opponent slots at 0.75x damage
    const oppSlots = getActiveDoublesSlots(state[defenderPlayer]);
    let result = state;
    for (const oppSlot of oppSlots) {
      if (oppSlot.pokemon.isFainted) continue;
      // Use the standard executeMove, targeting each opponent slot
      // We temporarily set the defender's activePokemonIndex to the target
      result = executeMoveSingleTarget(result, attackerPlayer, attackerSlot, defenderPlayer, oppSlot.slot, moveIndex, log, true);
    }
    return result;
  }

  // Single target move
  const targetSlot = resolveDoublesTarget(target, defenderPlayer, state);
  return executeMoveSingleTarget(state, attackerPlayer, attackerSlot, defenderPlayer, targetSlot, moveIndex, log, false);
}

function resolveDoublesTarget(
  target: DoublesTarget | undefined,
  defenderPlayer: "player1" | "player2",
  state: BattleState,
): 0 | 1 {
  if (target === "opp1") {
    const p1 = getActivePokemonBySlot(state[defenderPlayer], 1);
    if (p1 && !p1.isFainted) return 1;
    return 0; // fallback to slot 0 if slot 1 is fainted
  }
  // Default to slot 0
  return 0;
}

function executeMoveSingleTarget(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  attackerSlot: 0 | 1,
  defenderPlayer: "player1" | "player2",
  defenderSlot: 0 | 1,
  moveIndex: number,
  log: BattleLogEntry[],
  isSpread: boolean,
): BattleState {
  // For doubles, we need to temporarily point the active indices at the right Pokemon
  // so that executeMove (which uses getActivePokemon) resolves to the correct targets.
  const origAttackerIdx = state[attackerPlayer].activePokemonIndex;
  const origDefenderIdx = state[defenderPlayer].activePokemonIndex;

  const attackerIdx = attackerSlot === 0
    ? state[attackerPlayer].activePokemonIndex
    : (state[attackerPlayer].activePokemonIndex2 ?? state[attackerPlayer].activePokemonIndex);
  const defenderIdx = defenderSlot === 0
    ? state[defenderPlayer].activePokemonIndex
    : (state[defenderPlayer].activePokemonIndex2 ?? state[defenderPlayer].activePokemonIndex);

  // Temporarily swap indices
  let tempState = {
    ...state,
    [attackerPlayer]: { ...state[attackerPlayer], activePokemonIndex: attackerIdx },
    [defenderPlayer]: { ...state[defenderPlayer], activePokemonIndex: defenderIdx },
  };

  // Store spread flag on state for damage calculation to pick up
  if (isSpread) {
    tempState = { ...tempState, spreadDamageModifier: SPREAD_DAMAGE_MODIFIER };
  }

  // Execute using existing single-target logic
  tempState = executeMove(tempState, attackerPlayer, moveIndex, log);

  // Clean up spread flag
  if (isSpread) {
    const { spreadDamageModifier: _, ...cleanState } = tempState;
    tempState = cleanState as BattleState;
  }

  // Restore original active indices (but keep Pokemon state changes)
  // Only restore if the Pokemon at the original index is not fainted (a faint may have changed indices)
  const attackerFainted = tempState[attackerPlayer].pokemon[origAttackerIdx]?.isFainted;
  const defenderFainted = tempState[defenderPlayer].pokemon[origDefenderIdx]?.isFainted;
  const result = {
    ...tempState,
    [attackerPlayer]: { ...tempState[attackerPlayer], activePokemonIndex: attackerFainted ? tempState[attackerPlayer].activePokemonIndex : origAttackerIdx },
    [defenderPlayer]: { ...tempState[defenderPlayer], activePokemonIndex: defenderFainted ? tempState[defenderPlayer].activePokemonIndex : origDefenderIdx },
  };

  return result;
}

function performSwitch(
  state: BattleState,
  player: "player1" | "player2",
  pokemonIndex: number,
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const oldActive = getActivePokemon(team);

  // Check trapping abilities — opponent's ability may prevent switching
  const trapOpponentPlayer = player === "player1" ? "player2" : "player1";
  const trapOpponent = getActivePokemon(state[trapOpponentPlayer]);
  if (!trapOpponent.isFainted) {
    const oppHooks = getAbilityHooks(trapOpponent.slot.ability);
    if (oppHooks?.onTrapping) {
      const trapped = oppHooks.onTrapping({ pokemon: trapOpponent, opponent: oldActive });
      if (trapped) {
        log.push({ turn: state.turn, message: `${oldActive.slot.pokemon.name} can't escape!`, kind: "status" });
        return state;
      }
    }
  }

  const newPokemon = [...team.pokemon];

  // Apply onSwitchOut ability effects (Regenerator, Natural Cure) before deactivating
  let switchOutPokemon = { ...oldActive };
  if (!switchOutPokemon.isFainted) {
    const switchOutHooks = getAbilityHooks(switchOutPokemon.slot.ability);
    if (switchOutHooks?.onSwitchOut) {
      const switchOutEffect = switchOutHooks.onSwitchOut({ pokemon: switchOutPokemon });
      if (switchOutEffect) {
        if (switchOutEffect.type === "heal" && switchOutEffect.healFraction) {
          const healAmount = Math.max(1, Math.floor(switchOutPokemon.maxHp * switchOutEffect.healFraction));
          switchOutPokemon = {
            ...switchOutPokemon,
            currentHp: Math.min(switchOutPokemon.maxHp, switchOutPokemon.currentHp + healAmount),
          };
        } else if (switchOutEffect.type === "cure_status") {
          switchOutPokemon = { ...switchOutPokemon, status: null, toxicCounter: 0 };
        }
        if (switchOutEffect.message) {
          log.push({ turn: state.turn, message: switchOutEffect.message, kind: "status" });
        }
      }
    }
  }

  newPokemon[team.activePokemonIndex] = {
    ...switchOutPokemon,
    isActive: false,
    statStages: initStatStages(),
    choiceLockedMove: null,
    confusionTurns: 0,
    toxicCounter: 0,
    focusEnergy: false,
    substituteHp: 0,
    chargingMove: null,
    semiInvulnerable: null,
    yawnTurns: 0,
  };
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
    [player]: { pokemon: newPokemon, activePokemonIndex: pokemonIndex, activePokemonIndex2: team.activePokemonIndex2, selectedMechanic: team.selectedMechanic },
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
          result = triggerOnStatDrop(result, opponentPlayer, statKey, effect.stages, log);
        }
      } else if (effect.type === "weather" && effect.weather) {
        result = {
          ...result,
          field: { ...result.field, weather: effect.weather, weatherTurnsLeft: effect.weatherTurns ?? 5 },
        };
      } else if (effect.type === "terrain" && effect.terrain) {
        result = {
          ...result,
          field: { ...result.field, terrain: effect.terrain, terrainTurnsLeft: effect.terrainTurns ?? 5 },
        };
      }
    }
  }

  result = applyHazardsOnSwitchIn(result, player, log);

  return result;
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

  // Trick Room countdown
  if (field.trickRoom > 0) {
    field.trickRoom--;
    if (field.trickRoom <= 0) {
      log.push({ turn: state.turn, message: `The twisted dimensions returned to normal!`, kind: "status" });
    }
  }

  for (const sideKey of ["player1Side", "player2Side"] as const) {
    const side = field[sideKey];
    const updatedSide = { ...side };
    let changed = false;

    if (updatedSide.reflect > 0) {
      updatedSide.reflect--;
      changed = true;
      if (updatedSide.reflect <= 0) {
        log.push({ turn: state.turn, message: `${sideKey === "player1Side" ? "Player 1" : "Player 2"}'s Reflect wore off!`, kind: "status" });
      }
    }
    if (updatedSide.lightScreen > 0) {
      updatedSide.lightScreen--;
      changed = true;
      if (updatedSide.lightScreen <= 0) {
        log.push({ turn: state.turn, message: `${sideKey === "player1Side" ? "Player 1" : "Player 2"}'s Light Screen wore off!`, kind: "status" });
      }
    }
    if (updatedSide.tailwind > 0) {
      updatedSide.tailwind--;
      changed = true;
      if (updatedSide.tailwind <= 0) {
        log.push({ turn: state.turn, message: `${sideKey === "player1Side" ? "Player 1" : "Player 2"}'s Tailwind petered out!`, kind: "status" });
      }
    }

    if (changed) {
      field = { ...field, [sideKey]: updatedSide };
    }
  }

  return { ...state, field };
}

function checkFaints(state: BattleState, log: BattleLogEntry[]): BattleState {
  // In doubles, check if all Pokemon on one side are fainted (not just active ones)
  if (state.format === "doubles") {
    return checkFaintsDoubles(state, log);
  }

  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(state[player]);
    if (active.isFainted) {
      const alive = state[player].pokemon.filter((p) => !p.isFainted);
      if (alive.length === 0) {
        const winner = player === "player1" ? "player2" : "player1";
        log.push({ turn: state.turn, message: `${winner === "player1" ? "Player 1" : "Player 2"} wins!`, kind: "info" });
        return { ...state, log, phase: "ended", winner };
      }
      return { ...state, log, phase: "force_switch", waitingForSwitch: player, waitingForSwitchSlot: 0 };
    }
  }

  return { ...state, log, phase: "action_select" };
}

function checkFaintsDoubles(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const alive = state[player].pokemon.filter((p) => !p.isFainted);
    if (alive.length === 0) {
      const winner = player === "player1" ? "player2" : "player1";
      log.push({ turn: state.turn, message: `${winner === "player1" ? "Player 1" : "Player 2"} wins!`, kind: "info" });
      return { ...state, log, phase: "ended", winner };
    }
  }

  // Check if any active slot has a fainted Pokemon that needs replacing
  for (const player of ["player1", "player2"] as const) {
    const team = state[player];
    const active1 = team.pokemon[team.activePokemonIndex];
    const active2 = team.activePokemonIndex2 !== null ? team.pokemon[team.activePokemonIndex2] : null;
    const benchAlive = team.pokemon.filter((p, i) =>
      i !== team.activePokemonIndex && i !== team.activePokemonIndex2 && !p.isFainted
    );

    if (active1 && active1.isFainted && benchAlive.length > 0) {
      return { ...state, log, phase: "force_switch", waitingForSwitch: player, waitingForSwitchSlot: 0 };
    }
    if (active2 && active2.isFainted && benchAlive.length > 0) {
      // Check there's someone not already filling slot 0
      const slot0Alive = active1 && !active1.isFainted;
      const remainingBench = slot0Alive ? benchAlive : benchAlive.slice(1);
      if (remainingBench.length > 0 || (slot0Alive && benchAlive.length > 0)) {
        return { ...state, log, phase: "force_switch", waitingForSwitch: player, waitingForSwitchSlot: 1 };
      }
    }
  }

  return { ...state, log, phase: "action_select" };
}
