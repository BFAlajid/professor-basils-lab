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
  getEffectiveTypes,
} from "./battleHelpers";
import { extractBaseStats } from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { executeDamagingMove } from "./battleExecutionDamage";
import { applyStatusMoveEffect } from "./battleExecutionStatus";
import { normalizeAbilityKey } from "./format";
import { battleRandom } from "./battleRng";

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
  if (attacker.status === "paralyze" && battleRandom() < 0.25) {
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
    if (battleRandom() < 0.2) {
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
      if (battleRandom() < CONFUSION_SELF_HIT_CHANCE) {
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

  const moves = attacker.slot.selectedMoves ?? [];

  // Check if all moves are out of PP — force Struggle
  const allPPDepleted = attacker.movePP?.length > 0 && attacker.movePP.every((pp) => pp <= 0);
  if (allPPDepleted) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} has no moves left!`, kind: "info" });
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used struggle!`, kind: "info" });
    return executeDamagingMove(state, attackerPlayer, defenderPlayer, "struggle", moveIndex, log);
  }

  // Encore enforcement: force the encored move regardless of selection
  let effectiveMoveIndex = moveIndex;
  if (attacker.encored > 0 && attacker.encoredMove) {
    const encoredIdx = moves.indexOf(attacker.encoredMove);
    if (encoredIdx >= 0) {
      effectiveMoveIndex = encoredIdx;
    }

    // If encored move has 0 PP, end Encore
    if (attacker.movePP[effectiveMoveIndex] <= 0) {
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, {
        ...attacker, encored: 0, encoredMove: null,
      });
      attacker = getActivePokemon(state[attackerPlayer]);
      effectiveMoveIndex = moveIndex;
    }
  }

  // Lock-in move enforcement (Outrage, Thrash, Petal Dance)
  if (attacker.lockInTurns > 0 && attacker.lockInMove) {
    const lockIdx = moves.indexOf(attacker.lockInMove);
    if (lockIdx >= 0) effectiveMoveIndex = lockIdx;
  }

  // Choice item lock enforcement: redirect to the locked move if the selection
  // differs and the locked move still has PP (UI already prevents this, but AI/
  // online opponents bypass the UI and call the reducer directly).
  if (attacker.choiceLockedMove && moves[effectiveMoveIndex] !== attacker.choiceLockedMove) {
    const lockedIdx = moves.indexOf(attacker.choiceLockedMove);
    const lockedPP = lockedIdx >= 0 ? (attacker.movePP?.[lockedIdx] ?? 0) : 0;
    if (lockedIdx >= 0 && lockedPP > 0) {
      effectiveMoveIndex = lockedIdx;
    }
  }

  const moveName = moves[effectiveMoveIndex];
  if (!moveName) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} has no move to use!`, kind: "info" });
    return state;
  }

  // Disable enforcement: the disabled move cannot be selected
  if (attacker.disabledMove === moveName && attacker.disabledTurns > 0) {
    log.push({ turn: state.turn, message: `${moveName.replace(/-/g, " ")} is disabled!`, kind: "info" });
    return state;
  }

  // Torment enforcement: cannot use the same move twice in a row
  if (attacker.tormented && attacker.lastMoveUsed === moveName) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} can't use the same move in a row due to Torment!`, kind: "info" });
    return state;
  }

  // Taunt enforcement: status moves fail while taunted
  if (attacker.taunted > 0) {
    const cached = getCachedMoves().get(moveName);
    const isStatus = cached?.damage_class?.name === "status" || (STATUS_MOVE_EFFECTS[moveName] && !cached);
    if (isStatus) {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} can't use ${moveName.replace(/-/g, " ")} after the taunt!`, kind: "info" });
      return state;
    }
  }

  // Check if the specific move has PP remaining
  const currentPP = attacker.movePP?.[effectiveMoveIndex] ?? 1;
  if (currentPP <= 0) {
    log.push({ turn: state.turn, message: `${moveName.replace(/-/g, " ")} has no PP left!`, kind: "info" });
    return state;
  }

  log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used ${moveName.replace(/-/g, " ")}!`, kind: "info" });

  // Assault Vest: blocks status moves (check before PP deduction)
  if (attacker.slot.heldItem === "assault-vest") {
    const statusEffect = STATUS_MOVE_EFFECTS[moveName];
    const cached = getCachedMoves().get(moveName);
    const isCachedStatus = cached?.damage_class?.name === "status";
    if ((statusEffect && !statusEffect.clearHazards) || isCachedStatus) {
      log.push({ turn: state.turn, message: `The Assault Vest prevents the use of status moves!`, kind: "info" });
      return state;
    }
  }

  // Decrement PP for the used move
  const currentAttackerForPP = getActivePokemon(state[attackerPlayer]);
  if (currentAttackerForPP.movePP && effectiveMoveIndex < currentAttackerForPP.movePP.length) {
    const newPP = [...currentAttackerForPP.movePP];
    newPP[effectiveMoveIndex] = Math.max(0, newPP[effectiveMoveIndex] - 1);
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...getActivePokemon(state[attackerPlayer]),
      movePP: newPP,
    });
  }

  // Stamp "a move was attempted this turn" here — before hit/miss, Protect,
  // semi-invulnerability, or type-immunity are resolved — so applyMoveLocks's
  // `lastMoveTurn !== state.turn` gate (battleReducer.ts) can't tell a missed/
  // blocked/immune move apart from one that landed. Real-game semantics: a
  // Choice item locks onto the move as soon as it's selected and used, hit or
  // not, and Outrage/Thrash/Petal Dance's turn counter keeps ticking on a miss
  // too — the lock only pauses when the user is fully prevented from acting
  // (paralysis/sleep/freeze/flinch/confusion self-hit/Taunt/Disable/Torment/0
  // PP), all of which bail out above this line without decrementing PP. The
  // damage/status trailers further down re-stamp the same two fields on a hit
  // (with the fully-resolved move name for Struggle), so this is a harmless
  // no-op there — it only changes behavior for the miss/block/immune cases
  // that previously fell through unstamped.
  state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
    ...getActivePokemon(state[attackerPlayer]),
    lastMoveUsed: moveName,
    lastMoveTurn: state.turn,
  });

  // Check if it's a status move with known effects
  const statusEffect = STATUS_MOVE_EFFECTS[moveName];
  if (statusEffect) {
    // Prankster Dark-type immunity: Prankster-boosted status moves fail against Dark types
    const attackerAbility = normalizeAbilityKey(attacker.slot.ability);
    if (attackerAbility === "prankster") {
      const defenderTypes = getEffectiveTypes(defender);
      const targetsOpponent = !!(statusEffect.targetStatChanges || statusEffect.targetConfusion || statusEffect.targetStatus || statusEffect.forceSwitch);
      if (targetsOpponent && defenderTypes.includes("dark")) {
        log.push({ turn: state.turn, message: `It doesn't affect ${defender.slot.pokemon.name}...`, kind: "info" });
        return state;
      }
    }
    return applyStatusMoveEffect(state, attackerPlayer, defenderPlayer, statusEffect, moveName, log);
  }

  return executeDamagingMove(state, attackerPlayer, defenderPlayer, moveName, effectiveMoveIndex, log);
}
