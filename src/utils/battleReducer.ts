import {
  BattleState,
  BattleAction,
  BattlePokemon,
  BattleTeam,
  BattleTurnAction,
  BattleLogEntry,
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
import { getAbilityHooks } from "@/data/abilities";
import {
  initStatStages,
  getActivePokemon,
  getEffectiveSpeed,
  updatePokemon,
  getMoveIndexFromAction,
  getMovePriority,
  initSideConditions,
  triggerOnStatDrop,
} from "./battleHelpers";
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
    turnsOnField: 0,
    isProtected: false,
    lastMoveUsed: null,
    consecutiveProtects: 0,
    isFlinched: false,
    choiceLockedMove: null,
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

// --- Initial State ---

const initialFieldState: FieldState = {
  weather: null,
  weatherTurnsLeft: 0,
  terrain: null,
  terrainTurnsLeft: 0,
  player1Side: initSideConditions(),
  player2Side: initSideConditions(),
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

      newPokemon[team.activePokemonIndex] = {
        ...newPokemon[team.activePokemonIndex],
        isActive: false,
      };
      newPokemon[action.pokemonIndex] = {
        ...newPokemon[action.pokemonIndex],
        isActive: true,
        turnsOnField: 0,
      };

      const updatedTeam: BattleTeam = {
        pokemon: newPokemon,
        activePokemonIndex: action.pokemonIndex,
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

      // Apply ability onSwitchIn
      const switchedIn = getActivePokemon(newState[action.player]);
      const oppPlayer = action.player === "player1" ? "player2" : "player1";
      const opp = getActivePokemon(newState[oppPlayer]);
      const abilityHooks = getAbilityHooks(switchedIn.slot.ability);
      if (abilityHooks?.onSwitchIn && !opp.isFainted) {
        const effect = abilityHooks.onSwitchIn({ pokemon: switchedIn, opponent: opp });
        if (effect) {
          if (effect.message) {
            newState.log.push({ turn: state.turn, message: effect.message, kind: "status" });
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
          }
        }
      }

      newState = applyHazardsOnSwitchIn(newState, action.player, newState.log);

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

  const p1Speed = getEffectiveSpeed(p1Active);
  const p2Speed = getEffectiveSpeed(p2Active);

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

function performSwitch(
  state: BattleState,
  player: "player1" | "player2",
  pokemonIndex: number,
  log: BattleLogEntry[]
): BattleState {
  const team = state[player];
  const oldActive = getActivePokemon(team);
  const newPokemon = [...team.pokemon];

  newPokemon[team.activePokemonIndex] = {
    ...oldActive,
    isActive: false,
    statStages: initStatStages(),
    choiceLockedMove: null,
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
          result = triggerOnStatDrop(result, opponentPlayer, statKey, effect.stages, log);
        }
      } else if (effect.type === "weather" && effect.weather) {
        result = {
          ...result,
          field: { ...result.field, weather: effect.weather, weatherTurnsLeft: effect.weatherTurns ?? 5 },
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

  for (const sideKey of ["player1Side", "player2Side"] as const) {
    const side = field[sideKey];
    if (side.reflect > 0 || side.lightScreen > 0) {
      const updatedSide = { ...side };
      if (updatedSide.reflect > 0) {
        updatedSide.reflect--;
        if (updatedSide.reflect <= 0) {
          log.push({ turn: state.turn, message: `${sideKey === "player1Side" ? "Player 1" : "Player 2"}'s Reflect wore off!`, kind: "status" });
        }
      }
      if (updatedSide.lightScreen > 0) {
        updatedSide.lightScreen--;
        if (updatedSide.lightScreen <= 0) {
          log.push({ turn: state.turn, message: `${sideKey === "player1Side" ? "Player 1" : "Player 2"}'s Light Screen wore off!`, kind: "status" });
        }
      }
      field = { ...field, [sideKey]: updatedSide };
    }
  }

  return { ...state, field };
}

function checkFaints(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(state[player]);
    if (active.isFainted) {
      const alive = state[player].pokemon.filter((p) => !p.isFainted);
      if (alive.length === 0) {
        const winner = player === "player1" ? "player2" : "player1";
        log.push({ turn: state.turn, message: `${winner === "player1" ? "Player 1" : "Player 2"} wins!`, kind: "info" });
        return { ...state, log, phase: "ended", winner };
      }
      return { ...state, log, phase: "force_switch", waitingForSwitch: player };
    }
  }

  return { ...state, log, phase: "action_select" };
}
