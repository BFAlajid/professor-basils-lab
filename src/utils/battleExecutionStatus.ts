import {
  BattleState,
  BattleLogEntry,
  StatusCondition,
  StatStages,
} from "@/types";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { getAbilityHooks } from "@/data/abilities";
import { getHeldItem } from "@/data/heldItems";
import { STAT_STAGE_MIN, STAT_STAGE_MAX, SLEEP_TURN_MIN, SLEEP_TURN_RANGE, CONFUSION_TURN_MIN, CONFUSION_TURN_RANGE } from "@/data/constants";
import { getStatLabel, getStatChangeText } from "./format";
import {
  getActivePokemon,
  updatePokemon,
  getStatusText,
  getEffectiveTypes,
  initStatStages,
  triggerOnStatDrop,
} from "./battleHelpers";
import { battleRandom } from "./battleRng";

const PROTECT_CONSECUTIVE_RATE = 1 / 3;

// Weather-dependent recovery moves heal more in sun, less in rain/sand/hail
const WEATHER_HEAL_MOVES = new Set(["moonlight", "morning-sun", "synthesis"]);

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

  if (battleRandom() < successChance) {
    const updated = {
      ...attacker,
      isProtected: true,
      consecutiveProtects: consecutiveUses + 1,
      lastMoveUsed: moveName,
      lastMoveTurn: state.turn,
    };
    state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, updated);
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} protected itself!`, kind: "info" });
  } else {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s Protect failed!`, kind: "info" });
    const updated = { ...attacker, consecutiveProtects: 0, lastMoveUsed: moveName, lastMoveTurn: state.turn };
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
    // Type-based status immunities (respects Tera/Mega type changes)
    const defenderTypes = getEffectiveTypes(defender);
    const typeImmune =
      (targetStatus === "burn" && defenderTypes.includes("fire")) ||
      (targetStatus === "freeze" && defenderTypes.includes("ice")) ||
      (targetStatus === "paralyze" && defenderTypes.includes("electric")) ||
      ((targetStatus === "poison" || targetStatus === "toxic") && (defenderTypes.includes("poison") || defenderTypes.includes("steel")));
    const defAbility = getAbilityHooks(defender.slot.ability);
    if (typeImmune) {
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} is immune!`, kind: "info" });
    } else if (defAbility?.preventStatus && defAbility.preventStatus({ pokemon: defender, status: targetStatus })) {
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name}'s ability prevented the status condition!`, kind: "status" });
    } else {
      const newDefender = { ...defender, status: targetStatus };
      if (targetStatus === "sleep") {
        newDefender.sleepTurns = SLEEP_TURN_MIN + Math.floor(battleRandom() * SLEEP_TURN_RANGE);
      }
      state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(targetStatus)}!`, kind: "status" });

      // Status-cure berry check
      state = checkStatusCureBerry(state, defenderPlayer, targetStatus, log);
    }
  }

  return state;
}

function checkStatusCureBerry(
  state: BattleState,
  player: "player1" | "player2",
  status: StatusCondition,
  log: BattleLogEntry[],
): BattleState {
  const team = state[player];
  const pokemon = getActivePokemon(team);
  if (!pokemon.slot.heldItem || pokemon.itemConsumed || pokemon.embargoed > 0 || !status) return state;

  const item = getHeldItem(pokemon.slot.heldItem);
  if (!item?.battleModifier?.statusCure) return state;

  const cure = item.battleModifier.statusCure;
  const cures = cure === "any" ||
    cure === status ||
    (cure === "poison" && status === "toxic");

  if (!cures) return state;

  const updated = { ...pokemon, status: null as StatusCondition, itemConsumed: true, toxicCounter: 0 };
  state = updatePokemon(state, player, team.activePokemonIndex, updated);
  log.push({ turn: state.turn, message: `${pokemon.slot.pokemon.name}'s ${item.displayName} cured its ${getStatusText(status)}!`, kind: "heal" });

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
      lastMoveTurn: state.turn,
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
      const clearedSide = { ...ownSide, stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false };
      state = { ...state, field: { ...state.field, [ownSideKey]: clearedSide } };
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
        lastMoveTurn: state.turn,
        consecutiveProtects: 0,
      });
      log.push({ turn: state.turn, message: `${currentAttacker.slot.pokemon.name}'s Speed rose!`, kind: "status" });
    }
  } else if (clearType === "defog") {
    const ownSideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
    const oppSideKey = defenderPlayer === "player1" ? "player1Side" : "player2Side";
    const ownSide = state.field[ownSideKey];
    const oppSide = state.field[oppSideKey];

    const hadAny =
      ownSide.stealthRock || ownSide.spikesLayers > 0 ||
      ownSide.toxicSpikesLayers > 0 || ownSide.stickyWeb ||
      oppSide.stealthRock || oppSide.spikesLayers > 0 ||
      oppSide.toxicSpikesLayers > 0 || oppSide.stickyWeb ||
      oppSide.reflect > 0 || oppSide.lightScreen > 0;

    // Remove hazards from both sides, but only screens from the opponent's side
    const clearedOwnSide = { ...ownSide, stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false };
    const clearedOppSide = { ...oppSide, stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 };
    state = { ...state, field: { ...state.field, [ownSideKey]: clearedOwnSide, [oppSideKey]: clearedOppSide } };

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
      lastMoveTurn: state.turn,
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
      lastMoveTurn: state.turn,
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

  if (attacker.healBlocked > 0) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} can't heal due to Heal Block!`, kind: "info" });
    return state;
  }

  // Weather-dependent recovery: sun = 67%, neutral = 50%, rain/sand/hail = 25%
  let effectivePercent = healPercent;
  if (WEATHER_HEAL_MOVES.has(moveName)) {
    const weather = state.field.weather;
    if (weather === "sun") effectivePercent = 67;
    else if (weather === "rain" || weather === "sandstorm" || weather === "hail") effectivePercent = 25;
  }

  const healAmount = Math.floor(attacker.maxHp * effectivePercent / 100);
  const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
  let newAttacker = { ...attacker, currentHp: newHp };

  if (moveName === "rest" && targetStatus === "sleep") {
    newAttacker = { ...newAttacker, status: "sleep", sleepTurns: 3, currentHp: attacker.maxHp };
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} went to sleep and restored HP!`, kind: "heal" });
  } else {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} restored HP!`, kind: "heal" });
  }

  // Roost removes Flying type for the remainder of the turn
  if (moveName === "roost") {
    newAttacker = { ...newAttacker, roostActive: true };
  }

  state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);

  return state;
}

function handleFocusEnergy(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const attacker = getActivePokemon(attackerTeam);

  if (attacker.focusEnergy) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is already pumped up!`, kind: "info" });
    return state;
  }

  const newAttacker = { ...attacker, focusEnergy: true };
  state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
  log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is getting pumped!`, kind: "status" });

  return state;
}

function handleConfusion(
  state: BattleState,
  defenderPlayer: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const defenderTeam = state[defenderPlayer];
  const defender = getActivePokemon(defenderTeam);

  if (defender.confusionTurns > 0) {
    log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} is already confused!`, kind: "info" });
    return state;
  }

  const turns = CONFUSION_TURN_MIN + Math.floor(battleRandom() * CONFUSION_TURN_RANGE);
  const newDefender = { ...defender, confusionTurns: turns };
  state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
  log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} became confused!`, kind: "status" });

  // Confusion-cure berry check (Persim Berry, Lum Berry)
  state = checkConfusionCureBerry(state, defenderPlayer, log);

  return state;
}

function checkConfusionCureBerry(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[],
): BattleState {
  const team = state[player];
  const pokemon = getActivePokemon(team);
  if (!pokemon.slot.heldItem || pokemon.itemConsumed || pokemon.embargoed > 0) return state;

  const item = getHeldItem(pokemon.slot.heldItem);
  if (!item?.battleModifier?.statusCure) return state;

  const cure = item.battleModifier.statusCure;
  if (cure !== "confusion" && cure !== "any") return state;

  const updated = { ...pokemon, confusionTurns: 0, itemConsumed: true };
  state = updatePokemon(state, player, team.activePokemonIndex, updated);
  log.push({ turn: state.turn, message: `${pokemon.slot.pokemon.name}'s ${item.displayName} cured its confusion!`, kind: "heal" });

  return state;
}

function handleSubstitute(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const attacker = getActivePokemon(attackerTeam);
  const cost = Math.floor(attacker.maxHp / 4);

  if (attacker.substituteHp > 0) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} already has a substitute!`, kind: "info" });
    return state;
  }

  if (attacker.currentHp <= cost) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} doesn't have enough HP to make a substitute!`, kind: "info" });
    return state;
  }

  const newAttacker = {
    ...attacker,
    currentHp: attacker.currentHp - cost,
    substituteHp: cost,
    lastMoveUsed: moveName,
    lastMoveTurn: state.turn,
    consecutiveProtects: 0,
  };
  state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
  log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} made a substitute!`, kind: "status" });

  return state;
}

function handleWish(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const attackerTeam = state[attackerPlayer];
  const attacker = getActivePokemon(attackerTeam);
  const sideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
  const side = state.field[sideKey];

  if (side.wishPending > 0) {
    log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    return state;
  }

  const wishAmount = Math.floor(attacker.maxHp / 2);
  const updatedSide = { ...side, wishPending: 2, wishAmount };
  state = { ...state, field: { ...state.field, [sideKey]: updatedSide } };
  log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} made a wish!`, kind: "status" });

  return state;
}

function handleYawn(
  state: BattleState,
  defenderPlayer: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const defenderTeam = state[defenderPlayer];
  const defender = getActivePokemon(defenderTeam);

  if (defender.yawnTurns > 0) {
    log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    return state;
  }

  if (defender.status) {
    log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    return state;
  }

  const newDefender = { ...defender, yawnTurns: 2 };
  state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
  log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} grew drowsy!`, kind: "status" });

  return state;
}

function handleResetStats(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  for (const player of [attackerPlayer, defenderPlayer] as const) {
    const pokemon = getActivePokemon(state[player]);
    if (!pokemon.isFainted) {
      state = updatePokemon(state, player, state[player].activePokemonIndex, {
        ...pokemon,
        statStages: initStatStages(),
      });
    }
  }
  log.push({ turn: state.turn, message: `All stat changes were eliminated!`, kind: "status" });
  return state;
}

function handleForceSwitch(
  state: BattleState,
  defenderPlayer: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const defenderTeam = state[defenderPlayer];
  const defender = getActivePokemon(defenderTeam);

  const validTargets = defenderTeam.pokemon
    .map((p, i) => ({ pokemon: p, index: i }))
    .filter((entry) => entry.index !== defenderTeam.activePokemonIndex && !entry.pokemon.isFainted);

  if (validTargets.length === 0) {
    log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    return state;
  }

  const target = validTargets[Math.floor(battleRandom() * validTargets.length)];
  const newPokemon = [...defenderTeam.pokemon];

  newPokemon[defenderTeam.activePokemonIndex] = {
    ...defender,
    isActive: false,
    statStages: initStatStages(),
    confusionTurns: 0,
    toxicCounter: 0,
    focusEnergy: false,
    substituteHp: 0,
    chargingMove: null,
    semiInvulnerable: null,
    yawnTurns: 0,
    isSeeded: false,
    seededBy: null,
    bindingTurns: 0,
    bindingMove: null,
    boundBy: null,
    taunted: 0,
    encored: 0,
    encoredMove: null,
    disabledMove: null,
    disabledTurns: 0,
    tormented: false,
    aquaRing: false,
    ingrain: false,
    cursed: false,
    healBlocked: 0,
    embargoed: 0,
    perishCount: 0,
    consecutiveProtects: 0,
    isProtected: false,
    isFlinched: false,
    lockInMove: null,
    lockInTurns: 0,
  };
  newPokemon[target.index] = {
    ...newPokemon[target.index],
    isActive: true,
    turnsOnField: 0,
  };

  log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was blown away!`, kind: "switch" });
  log.push({ turn: state.turn, message: `${newPokemon[target.index].slot.pokemon.name} was dragged out!`, kind: "switch" });

  state = {
    ...state,
    [defenderPlayer]: { ...defenderTeam, pokemon: newPokemon, activePokemonIndex: target.index },
  };

  return state;
}

function handleHealTeamStatus(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  moveName: string,
  log: BattleLogEntry[]
): BattleState {
  const team = state[attackerPlayer];
  let healed = false;
  const newPokemon = team.pokemon.map((p) => {
    if (p.status) {
      healed = true;
      return { ...p, status: null as StatusCondition };
    }
    return p;
  });

  if (healed) {
    state = { ...state, [attackerPlayer]: { ...team, pokemon: newPokemon } };
    const moveLabel = moveName === "aromatherapy" ? "A soothing aroma" : "A bell chimed";
    log.push({ turn: state.turn, message: `${moveLabel} and cured the team's status problems!`, kind: "heal" });
  } else {
    log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
  }

  return state;
}

function handleTrickRoom(
  state: BattleState,
  log: BattleLogEntry[]
): BattleState {
  if (state.field.trickRoom > 0) {
    log.push({ turn: state.turn, message: `The twisted dimensions returned to normal!`, kind: "status" });
    return { ...state, field: { ...state.field, trickRoom: 0 } };
  }
  log.push({ turn: state.turn, message: `The dimensions were twisted!`, kind: "status" });
  return { ...state, field: { ...state.field, trickRoom: 5 } };
}

function handleTailwind(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const sideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
  const side = state.field[sideKey];

  if (side.tailwind > 0) {
    log.push({ turn: state.turn, message: `Tailwind is already blowing!`, kind: "info" });
    return state;
  }

  const updatedSide = { ...side, tailwind: 4 };
  log.push({ turn: state.turn, message: `The Tailwind blew from behind the team!`, kind: "status" });
  return { ...state, field: { ...state.field, [sideKey]: updatedSide } };
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
  if (effect.yawn) return handleYawn(state, defenderPlayer, log);
  if (effect.wish) return handleWish(state, attackerPlayer, moveName, log);
  if (effect.substitute) return handleSubstitute(state, attackerPlayer, moveName, log);
  if (effect.resetStats) return handleResetStats(state, attackerPlayer, defenderPlayer, log);
  if (effect.forceSwitch) return handleForceSwitch(state, defenderPlayer, log);
  if (effect.healTeamStatus) return handleHealTeamStatus(state, attackerPlayer, moveName, log);
  if (effect.fieldEffect === "trickRoom") return handleTrickRoom(state, log);
  if (effect.sideEffect === "tailwind") return handleTailwind(state, attackerPlayer, log);

  // Self-targeting effects always work (even if the user has a substitute)
  if (effect.selfStatChanges) {
    state = handleSelfStatChanges(state, attackerPlayer, effect, moveName, log);
  }
  if (effect.focusEnergy) {
    state = handleFocusEnergy(state, attackerPlayer, log);
  }

  // Check if opponent's substitute blocks the move
  const defender = getActivePokemon(state[defenderPlayer]);
  const targetsOpponent = !!(effect.targetStatChanges || effect.targetConfusion || effect.targetStatus);
  if (targetsOpponent && defender.substituteHp > 0) {
    log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} is protected by its substitute!`, kind: "info" });
  } else {
    if (effect.targetStatChanges) {
      state = handleTargetStatChanges(state, defenderPlayer, effect, log);
    }
    if (effect.targetConfusion) {
      state = handleConfusion(state, defenderPlayer, log);
    }
    if (effect.targetStatus) {
      state = handleStatusInfliction(state, defenderPlayer, effect.targetStatus, log);
    }
  }
  if (effect.hazard) return handleHazard(state, attackerPlayer, defenderPlayer, effect.hazard, moveName, log);
  if (effect.clearHazards) return handleHazardRemoval(state, attackerPlayer, defenderPlayer, effect.clearHazards, moveName, log);
  if (effect.reflect || effect.lightScreen) return handleScreen(state, attackerPlayer, effect, moveName, log);
  if (effect.healPercent) {
    state = handleHeal(state, attackerPlayer, effect.healPercent, effect.targetStatus, moveName, log);
  }

  // --- Volatile status handlers ---

  // Leech Seed
  if (effect.leechSeed) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    const defenderTypes = getEffectiveTypes(defenderNow);
    if (defenderTypes.includes("grass")) {
      log.push({ turn: state.turn, message: `It doesn't affect ${defenderNow.slot.pokemon.name}...`, kind: "info" });
    } else if (defenderNow.isSeeded) {
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} is already seeded!`, kind: "info" });
    } else {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defenderNow,
        isSeeded: true,
        seededBy: attackerPlayer,
      });
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} was seeded!`, kind: "status" });
    }
  }

  // Binding moves (Wrap, Fire Spin, Whirlpool, etc.)
  if (effect.binding) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    if (defenderNow.bindingTurns > 0) {
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} is already trapped!`, kind: "info" });
    } else {
      const attackerNow = getActivePokemon(state[attackerPlayer]);
      const turns = attackerNow.slot.heldItem === "grip-claw" ? 7 : 4 + Math.floor(battleRandom() * 2);
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defenderNow,
        bindingTurns: turns,
        bindingMove: moveName,
        boundBy: attackerPlayer,
      });
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} was trapped by ${moveName}!`, kind: "status" });
    }
  }

  // Taunt
  if (effect.taunt) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    if (defenderNow.taunted > 0) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defenderNow,
        taunted: effect.taunt,
      });
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} fell for the taunt!`, kind: "status" });
    }
  }

  // Encore
  if (effect.encore) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    if (!defenderNow.lastMoveUsed) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else if (defenderNow.encored > 0) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defenderNow,
        encored: effect.encore,
        encoredMove: defenderNow.lastMoveUsed,
      });
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} received an encore!`, kind: "status" });
    }
  }

  // Disable
  if (effect.disable) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    if (!defenderNow.lastMoveUsed) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else if (defenderNow.disabledMove) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defenderNow,
        disabledMove: defenderNow.lastMoveUsed,
        disabledTurns: 4,
      });
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name}'s ${defenderNow.lastMoveUsed} was disabled!`, kind: "status" });
    }
  }

  // Torment
  if (effect.torment) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
      ...defenderNow,
      tormented: true,
    });
    log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} was subjected to torment!`, kind: "status" });
  }

  // Aqua Ring (self-buff)
  if (effect.aquaRing) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...attackerNow,
      aquaRing: true,
    });
    log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name} surrounded itself with a veil of water!`, kind: "status" });
  }

  // Ingrain (self-buff)
  if (effect.ingrain) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...attackerNow,
      ingrain: true,
    });
    log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name} planted its roots!`, kind: "status" });
  }

  // Aurora Veil (requires hail)
  if (effect.auroraVeil) {
    const ownSideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
    const ownSide = state.field[ownSideKey];
    if (state.field.weather !== "hail") {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else if (ownSide.auroraVeil > 0) {
      log.push({ turn: state.turn, message: `Aurora Veil is already active!`, kind: "info" });
    } else {
      const updatedSide = { ...ownSide, auroraVeil: effect.auroraVeil };
      state = { ...state, field: { ...state.field, [ownSideKey]: updatedSide } };
      const label = attackerPlayer === "player1" ? "Player 1" : "Player 2";
      log.push({ turn: state.turn, message: `Aurora Veil protected ${label}'s team!`, kind: "status" });
    }
  }

  // Future Sight / Doom Desire (delayed attack on defender's side)
  if (effect.futureAttack) {
    const targetSideKey = defenderPlayer === "player1" ? "player1Side" : "player2Side";
    const targetSide = state.field[targetSideKey];
    if (targetSide.futureAttackTurn > 0) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else {
      const attackerNow = getActivePokemon(state[attackerPlayer]);
      // Fixed 120 base power, scaled by attacker's Sp. Atk stat
      const baseStats = attackerNow.slot.pokemon.stats;
      const spAtk = baseStats?.find((s: { stat: { name: string } }) => s.stat.name === "special-attack")?.base_stat ?? 100;
      const damage = Math.max(1, Math.floor((120 * spAtk) / 100));
      const updatedSide = {
        ...targetSide,
        futureAttackTurn: state.turn + 2,
        futureAttackDamage: damage,
        futureAttackMove: effect.futureAttack,
      };
      state = { ...state, field: { ...state.field, [targetSideKey]: updatedSide } };
      log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name} foresaw an attack!`, kind: "status" });
    }
  }

  // Perish Song (affects both active Pokemon)
  if (effect.perishSong) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    if (attackerNow.perishCount <= 0) {
      state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
        ...getActivePokemon(state[attackerPlayer]),
        perishCount: 4,
      });
    }
    if (defenderNow.perishCount <= 0) {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...getActivePokemon(state[defenderPlayer]),
        perishCount: 4,
      });
    }
    log.push({ turn: state.turn, message: `All Pokemon hearing the song will faint in three turns!`, kind: "status" });
  }

  // Curse (Ghost variant vs non-Ghost variant)
  if (effect.curse) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    const attackerTypes = getEffectiveTypes(attackerNow);
    if (attackerTypes.includes("ghost")) {
      // Ghost Curse: sacrifice 50% HP, curse the defender
      const cost = Math.max(1, Math.floor(attackerNow.maxHp / 2));
      let updatedAttacker = { ...attackerNow, currentHp: Math.max(0, attackerNow.currentHp - cost) };
      if (updatedAttacker.currentHp <= 0) {
        updatedAttacker = { ...updatedAttacker, currentHp: 0, isFainted: true, isActive: false };
      }
      state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, updatedAttacker);

      const defenderNow = getActivePokemon(state[defenderPlayer]);
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
        ...defenderNow,
        cursed: true,
      });
      log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name} cut its own HP and laid a curse on ${defenderNow.slot.pokemon.name}!`, kind: "status" });
      if (updatedAttacker.isFainted) {
        log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name} fainted!`, kind: "faint" });
      }
    } else {
      // Non-Ghost Curse: +1 Atk, +1 Def, -1 Spe on self
      const stages = { ...attackerNow.statStages };
      const oldAtk = stages.attack;
      const oldDef = stages.defense;
      const oldSpd = stages.speed;
      stages.attack = Math.min(STAT_STAGE_MAX, stages.attack + 1);
      stages.defense = Math.min(STAT_STAGE_MAX, stages.defense + 1);
      stages.speed = Math.max(STAT_STAGE_MIN, stages.speed - 1);
      state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
        ...attackerNow,
        statStages: stages,
      });
      if (stages.attack !== oldAtk) {
        log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name}'s ${getStatLabel("attack")} ${getStatChangeText(1)}!`, kind: "status" });
      }
      if (stages.defense !== oldDef) {
        log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name}'s ${getStatLabel("defense")} ${getStatChangeText(1)}!`, kind: "status" });
      }
      if (stages.speed !== oldSpd) {
        log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name}'s ${getStatLabel("speed")} ${getStatChangeText(-1)}!`, kind: "status" });
      }
    }
  }

  // Baton Pass: switch out while passing stat stages and volatile statuses
  if (effect.batonPass) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    const validTargets = state[attackerPlayer].pokemon
      .filter((p, i) => i !== state[attackerPlayer].activePokemonIndex && !p.isFainted);
    if (validTargets.length === 0) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else {
      // pendingBatonPass tells the FORCE_SWITCH reducer case (battleReducer.ts)
      // to transfer statStages/focusEnergy/substituteHp/aquaRing/ingrain to the
      // replacement instead of clearing them like a normal switch — the
      // outgoing Pokemon's values are still live here and don't change before
      // that switch resolves, so nothing needs to be captured/stored yet.
      state = { ...state, pendingPivotSwitch: attackerPlayer, pendingBatonPass: true };
      log.push({ turn: state.turn, message: `${attackerNow.slot.pokemon.name} passed the baton!`, kind: "status" });
    }
  }

  // Pain Split: average both Pokemon's HP
  if (effect.painSplit) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    const avgHp = Math.floor((attackerNow.currentHp + defenderNow.currentHp) / 2);
    const newAtkHp = Math.min(attackerNow.maxHp, avgHp);
    const newDefHp = Math.min(defenderNow.maxHp, avgHp);
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, { ...attackerNow, currentHp: newAtkHp });
    state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...getActivePokemon(state[defenderPlayer]), currentHp: newDefHp });
    log.push({ turn: state.turn, message: "The battlers shared their pain!", kind: "status" });
  }

  // Endeavor: set defender's HP equal to attacker's HP (fails if attacker HP >= defender HP)
  if (effect.endeavor) {
    const attackerNow = getActivePokemon(state[attackerPlayer]);
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    if (attackerNow.currentHp >= defenderNow.currentHp) {
      log.push({ turn: state.turn, message: `But it failed!`, kind: "info" });
    } else {
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...defenderNow, currentHp: attackerNow.currentHp });
      log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name}'s HP was cut to match ${attackerNow.slot.pokemon.name}'s!`, kind: "damage" });
    }
  }

  // Heal Block
  if (effect.healBlock) {
    const defenderNow = getActivePokemon(state[defenderPlayer]);
    state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, {
      ...defenderNow,
      healBlocked: effect.healBlock,
    });
    log.push({ turn: state.turn, message: `${defenderNow.slot.pokemon.name} was prevented from healing!`, kind: "status" });
  }

  // Reset protect counter and track last move for non-protect status moves
  const attackerAfter = getActivePokemon(state[attackerPlayer]);
  if (!attackerAfter.isFainted) {
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...attackerAfter,
      lastMoveUsed: moveName,
      lastMoveTurn: state.turn,
      consecutiveProtects: 0,
    });
  }

  return state;
}
