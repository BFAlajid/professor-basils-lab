import {
  BattleState,
  BattleLogEntry,
  StatusCondition,
  StatStages,
} from "@/types";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { getAbilityHooks } from "@/data/abilities";
import { getStatLabel } from "./format";
import {
  getActivePokemon,
  updatePokemon,
  getStatusText,
  initSideConditions,
  triggerOnStatDrop,
} from "./battleHelpers";

export function applyStatusMoveEffect(
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
    let hadDrop = false;

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
        if (change < 0) hadDrop = true;
      }
    }

    state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, { ...defender, statStages: newStages });
    messages.forEach((m) => log.push({ turn: state.turn, message: m, kind: "status" }));

    if (hadDrop) {
      state = triggerOnStatDrop(state, defenderPlayer, "any", -1, log);
    }
  }

  // Status condition
  if (effect.targetStatus) {
    const defender = getActivePokemon(state[defenderPlayer]);
    if (defender.status) {
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} is already affected by a status condition!`, kind: "info" });
    } else {
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

  // Entry hazards
  if (effect.hazard) {
    const targetSideKey = defenderPlayer === "player1" ? "player1Side" : "player2Side";
    const targetSide = { ...state.field[targetSideKey] };
    const attacker = getActivePokemon(state[attackerPlayer]);
    let set = false;

    if (effect.hazard === "stealth-rock") {
      if (targetSide.stealthRock) {
        log.push({ turn: state.turn, message: `Stealth Rock is already set!`, kind: "info" });
      } else {
        targetSide.stealthRock = true;
        set = true;
        log.push({ turn: state.turn, message: `Pointed stones float in the air around the opposing team!`, kind: "hazard" });
      }
    } else if (effect.hazard === "spikes") {
      if (targetSide.spikesLayers >= 3) {
        log.push({ turn: state.turn, message: `Spikes are already at maximum layers!`, kind: "info" });
      } else {
        targetSide.spikesLayers++;
        set = true;
        log.push({ turn: state.turn, message: `Spikes were scattered on the ground around the opposing team!`, kind: "hazard" });
      }
    } else if (effect.hazard === "toxic-spikes") {
      if (targetSide.toxicSpikesLayers >= 2) {
        log.push({ turn: state.turn, message: `Toxic Spikes are already at maximum layers!`, kind: "info" });
      } else {
        targetSide.toxicSpikesLayers++;
        set = true;
        log.push({ turn: state.turn, message: `Toxic Spikes were scattered on the ground around the opposing team!`, kind: "hazard" });
      }
    } else if (effect.hazard === "sticky-web") {
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

  // Hazard removal
  if (effect.clearHazards) {
    const attacker = getActivePokemon(state[attackerPlayer]);

    if (effect.clearHazards === "rapid-spin") {
      const ownSideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
      const ownSide = state.field[ownSideKey];
      const hadHazards = ownSide.stealthRock || ownSide.spikesLayers > 0 || ownSide.toxicSpikesLayers > 0 || ownSide.stickyWeb;

      if (hadHazards) {
        state = { ...state, field: { ...state.field, [ownSideKey]: initSideConditions() } };
        log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} blew away the hazards!`, kind: "hazard" });
      }

      const currentAttacker = getActivePokemon(state[attackerPlayer]);
      const oldSpd = currentAttacker.statStages.speed;
      const newSpd = Math.min(6, oldSpd + 1);
      if (newSpd !== oldSpd) {
        state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
          ...currentAttacker,
          statStages: { ...currentAttacker.statStages, speed: newSpd },
          lastMoveUsed: moveName,
          consecutiveProtects: 0,
        });
        log.push({ turn: state.turn, message: `${currentAttacker.slot.pokemon.name}'s Speed rose!`, kind: "status" });
      }
    } else if (effect.clearHazards === "defog") {
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
      const newEva = Math.max(-6, oldEva - 1);
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

  // Reflect / Light Screen
  if (effect.reflect || effect.lightScreen) {
    const ownSideKey = attackerPlayer === "player1" ? "player1Side" : "player2Side";
    const ownSide = { ...state.field[ownSideKey] };
    const attacker = getActivePokemon(state[attackerPlayer]);

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

  // Healing
  if (effect.healPercent) {
    const attacker = getActivePokemon(state[attackerPlayer]);
    const healAmount = Math.floor(attacker.maxHp * effect.healPercent / 100);
    const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
    let newAttacker = { ...attacker, currentHp: newHp };

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
