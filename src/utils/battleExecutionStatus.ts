import {
  BattleState,
  BattleLogEntry,
  StatusCondition,
  StatStages,
} from "@/types";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { getAbilityHooks } from "@/data/abilities";
import { STAT_STAGE_MIN, STAT_STAGE_MAX, SLEEP_TURN_MIN, SLEEP_TURN_RANGE } from "@/data/constants";
import { getStatLabel, getStatChangeText } from "./format";
import {
  getActivePokemon,
  updatePokemon,
  getStatusText,
  initSideConditions,
  triggerOnStatDrop,
} from "./battleHelpers";

const PROTECT_CONSECUTIVE_RATE = 1 / 3;

function handleProtect(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const attacker = getActivePokemon(attackerTeam);
  const consecutiveUses = attacker.consecutiveProtects ?? 0;
  const successChance = consecutiveUses === 0 ? 1 : Math.pow(PROTECT_CONSECUTIVE_RATE, consecutiveUses);

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

function handleSelfStatChanges(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  effect: typeof STATUS_MOVE_EFFECTS[string],
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const attacker = getActivePokemon(attackerTeam);
  let newStages = { ...attacker.statStages };
  const messages: string[] = [];

  for (const [stat, changeVal] of Object.entries(effect.selfStatChanges!)) {
    const change = changeVal ?? 0;
    const oldStage = newStages[stat as keyof StatStages] ?? 0;
    const newStage = Math.max(STAT_STAGE_MIN, Math.min(STAT_STAGE_MAX, oldStage + change));
    newStages = { ...newStages, [stat]: newStage };

    if (newStage !== oldStage) {
      const statLabel = getStatLabel(stat);
      const changeText = getStatChangeText(change);
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

  return state;
}

function handleTargetStatChanges(
  state: BattleState,
  defenderPlayer: "player1" | "player2",
  effect: typeof STATUS_MOVE_EFFECTS[string],
  log: BattleLogEntry[]
): BattleState {
  const defenderTeam = state[defenderPlayer];
  const defender = getActivePokemon(defenderTeam);
  let newStages = { ...defender.statStages };
  const messages: string[] = [];
  let hadDrop = false;

  for (const [stat, changeVal] of Object.entries(effect.targetStatChanges!)) {
    const change = changeVal ?? 0;
    const oldStage = newStages[stat as keyof StatStages] ?? 0;
    const newStage = Math.max(STAT_STAGE_MIN, Math.min(STAT_STAGE_MAX, oldStage + change));
    newStages = { ...newStages, [stat]: newStage };

    if (newStage !== oldStage) {
      const statLabel = getStatLabel(stat);
      const changeText = getStatChangeText(change);
      messages.push(`${defender.slot.pokemon.name}'s ${statLabel} ${changeText}!`);
      if (change < 0) hadDrop = true;
    }
  }

  state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, { ...defender, statStages: newStages });
  messages.forEach((m) => log.push({ turn: state.turn, message: m, kind: "status" }));

  if (hadDrop) {
    state = triggerOnStatDrop(state, defenderPlayer, "any", -1, log);
  }

  return state;
}

function handleStatusInfliction(
  state: BattleState,
  defenderPlayer: "player1" | "player2",
  targetStatus: StatusCondition,
  log: BattleLogEntry[]
): BattleState {
  const defenderTeam = state[defenderPlayer];
  const defender = getActivePokemon(defenderTeam);

  if (defender.status) {
    log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} is already affected by a status condition!`, kind: "info" });
  } else {
    const defAbility = getAbilityHooks(defender.slot.ability);
    if (defAbility?.preventStatus && defAbility.preventStatus({ pokemon: defender, status: targetStatus })) {
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name}'s ability prevented the status condition!`, kind: "status" });
    } else {
      let newDefender = { ...defender, status: targetStatus };
      if (targetStatus === "sleep") {
        newDefender.sleepTurns = SLEEP_TURN_MIN + Math.floor(Math.random() * SLEEP_TURN_RANGE);
      }
      state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(targetStatus)}!`, kind: "status" });
    }
  }

  return state;
}

function handleHazard(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  hazard: string,
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const targetSideKey = defenderPlayer === "player1" ? "player1Side" : "player2Side";
  const targetSide = { ...state.field[targetSideKey] };
  const attacker = getActivePokemon(attackerTeam);
  let set = false;

  if (hazard === "stealth-rock") {
    if (targetSide.stealthRock) {
      log.push({ turn: state.turn, message: `Stealth Rock is already set!`, kind: "info" });
    } else {
      targetSide.stealthRock = true;
      set = true;
      log.push({ turn: state.turn, message: `Pointed stones float in the air around the opposing team!`, kind: "hazard" });
    }
  } else if (hazard === "spikes") {
    if (targetSide.spikesLayers >= 3) {
      log.push({ turn: state.turn, message: `Spikes are already at maximum layers!`, kind: "info" });
    } else {
      targetSide.spikesLayers++;
      set = true;
      log.push({ turn: state.turn, message: `Spikes were scattered on the ground around the opposing team!`, kind: "hazard" });
    }
  } else if (hazard === "toxic-spikes") {
    if (targetSide.toxicSpikesLayers >= 2) {
      log.push({ turn: state.turn, message: `Toxic Spikes are already at maximum layers!`, kind: "info" });
    } else {
      targetSide.toxicSpikesLayers++;
      set = true;
      log.push({ turn: state.turn, message: `Toxic Spikes were scattered on the ground around the opposing team!`, kind: "hazard" });
    }
  } else if (hazard === "sticky-web") {
    if (targetSide.stickyWeb) {
      log.push({ turn: state.turn, message: `A Sticky Web is already set!`, kind: "info" });
    } else {
      targetSide.stickyWeb = true;
      set = true;
      log.push({ turn: state.turn, message: `A sticky web spreads out beneath the opposing team!`, kind: "hazard" });
    }
  }

  if (set) {
    state = { ...state, field: { ...state.field, [targetSideKey]: targetSide } };
  }

  if (!attacker.isFainted) {
    state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, {
      ...getActivePokemon(state[attackerPlayer]),
      lastMoveUsed: moveName,
      consecutiveProtects: 0,
    });
  }

  return state;
}

function handleHazardRemoval(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  clearType: string,
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attacker = getActivePokemon(state[attackerPlayer]);

  if (clearType === "rapid-spin") {
    const ownSideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
    const ownSide = state.field[ownSideKey];
    const hadHazards = ownSide.stealthRock || ownSide.spikesLayers > 0 || ownSide.toxicSpikesLayers > 0 || ownSide.stickyWeb;

    if (hadHazards) {
      state = { ...state, field: { ...state.field, [ownSideKey]: initSideConditions() } };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} blew away the hazards!`, kind: "hazard" });
    }

    const currentAttacker = getActivePokemon(state[attackerPlayer]);
    const oldSpd = currentAttacker.statStages.speed;
    const newSpd = Math.min(STAT_STAGE_MAX, oldSpd + 1);
    if (newSpd !== oldSpd) {
      state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
        ...currentAttacker,
        statStages: { ...currentAttacker.statStages, speed: newSpd },
        lastMoveUsed: moveName,
        consecutiveProtects: 0,
      });
      log.push({ turn: state.turn, message: `${currentAttacker.slot.pokemon.name}'s Speed rose!`, kind: "status" });
    }
  } else if (clearType === "defog") {
    const p1Side = initSideConditions();
    const p2Side = initSideConditions();
    const hadAny =
      state.field.player1Side.stealthRock || state.field.player1Side.spikesLayers > 0 ||
      state.field.player1Side.toxicSpikesLayers > 0 || state.field.player1Side.stickyWeb ||
      state.field.player2Side.stealthRock || state.field.player2Side.spikesLayers > 0 ||
      state.field.player2Side.toxicSpikesLayers > 0 || state.field.player2Side.stickyWeb ||
      state.field.player1Side.reflect > 0 || state.field.player1Side.lightScreen > 0 ||
      state.field.player2Side.reflect > 0 || state.field.player2Side.lightScreen > 0;

    state = { ...state, field: { ...state.field, player1Side: p1Side, player2Side: p2Side } };

    if (hadAny) {
      log.push({ turn: state.turn, message: `All hazards and screens were blown away!`, kind: "hazard" });
    }

    const defender = getActivePokemon(state[defenderPlayer]);
    const oldEva = defender.statStages.evasion;
    const newEva = Math.max(STAT_STAGE_MIN, oldEva - 1);
    if (newEva !== oldEva) {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defender,
        statStages: { ...defender.statStages, evasion: newEva },
      });
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name}'s evasion fell!`, kind: "status" });
    }
  }

  const atkAfter = getActivePokemon(state[attackerPlayer]);
  if (!atkAfter.isFainted) {
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...atkAfter,
      lastMoveUsed: moveName,
      consecutiveProtects: 0,
    });
  }

  return state;
}

function handleScreen(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  effect: typeof STATUS_MOVE_EFFECTS[string],
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const ownSideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
  const ownSide = { ...state.field[ownSideKey] };
  const attacker = getActivePokemon(attackerTeam);

  if (effect.reflect) {
    if (ownSide.reflect > 0) {
      log.push({ turn: state.turn, message: `Reflect is already active!`, kind: "info" });
    } else {
      ownSide.reflect = 5;
      log.push({ turn: state.turn, message: `Reflect raised ${attacker.slot.pokemon.name}'s team's Defense!`, kind: "status" });
    }
  }
  if (effect.lightScreen) {
    if (ownSide.lightScreen > 0) {
      log.push({ turn: state.turn, message: `Light Screen is already active!`, kind: "info" });
    } else {
      ownSide.lightScreen = 5;
      log.push({ turn: state.turn, message: `Light Screen raised ${attacker.slot.pokemon.name}'s team's Sp. Def!`, kind: "status" });
    }
  }

  state = { ...state, field: { ...state.field, [ownSideKey]: ownSide } };

  if (!attacker.isFainted) {
    state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, {
      ...getActivePokemon(state[attackerPlayer]),
      lastMoveUsed: moveName,
      consecutiveProtects: 0,
    });
  }

  return state;
}

function handleHeal(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  healPercent: number,
  targetStatus: StatusCondition | undefined,
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const attacker = getActivePokemon(attackerTeam);
  const healAmount = Math.floor(attacker.maxHp * healPercent / 100);
  const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
  let newAttacker = { ...attacker, currentHp: newHp };

  if (moveName === "rest" && targetStatus === "sleep") {
    newAttacker = { ...newAttacker, status: "sleep", sleepTurns: 2, currentHp: attacker.maxHp };
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} went to sleep and restored HP!`, kind: "heal" });
  } else {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} restored HP!`, kind: "heal" });
  }

  state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);

  return state;
}

export function applyStatusMoveEffect(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  effect: typeof STATUS_MOVE_EFFECTS[string],
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  if (effect.protect) return handleProtect(state, attackerPlayer, moveName, log);

  if (effect.selfStatChanges) {
    state = handleSelfStatChanges(state, attackerPlayer, effect, moveName, log);
  }
  if (effect.targetStatChanges) {
    state = handleTargetStatChanges(state, defenderPlayer, effect, log);
  }
  if (effect.targetStatus) {
    state = handleStatusInfliction(state, defenderPlayer, effect.targetStatus, log);
  }
  if (effect.hazard) return handleHazard(state, attackerPlayer, defenderPlayer, effect.hazard, moveName, log);
  if (effect.clearHazards) return handleHazardRemoval(state, attackerPlayer, defenderPlayer, effect.clearHazards, moveName, log);
  if (effect.reflect || effect.lightScreen) return handleScreen(state, attackerPlayer, effect, moveName, log);
  if (effect.healPercent) {
    state = handleHeal(state, attackerPlayer, effect.healPercent, effect.targetStatus, moveName, log);
  }

  return state;
}
