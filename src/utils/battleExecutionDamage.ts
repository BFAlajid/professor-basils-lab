import { normalizeAbilityKey } from "./format";
import {
  BattleState,
  BattlePokemon,
  BattleLogEntry,
  StatusCondition,
  StatStages,
  TypeName,
} from "@/types";
import { calculateDamage } from "./damage";
import { STAT_STAGE_MAX, STAT_STAGE_MIN, SLEEP_TURN_MIN, SLEEP_TURN_RANGE, SELF_STAT_DROP_MOVES, CONTACT_MOVES } from "@/data/constants";
import { convertToMaxMove, getMaxMoveEffect } from "@/data/maxMoves";
import { getAbilityHooks, getHighestStat, hasAbility } from "@/data/abilities";
import { getDefensiveMultiplier } from "@/data/typeChart";
import {
  getActivePokemon,
  updatePokemon,
  getBattleMove,
  getEffectiveTypes,
  getOriginalTypes,
  getStatusText,
  getStatStageMultiplier,
  getRelevantAtkStage,
  getRelevantDefStage,
  applyFieldEffect,
  getCritRate,
} from "./battleHelpers";

const DAMAGE_ROLL_MIN = 0.85;
const DAMAGE_ROLL_RANGE = 0.15;
const MULTI_HIT_2 = 0.35;
const MULTI_HIT_3 = 0.70;
const MULTI_HIT_4 = 0.85;

// Contact moves — re-use canonical set from constants (avoid duplication)

type MoveData = ReturnType<typeof getBattleMove>;

// Two-turn move definitions
const TWO_TURN_MOVES: Record<string, {
  semiInvulnerable?: "fly" | "dig" | "dive";
  chargeMessage: string;
  defBoost?: boolean;
}> = {
  "fly": { semiInvulnerable: "fly", chargeMessage: "{name} flew up high!" },
  "dig": { semiInvulnerable: "dig", chargeMessage: "{name} dug underground!" },
  "dive": { semiInvulnerable: "dive", chargeMessage: "{name} dove underwater!" },
  "bounce": { semiInvulnerable: "fly", chargeMessage: "{name} sprang up!" },
  "phantom-force": { semiInvulnerable: "dive", chargeMessage: "{name} vanished!" },
  "shadow-force": { semiInvulnerable: "dive", chargeMessage: "{name} vanished!" },
  "solar-beam": { chargeMessage: "{name} is absorbing light!" },
  "skull-bash": { chargeMessage: "{name} lowered its head!", defBoost: true },
  "sky-attack": { chargeMessage: "{name} is glowing!" },
};

// Moves that can hit semi-invulnerable targets
const SEMI_INVULNERABLE_EXCEPTIONS: Record<string, string[]> = {
  "fly": ["thunder", "hurricane", "twister", "sky-uppercut"],
  "dig": ["earthquake", "magnitude"],
  "dive": ["surf", "whirlpool"],
};

function resolveAccuracy(
  state: BattleState,
  attacker: BattlePokemon,
  defender: BattlePokemon,
  moveData: MoveData,
  originalMoveName: string,
  isDynamaxMove: boolean,
  log: BattleLogEntry[]
): boolean {
  if (isDynamaxMove) return true;

  // Semi-invulnerable targets dodge most moves
  if (defender.semiInvulnerable) {
    const exceptions = SEMI_INVULNERABLE_EXCEPTIONS[defender.semiInvulnerable] ?? [];
    if (!exceptions.includes(originalMoveName)) {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s attack missed!`, kind: "miss" });
      return false;
    }
  }

  let accuracy = moveData.accuracy ?? 100;

  const weatherAccuracyMoves = ["thunder", "hurricane"];
  if (weatherAccuracyMoves.includes(originalMoveName) && state.field.weather) {
    if (state.field.weather === "rain") accuracy = 100;
    else if (state.field.weather === "sun") accuracy = 50;
  }

  const accMod = getStatStageMultiplier(attacker.statStages.accuracy) /
                 getStatStageMultiplier(defender.statStages.evasion);
  if (Math.random() * 100 >= accuracy * accMod) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s attack missed!`, kind: "miss" });
    return false;
  }

  return true;
}

function resolveMultiHit(moveData: MoveData): number {
  const minHits = moveData.meta?.min_hits ?? null;
  const maxHits = moveData.meta?.max_hits ?? null;
  let hitCount = 1;
  if (minHits && maxHits && maxHits > 1) {
    if (minHits === maxHits) {
      hitCount = minHits;
    } else {
      const roll = Math.random();
      if (roll < MULTI_HIT_2) hitCount = 2;
      else if (roll < MULTI_HIT_3) hitCount = 3;
      else if (roll < MULTI_HIT_4) hitCount = 4;
      else hitCount = 5;
      hitCount = Math.min(hitCount, maxHits);
    }
  }
  return hitCount;
}

function applyDamageLoop(
  state: BattleState,
  attacker: BattlePokemon,
  defender: BattlePokemon,
  defenderPlayer: "player1" | "player2",
  defenderTeam: BattleState["player1"],
  result: { max: number; isCritical: boolean; effectiveness: number },
  hitCount: number,
  isCritical: boolean,
  moveData: MoveData,
  defenderAbility: ReturnType<typeof getAbilityHooks>,
  log: BattleLogEntry[],
  critRate: number,
): { state: BattleState; newDefender: BattlePokemon; totalDamage: number; hitSubstitute: boolean } {
  let totalDamage = 0;
  let newDefender = { ...defender };
  let firstHitSurvivalUsed = false;
  let hitSubstitute = false;

  for (let hit = 0; hit < hitCount; hit++) {
    if (newDefender.isFainted) break;

    const hitCritical = hitCount > 1 ? Math.random() < critRate : isCritical;
    const hitRandomFactor = DAMAGE_ROLL_MIN + Math.random() * DAMAGE_ROLL_RANGE;
    let hitDamage = Math.max(1, Math.floor(result.max * hitRandomFactor));

    // Ability: Sniper — boost crit damage from 1.5x to 2.25x
    if (hitCritical) {
      const attackerAbilityHooks = getAbilityHooks(attacker.slot.ability);
      if (attackerAbilityHooks?.modifyCritDamage) {
        // calculateDamage already applied 1.5x; scale to target multiplier
        hitDamage = Math.max(1, Math.floor(hitDamage * (attackerAbilityHooks.modifyCritDamage / 1.5)));
      }
    }

    // Ability: Multiscale halves damage at full HP (only applies on first hit, not behind substitute)
    if (hit === 0 && newDefender.substituteHp <= 0 && defenderAbility?.modifyIncomingDamage) {
      const multiscaleResult = defenderAbility.modifyIncomingDamage({
        defender: newDefender,
        attacker,
        moveType: moveData.type.name as TypeName,
        movePower: moveData.power ?? 0,
        isPhysical: moveData.damage_class.name === "physical",
      });
      if (multiscaleResult && multiscaleResult.multiplier > 0 && multiscaleResult.multiplier < 1) {
        hitDamage = Math.max(1, Math.floor(hitDamage * multiscaleResult.multiplier));
        if (multiscaleResult.message) {
          log.push({ turn: state.turn, message: multiscaleResult.message, kind: "status" });
        }
      }
    }

    // Substitute absorbs damage — excess does not carry through
    if (newDefender.substituteHp > 0) {
      hitSubstitute = true;
      const newSubHp = newDefender.substituteHp - hitDamage;
      if (newSubHp <= 0) {
        newDefender = { ...newDefender, substituteHp: 0 };
        log.push({ turn: state.turn, message: `${defender.slot.pokemon.name}'s substitute broke!`, kind: "status" });
      } else {
        newDefender = { ...newDefender, substituteHp: newSubHp };
      }
      totalDamage += hitDamage;
      continue;
    }

    const newHp = Math.max(0, newDefender.currentHp - hitDamage);
    newDefender = { ...newDefender, currentHp: newHp };

    // Ability: modifySurvival (Sturdy)
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

    // Focus Sash check
    if (newDefender.currentHp <= 0 && !firstHitSurvivalUsed && defender.currentHp === defender.maxHp && defender.slot.heldItem === "focus-sash") {
      newDefender = { ...newDefender, currentHp: 1, slot: { ...newDefender.slot, heldItem: null } };
      firstHitSurvivalUsed = true;
      log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} hung on using its Focus Sash!`, kind: "info" });
    }

    if (newDefender.currentHp <= 0) {
      newDefender = { ...newDefender, currentHp: 0, isFainted: true, isActive: false };
    }

    totalDamage += hitDamage;
  }

  // Log damage
  if (hitCount > 1) {
    log.push({
      turn: state.turn,
      message: `Hit ${hitCount} time(s) for ${totalDamage} total damage! (${Math.round((newDefender.currentHp / defender.maxHp) * 100)}% HP remaining)`,
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

  return { state, newDefender, totalDamage, hitSubstitute };
}

function applyRecoilDrain(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  attacker: BattlePokemon,
  originalName: string,
  totalDamage: number,
  log: BattleLogEntry[]
): BattleState {
  // Life Orb recoil — Sheer Force prevents Life Orb recoil (but keeps the damage boost)
  if (attacker.slot.heldItem === "life-orb" && totalDamage > 0 && !hasAbility(attacker, "sheer-force")) {
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

  // Recoil moves
  const RECOIL_MOVES: Record<string, number> = {
    "brave-bird": 1/3, "flare-blitz": 1/3, "double-edge": 1/3,
    "wild-charge": 1/4, "take-down": 1/4, "submission": 1/4,
    "head-smash": 1/2, "wood-hammer": 1/3,
    "volt-tackle": 1/3, "wave-crash": 1/3, "light-of-ruin": 1/2,
    "head-charge": 1/4, "struggle": 1/4,
  };
  const recoilFraction = RECOIL_MOVES[originalName];
  if (recoilFraction && totalDamage > 0) {
    const currentAttacker = getActivePokemon(state[attackerPlayer]);
    const atkAbility = getAbilityHooks(currentAttacker.slot.ability);
    if (!atkAbility?.preventIndirectDamage) {
      const recoilDmg = originalName === "struggle"
        ? Math.max(1, Math.floor(currentAttacker.maxHp / 4))
        : Math.max(1, Math.floor(totalDamage * recoilFraction));
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
    "oblivion-wing": 0.75, "bouncy-bubble": 0.5,
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

  return state;
}

function applySecondaryEffects(
  state: BattleState,
  attackerPlayer: "player1" | "player2",
  defenderPlayer: "player1" | "player2",
  attacker: BattlePokemon,
  defender: BattlePokemon,
  moveData: MoveData,
  moveIndex: number,
  originalName: string,
  isDynamaxMove: boolean,
  totalDamage: number,
  newDefender: BattlePokemon,
  log: BattleLogEntry[]
): BattleState {
  const attackerHasSheerForce = hasAbility(attacker, "sheer-force");

  // Sheer Force: skip ALL secondary effects (status, flinch, stat changes on target)
  // but still allow Max Move effects and pivot moves
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
        const newStage = Math.min(STAT_STAGE_MAX, oldStage + 1);
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
          const newStage = Math.max(STAT_STAGE_MIN, oldStage - 1);
          if (newStage !== oldStage) {
            const updatedStages = { ...target.statStages, [statKey]: newStage };
            state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...target, statStages: updatedStages });
            log.push({ turn: state.turn, message: `${target.slot.pokemon.name}'s ${maxEffect.stat} fell!`, kind: "status" });
          }
        }
      }
    }
  }

  // Serene Grace doubles secondary effect chances
  const attackerHasSereneGrace = hasAbility(attacker, "serene-grace");

  // Apply secondary status effects from damaging moves (Sheer Force skips these)
  if (!attackerHasSheerForce) {
    const moveInfo = getBattleMove(attacker, moveIndex);
    if (moveInfo.meta?.ailment?.name && moveInfo.meta.ailment.name !== "none" && !newDefender.isFainted) {
      let chance = moveInfo.meta.ailment_chance ?? 0;
      if (attackerHasSereneGrace && chance > 0) chance = Math.min(100, chance * 2);
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
          const defAbilitySecondary = getAbilityHooks(newDefender.slot.ability);
          const statusBlocked = defAbilitySecondary?.preventStatus && defAbilitySecondary.preventStatus({ pokemon: newDefender, status: newStatus });
          if (!statusBlocked) {
            newDefender = { ...newDefender, status: newStatus };
            if (newStatus === "sleep") {
              newDefender.sleepTurns = SLEEP_TURN_MIN + Math.floor(Math.random() * SLEEP_TURN_RANGE);
            }
            log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(newStatus)}!`, kind: "status" });
            state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, newDefender);
          }
        }
      }
    }

    // Fake Out flinch
    if (originalName === "fake-out" && !newDefender.isFainted) {
      const latestDefender = getActivePokemon(state[defenderPlayer]);
      state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...latestDefender, isFlinched: true });
    }

    // Flinch chance from damaging moves
    const FLINCH_MOVES: Record<string, number> = {
      "iron-head": 30, "rock-slide": 30, "air-slash": 30,
      "zen-headbutt": 20, "bite": 30, "dark-pulse": 20,
      "waterfall": 20, "headbutt": 30, "icicle-crash": 30,
      "stomp": 30, "snore": 30, "dragon-rush": 20,
      "astonish": 30, "extrasensory": 10, "heart-stamp": 30,
      "twister": 20, "needle-arm": 30, "sky-attack": 30,
    };
    let flinchChance = FLINCH_MOVES[originalName] ?? 0;
    if (attackerHasSereneGrace && flinchChance > 0) flinchChance = Math.min(100, flinchChance * 2);
    if (flinchChance && totalDamage > 0 && !newDefender.isFainted) {
      if (Math.random() * 100 < flinchChance) {
        const latestDefender = getActivePokemon(state[defenderPlayer]);
        if (!latestDefender.isFainted) {
          state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...latestDefender, isFlinched: true });
        }
      }
    }
  }

  // Self-stat drops (Close Combat, Superpower, Overheat, etc.) — always applied even with Sheer Force
  const selfDrops = SELF_STAT_DROP_MOVES[originalName];
  if (selfDrops && selfDrops.length > 0 && totalDamage > 0) {
    const currentAtk = getActivePokemon(state[attackerPlayer]);
    if (!currentAtk.isFainted) {
      let updatedStages = { ...currentAtk.statStages };
      const dropMessages: string[] = [];
      for (const drop of selfDrops) {
        const statKey = drop.stat as keyof StatStages;
        const oldStage = updatedStages[statKey] ?? 0;
        const newStage = Math.max(STAT_STAGE_MIN, oldStage + drop.stages);
        if (newStage !== oldStage) {
          updatedStages = { ...updatedStages, [statKey]: newStage };
          const statLabel = statKey === "spAtk" ? "Sp. Atk" : statKey === "spDef" ? "Sp. Def" : statKey.charAt(0).toUpperCase() + statKey.slice(1);
          const verb = drop.stages <= -2 ? "harshly fell" : "fell";
          dropMessages.push(`${currentAtk.slot.pokemon.name}'s ${statLabel} ${verb}!`);
        }
      }
      if (dropMessages.length > 0) {
        state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, { ...currentAtk, statStages: updatedStages });
        for (const msg of dropMessages) {
          log.push({ turn: state.turn, message: msg, kind: "status" });
        }
      }
    }
  }

  // Rocky Helmet contact recoil
  if (totalDamage > 0 && CONTACT_MOVES.has(originalName)) {
    const latestDef = getActivePokemon(state[defenderPlayer]);
    if (!latestDef.isFainted && latestDef.slot.heldItem === "rocky-helmet") {
      const currentAtk = getActivePokemon(state[attackerPlayer]);
      if (!currentAtk.isFainted) {
        const helmetDmg = Math.max(1, Math.floor(currentAtk.maxHp / 6));
        const newAtkHp = Math.max(0, currentAtk.currentHp - helmetDmg);
        let helmetAttacker = { ...currentAtk, currentHp: newAtkHp };
        log.push({ turn: state.turn, message: `${currentAtk.slot.pokemon.name} was hurt by Rocky Helmet!`, kind: "damage" });
        if (newAtkHp <= 0) {
          helmetAttacker = { ...helmetAttacker, currentHp: 0, isFainted: true, isActive: false };
          log.push({ turn: state.turn, message: `${currentAtk.slot.pokemon.name} fainted!`, kind: "faint" });
        }
        state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, helmetAttacker);
      }
    }
  }

  // U-turn / Volt Switch pivot
  const PIVOT_MOVES = ["u-turn", "volt-switch", "flip-turn"];
  if (PIVOT_MOVES.includes(originalName) && totalDamage > 0) {
    const currentAttacker = getActivePokemon(state[attackerPlayer]);
    if (!currentAttacker.isFainted) {
      const hasSwitch = state[attackerPlayer].pokemon.some((p, i) => i !== state[attackerPlayer].activePokemonIndex && !p.isFainted);
      if (hasSwitch) {
        state = { ...state, pendingPivotSwitch: attackerPlayer };
      }
    }
  }

  return state;
}

export function executeDamagingMove(
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
  if (originalName === "fake-out" && (attacker.turnsOnField ?? 0) > 1) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s Fake Out failed!`, kind: "info" });
    return state;
  }

  // Two-turn move charge/release handling
  const twoTurnData = TWO_TURN_MOVES[originalName];
  if (twoTurnData) {
    // Solar Beam skips charge in sun
    const skipCharge = originalName === "solar-beam" && state.field.weather === "sun";

    if (!skipCharge && !attacker.chargingMove) {
      // Start charging — set state and return without attacking
      let updatedAttacker: BattlePokemon = {
        ...attacker,
        chargingMove: originalName,
        semiInvulnerable: twoTurnData.semiInvulnerable ?? null,
      };

      // Skull Bash: +1 Def on charge turn
      if (twoTurnData.defBoost) {
        const oldDef = updatedAttacker.statStages.defense;
        const newDef = Math.min(STAT_STAGE_MAX, oldDef + 1);
        if (newDef !== oldDef) {
          updatedAttacker = {
            ...updatedAttacker,
            statStages: { ...updatedAttacker.statStages, defense: newDef },
          };
          log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s Defense rose!`, kind: "status" });
        }
      }

      const chargeMsg = twoTurnData.chargeMessage.replace("{name}", attacker.slot.pokemon.name);
      log.push({ turn: state.turn, message: chargeMsg, kind: "info" });
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, updatedAttacker);
      return state;
    }

    if (attacker.chargingMove === originalName) {
      // Release turn — clear charging state, then proceed with damage
      const updatedAttacker = { ...attacker, chargingMove: null as string | null, semiInvulnerable: null as "fly" | "dig" | "dive" | null };
      state = updatePokemon(state, attackerPlayer, attackerTeam.activePokemonIndex, updatedAttacker);
    }
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
    if (maxMoveData.name === "Max Guard") {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name} used Max Guard!`, kind: "info" });
      return state;
    }
    moveData = {
      ...moveData,
      name: maxMoveData.name,
      power: maxMoveData.power,
      accuracy: null,
      type: { name: maxMoveData.type.name as TypeName },
    };
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

  // Solar Beam power reduction during adverse weather (rain, sand, hail)
  // Note: charge turn is handled by TWO_TURN_MOVES above; this handles power in bad weather
  if (originalMoveName === "solar-beam" && state.field.weather && state.field.weather !== "sun") {
    moveData = { ...moveData, power: moveData.power ? Math.floor(moveData.power / 2) : moveData.power };
  }

  // Critical hit check (stage-based)
  const critRate = getCritRate(attacker, originalMoveName);
  const isCritical = Math.random() < critRate;

  const defSideKey = defenderPlayer === "player1" ? "player1Side" : "player2Side";
  const defSide = state.field[defSideKey];

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
      fieldTerrain: state.field.terrain,
      defenderSideReflect: defSide.reflect > 0,
      defenderSideLightScreen: defSide.lightScreen > 0,
      activeStatOverride: attacker.activeStatOverride,
      attackerAbility: attacker.slot.ability,
      defenderAbility: defender.slot.ability,
      attackerBattlePokemon: attacker,
    }
  );

  // Doubles spread damage modifier (0.75x)
  if (state.spreadDamageModifier) {
    result.max = Math.max(1, Math.floor(result.max * state.spreadDamageModifier));
  }

  // Accuracy check
  if (!resolveAccuracy(state, attacker, defender, moveData, originalMoveName, isDynamaxMove, log)) {
    return state;
  }

  // Psychic Terrain priority block
  if (state.field.terrain === "psychic" && moveData.priority > 0) {
    const defTypes = getEffectiveTypes(defender);
    const defIsFlying = defTypes.includes("flying");
    const defHasLevitate = normalizeAbilityKey(defender.slot.ability) === "levitate";
    if (!defIsFlying && !defHasLevitate) {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s move was blocked by Psychic Terrain!`, kind: "info" });
      return state;
    }
  }

  // Protect check — Phantom Force and Shadow Force bypass Protect
  const PROTECT_BYPASS_MOVES = ["phantom-force", "shadow-force"];
  if (defender.isProtected && !PROTECT_BYPASS_MOVES.includes(originalMoveName)) {
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
      isPhysical: moveData.damage_class.name === "physical",
    });
    if (abilityResult) {
      if (abilityResult.multiplier === 0) {
        if (abilityResult.message) {
          log.push({ turn: state.turn, message: abilityResult.message, kind: "status" });
        }
        if (abilityResult.healInstead) {
          const heal = Math.max(1, Math.floor(defender.maxHp / 4));
          const healedHp = Math.min(defender.maxHp, defender.currentHp + heal);
          state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, { ...defender, currentHp: healedHp });
        }
        if (abilityResult.statBoost) {
          const latestDef = getActivePokemon(state[defenderPlayer]);
          const boostKey = abilityResult.statBoost.stat as keyof StatStages;
          const oldStage = latestDef.statStages[boostKey] ?? 0;
          const newStage = Math.min(STAT_STAGE_MAX, oldStage + abilityResult.statBoost.stages);
          if (newStage !== oldStage) {
            const updatedStages = { ...latestDef.statStages, [boostKey]: newStage };
            state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...latestDef, statStages: updatedStages });
            log.push({ turn: state.turn, message: `${latestDef.slot.pokemon.name}'s Sp. Atk rose!`, kind: "status" });
          }
        }
        return state;
      }
    }
  }

  // Multi-hit resolution
  const hitCount = resolveMultiHit(moveData);

  // Damage loop + logging
  const damageResult = applyDamageLoop(
    state, attacker, defender, defenderPlayer, defenderTeam,
    result, hitCount, isCritical, moveData, defenderAbility, log, critRate,
  );
  state = damageResult.state;
  const newDefender = damageResult.newDefender;
  const totalDamage = damageResult.totalDamage;
  const hitSubstitute = damageResult.hitSubstitute;

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
        const newStage = Math.min(STAT_STAGE_MAX, oldStage + koResult.stages);
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

  // Life Orb recoil, recoil moves, drain moves
  state = applyRecoilDrain(state, attackerPlayer, attacker, originalName, totalDamage, log);

  // Contact ability retaliation (Static, Flame Body)
  if (totalDamage > 0 && !hitSubstitute && !newDefender.isFainted) {
    const defAbilityContact = getAbilityHooks(newDefender.slot.ability);
    if (defAbilityContact?.onContact && CONTACT_MOVES.has(originalName)) {
      const contactResult = defAbilityContact.onContact({ attacker, defender: newDefender });
      if (contactResult && Math.random() < contactResult.chance) {
        const currentAtk = getActivePokemon(state[attackerPlayer]);
        if (!currentAtk.isFainted && !currentAtk.status) {
          // Check type-based status immunities
          const atkTypes = currentAtk.slot.pokemon.types.map((t) => t.type.name);
          const typeImmune =
            (contactResult.status === "burn" && atkTypes.includes("fire")) ||
            (contactResult.status === "paralyze" && atkTypes.includes("electric")) ||
            ((contactResult.status === "poison" || contactResult.status === "toxic") && (atkTypes.includes("poison") || atkTypes.includes("steel"))) ||
            (contactResult.status === "freeze" && atkTypes.includes("ice"));
          if (!typeImmune) {
            state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
              ...currentAtk, status: contactResult.status,
            });
            if (contactResult.message) {
              log.push({ turn: state.turn, message: contactResult.message, kind: "status" });
            }
          }
        }
      }
    }
  }

  // Max Move effects, secondary status, flinch — skip when hitting substitute
  if (!hitSubstitute) {
    state = applySecondaryEffects(
      state, attackerPlayer, defenderPlayer, attacker, defender,
      moveData, moveIndex, originalName, isDynamaxMove, totalDamage, newDefender, log
    );
  } else {
    // Pivot moves still trigger through substitute
    const PIVOT_MOVES_SUB = ["u-turn", "volt-switch", "flip-turn"];
    if (PIVOT_MOVES_SUB.includes(originalName) && totalDamage > 0) {
      const currentAttacker = getActivePokemon(state[attackerPlayer]);
      if (!currentAttacker.isFainted) {
        const hasSwitch = state[attackerPlayer].pokemon.some((p, i) => i !== state[attackerPlayer].activePokemonIndex && !p.isFainted);
        if (hasSwitch) {
          state = { ...state, pendingPivotSwitch: attackerPlayer };
        }
      }
    }
  }

  // Track last move used, reset consecutiveProtects, apply Choice lock
  const currentAttackerFinal = getActivePokemon(state[attackerPlayer]);
  if (!currentAttackerFinal.isFainted) {
    const isProtectMove = originalName === "protect" || originalName === "detect";
    const isChoiceItem = currentAttackerFinal.slot.heldItem === "choice-band" ||
                         currentAttackerFinal.slot.heldItem === "choice-specs" ||
                         currentAttackerFinal.slot.heldItem === "choice-scarf";
    state = updatePokemon(state, attackerPlayer, state[attackerPlayer].activePokemonIndex, {
      ...currentAttackerFinal,
      lastMoveUsed: originalName,
      consecutiveProtects: isProtectMove ? currentAttackerFinal.consecutiveProtects : 0,
      choiceLockedMove: isChoiceItem ? originalName : currentAttackerFinal.choiceLockedMove,
    });
  }

  return state;
}
