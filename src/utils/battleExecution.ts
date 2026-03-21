import {
  BattleState,
  BattleLogEntry,
  StatusCondition,
} from "@/types";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { CONFUSION_SELF_HIT_CHANCE, CONFUSION_SELF_HIT_POWER } from "@/data/constants";
import {
  getActivePokemon,
  updatePokemon,
  getStatStageMultiplier,
  getCachedMoves,
} from "./battleHelpers";
import { extractBaseStats } from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
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
  let attacker = getActivePokemon(attackerTeam);
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
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
      attacker = newAttacker;
    } else {
      const newAttacker = { ...attacker, sleepTurns: attacker.sleepTurns - 1 };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is fast asleep!`, kind: "status" });
      return updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
    }
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

  // Confusion check
  if (attacker.confusionTurns > 0) {
    const remaining = attacker.confusionTurns - 1;
    if (remaining <= 0) {
      const newAttacker = { ...attacker, confusionTurns: 0 };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} snapped out of confusion!`, kind: "status" });
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
      attacker = newAttacker;
    } else {
      const newAttacker = { ...attacker, confusionTurns: remaining };
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} is confused!`, kind: "status" });
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, newAttacker);
      attacker = newAttacker;

      // 1/3 chance to hit itself
      if (Math.random() < CONFUSION_SELF_HIT_CHANCE) {
        log.push({ turn: state.turn, message: `It hurt itself in its confusion!`, kind: "status" });

        // Typeless 40 BP physical self-hit: ((2*50/5+2) * 40 * Atk/Def) / 50 + 2
        const baseStats = extractBaseStats(attacker.slot.pokemon);
        const calc = calculateAllStats(
          baseStats,
          attacker.slot.ivs ?? DEFAULT_IVS,
          attacker.slot.evs ?? DEFAULT_EVS,
          attacker.slot.nature ?? null
        );
        const atk = Math.floor(calc.attack * getStatStageMultiplier(attacker.statStages.attack));
        const def = Math.floor(calc.defense * getStatStageMultiplier(attacker.statStages.defense));
        const baseDamage = Math.floor(((22 * CONFUSION_SELF_HIT_POWER * atk) / def) / 50 + 2);
        const damage = Math.max(1, baseDamage);
        const newHp = Math.max(0, attacker.currentHp - damage);
        let selfHitAttacker = { ...attacker, currentHp: newHp };
        if (newHp <= 0) {
          selfHitAttacker = { ...selfHitAttacker, currentHp: 0, isFainted: true, isActive: false };
          log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} fainted!`, kind: "faint" });
        }
        return updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, selfHitAttacker);
      }
    }
  }

  // TODO: Outrage/Thrash/Petal Dance cause confusion after 2-3 turns of locked use

  const moves = attacker.slot.selectedMoves ?? [];

  // Check if all moves are out of PP — force Struggle
  const allPPDepleted = attacker.movePP?.length > 0 && attacker.movePP.every((pp) => pp <= 0);
  if (allPPDepleted) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} has no moves left!`, kind: "info" });
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used struggle!`, kind: "info" });
    return executeDamagingMove(state, attackerPlayer, defenderPlayer, "struggle", moveIndex, log);
  }

  const moveName = moves[moveIndex];
  if (!moveName) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} has no move to use!`, kind: "info" });
    return state;
  }

  // Check if the specific move has PP remaining
  const currentPP = attacker.movePP?.[moveIndex] ?? 1;
  if (currentPP <= 0) {
    log.push({ turn: state.turn, message: `${moveName.replace(/-/g, " ")} has no PP left!`, kind: "info" });
    return state;
  }

  log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used ${moveName.replace(/-/g, " ")}!`, kind: "info" });

  // Decrement PP for the used move
  const currentAttackerForPP = getActivePokemon(state[attackerPlayer]);
  if (currentAttackerForPP.movePP && moveIndex < currentAttackerForPP.movePP.length) {
    const newPP = [...currentAttackerForPP.movePP];
    newPP[moveIndex] = Math.max(0, newPP[moveIndex] - 1);
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...getActivePokemon(state[attackerPlayer]),
      movePP: newPP,
    });
  }

  // Assault Vest: blocks status moves
  if (attacker.slot.heldItem === "assault-vest") {
    const statusEffect = STATUS_MOVE_EFFECTS[moveName];
    const cached = getCachedMoves().get(moveName);
    const isCachedStatus = cached?.damage_class?.name === "status";
    if ((statusEffect && !statusEffect.clearHazards) || isCachedStatus) {
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
