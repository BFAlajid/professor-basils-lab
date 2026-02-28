import {
  BattleState,
  BattlePokemon,
  BattleLogEntry,
  StatusCondition,
  StatStages,
  TypeName,
} from "@/types";
import { calculateDamage } from "./damage";
import { convertToMaxMove, getMaxMoveEffect } from "@/data/maxMoves";
import { getAbilityHooks, getHighestStat } from "@/data/abilities";
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
} from "./battleHelpers";

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
  if (originalName === "fake-out" && (attacker.turnsOnField ?? 0) > 0) {
    log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s Fake Out failed!`, kind: "info" });
    return state;
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

  // Critical hit check
  const isCritical = Math.random() < (1 / 16);

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

  // Accuracy check — Max Moves always hit
  if (!isDynamaxMove) {
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
      return state;
    }
  }

  // Solar Beam power reduction in non-sun weather
  if (originalMoveName === "solar-beam" && state.field.weather && state.field.weather !== "sun") {
    moveData = { ...moveData, power: moveData.power ? Math.floor(moveData.power / 2) : moveData.power };
  }

  // Psychic Terrain priority block
  if (state.field.terrain === "psychic" && moveData.priority > 0) {
    const defTypes = getEffectiveTypes(defender);
    const defIsFlying = defTypes.includes("flying");
    const defHasLevitate = defender.slot.ability?.toLowerCase().replace(/\s+/g, "-") === "levitate";
    if (!defIsFlying && !defHasLevitate) {
      log.push({ turn: state.turn, message: `${attacker.slot.pokemon.name}'s move was blocked by Psychic Terrain!`, kind: "info" });
      return state;
    }
  }

  // Protect check
  if (defender.isProtected) {
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
        return state;
      }
    }
  }

  // Determine hit count (multi-hit moves)
  const minHits = moveData.meta?.min_hits ?? null;
  const maxHits = moveData.meta?.max_hits ?? null;
  let hitCount = 1;
  if (minHits && maxHits && maxHits > 1) {
    if (minHits === maxHits) {
      hitCount = minHits;
    } else {
      const roll = Math.random();
      if (roll < 0.35) hitCount = 2;
      else if (roll < 0.70) hitCount = 3;
      else if (roll < 0.85) hitCount = 4;
      else hitCount = 5;
      hitCount = Math.min(hitCount, maxHits);
    }
  }

  let totalDamage = 0;
  let newDefender = { ...defender };
  let firstHitSurvivalUsed = false;

  for (let hit = 0; hit < hitCount; hit++) {
    if (newDefender.isFainted) break;

    const hitCritical = hitCount > 1 ? Math.random() < (1 / 16) : isCritical;
    const hitRandomFactor = 0.85 + Math.random() * 0.15;
    let hitDamage = Math.max(1, Math.floor(result.max * hitRandomFactor));

    // Ability: Multiscale halves damage at full HP (only applies on first hit)
    if (hit === 0 && defenderAbility?.modifyIncomingDamage) {
      const multiscaleResult = defenderAbility.modifyIncomingDamage({
        defender: newDefender,
        attacker,
        moveType: moveData.type.name as TypeName,
        movePower: moveData.power ?? 0,
      });
      if (multiscaleResult && multiscaleResult.multiplier > 0 && multiscaleResult.multiplier < 1) {
        hitDamage = Math.max(1, Math.floor(hitDamage * multiscaleResult.multiplier));
        if (multiscaleResult.message) {
          log.push({ turn: state.turn, message: multiscaleResult.message, kind: "status" });
        }
      }
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
      newDefender = { ...newDefender, currentHp: 1 };
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
        const newStage = Math.min(6, oldStage + koResult.stages);
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

  // Life Orb recoil
  if (attacker.slot.heldItem === "life-orb" && totalDamage > 0) {
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
  if (isDynamaxMove && totalDamage > 0) {
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
        const defAbilitySecondary = getAbilityHooks(newDefender.slot.ability);
        const statusBlocked = defAbilitySecondary?.preventStatus && defAbilitySecondary.preventStatus({ pokemon: newDefender, status: newStatus });
        if (!statusBlocked) {
          newDefender = { ...newDefender, status: newStatus };
          if (newStatus === "sleep") {
            newDefender.sleepTurns = 1 + Math.floor(Math.random() * 3);
          }
          log.push({ turn: state.turn, message: `${defender.slot.pokemon.name} was ${getStatusText(newStatus)}!`, kind: "status" });
          state = updatePokemon(state, defenderPlayer, defenderTeam.activePokemonIndex, newDefender);
        }
      }
    }
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
      const recoilDmg = Math.max(1, Math.floor(totalDamage * recoilFraction));
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
  const flinchChance = FLINCH_MOVES[originalName];
  if (flinchChance && totalDamage > 0 && !newDefender.isFainted) {
    if (Math.random() * 100 < flinchChance) {
      const latestDefender = getActivePokemon(state[defenderPlayer]);
      if (!latestDefender.isFainted) {
        state = updatePokemon(state, defenderPlayer, state[defenderPlayer].activePokemonIndex, { ...latestDefender, isFlinched: true });
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
