import {
  BattleState,
  BattleLogEntry,
  StatusCondition,
} from "@/types";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import {
  getActivePokemon,
  updatePokemon,
} from "./battleHelpers";
import { executeDamagingMove } from "./battleExecutionDamage";
import { applyStatusMoveEffect } from "./battleExecutionStatus";

export function executeMove(
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

  // Flinch check
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

  // Assault Vest: blocks status moves
  if (attacker.slot.heldItem === "assault-vest") {
    const statusEffect = STATUS_MOVE_EFFECTS[moveName];
    if (statusEffect && !statusEffect.clearHazards) {
      log.push({ turn: state.turn, message: `The Assault Vest prevents the use of status moves!`, kind: "info" });
      return state;
    }
  }

  // Check if it's a status move with known effects
  const statusEffect = STATUS_MOVE_EFFECTS[moveName];
  if (statusEffect) {
    return applyStatusMoveEffect(state, attackerPlayer, defenderPlayer, statusEffect, moveName, log);
  }

  return executeDamagingMove(state, attackerPlayer, defenderPlayer, moveName, moveIndex, log);
}
