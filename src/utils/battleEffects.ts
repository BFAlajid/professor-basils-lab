import { normalizeAbilityKey } from "./format";
import {
  BattleState,
  BattlePokemon,
  BattleLogEntry,
  StatusCondition,
  StatStages,
} from "@/types";
import { getHeldItem } from "@/data/heldItems";
import { getAbilityHooks } from "@/data/abilities";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { STAT_STAGE_MIN, STAT_STAGE_MAX } from "@/data/constants";
import { getActivePokemon, getEffectiveTypes, updatePokemon } from "./battleHelpers";
import { battleRandom } from "./battleRng";

// --- Entry Hazards ---

export function applyHazardsOnSwitchIn(
  state: BattleState,
  player: "player1" | "player2",
  log: BattleLogEntry[]
): BattleState {
  const sideKey = player === "player1" ? "player1Side" : "player2Side";
  const side = state.field[sideKey];
  const pokemon = getActivePokemon(state[player]);

  if (pokemon.isFainted) return state;

  // Heavy-Duty Boots: immune to all entry hazards
  if (pokemon.slot.heldItem === "heavy-duty-boots") return state;

  const types = getEffectiveTypes(pokemon);
  const isFlying = types.includes("flying");
  const hasLevitate = normalizeAbilityKey(pokemon.slot.ability) === "levitate";
  const isGrounded = !isFlying && !hasLevitate;
  let updated = { ...pokemon };

  // Stealth Rock: Rock-type damage scaled by type effectiveness
  if (side.stealthRock) {
    const rockEff = getDefensiveMultiplier("rock", types);
    const damage = Math.max(1, Math.floor(updated.maxHp * rockEff / 8));
    updated.currentHp = Math.max(0, updated.currentHp - damage);
    log.push({ turn: state.turn, message: `Pointed stones dug into ${updated.slot.pokemon.name}!`, kind: "hazard" });
  }

  // Spikes: grounded only, damage scales with layers
  if (side.spikesLayers > 0 && isGrounded) {
    const spikeDmg = [0, 1/8, 1/6, 1/4][side.spikesLayers];
    const damage = Math.max(1, Math.floor(updated.maxHp * spikeDmg));
    updated.currentHp = Math.max(0, updated.currentHp - damage);
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by Spikes!`, kind: "hazard" });
  }

  // Toxic Spikes: grounded only. Poison-types absorb (remove). Steel immune.
  if (side.toxicSpikesLayers > 0 && isGrounded) {
    const isPoison = types.includes("poison");
    const isSteel = types.includes("steel");
    if (isPoison) {
      const newSide = { ...side, toxicSpikesLayers: 0 };
      state = { ...state, field: { ...state.field, [sideKey]: newSide } };
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} absorbed the Toxic Spikes!`, kind: "hazard" });
    } else if (!isSteel && !updated.status) {
      const newStatus: StatusCondition = side.toxicSpikesLayers >= 2 ? "toxic" : "poison";
      updated.status = newStatus;
      if (newStatus === "toxic") updated.toxicCounter = 0;
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was ${newStatus === "toxic" ? "badly poisoned" : "poisoned"} by Toxic Spikes!`, kind: "hazard" });
    }
  }

  // Sticky Web: grounded only, -1 Speed
  if (side.stickyWeb && isGrounded) {
    const oldStage = updated.statStages.speed;
    const newStage = Math.max(STAT_STAGE_MIN, oldStage - 1);
    if (newStage !== oldStage) {
      updated = { ...updated, statStages: { ...updated.statStages, speed: newStage } };
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was caught in a Sticky Web! Its Speed fell!`, kind: "hazard" });
    }
  }

  // Check for faint from hazard damage
  if (updated.currentHp <= 0) {
    updated = { ...updated, currentHp: 0, isFainted: true, isActive: false };
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} fainted!`, kind: "faint" });
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

// --- End of Turn Helpers ---

type Player = "player1" | "player2";
type SideKey = "player1Side" | "player2Side";

function sideKeyFor(player: Player): SideKey {
  return player === "player1" ? "player1Side" : "player2Side";
}

function markFainted(pkmn: BattlePokemon): BattlePokemon {
  return { ...pkmn, currentHp: 0, isFainted: true, isActive: false };
}

function checkFaint(
  updated: BattlePokemon,
  turn: number,
  log: BattleLogEntry[],
): BattlePokemon {
  if (updated.currentHp <= 0) {
    log.push({ turn, message: `${updated.slot.pokemon.name} fainted!`, kind: "faint" });
    return markFainted(updated);
  }
  return updated;
}

export function resolveWish(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const sideKey = sideKeyFor(player);
    const side = state.field[sideKey];
    if (side.wishPending > 0) {
      const newPending = side.wishPending - 1;
      if (newPending === 0) {
        const active = getActivePokemon(state[player]);
        if (!active.isFainted && active.currentHp < active.maxHp) {
          const newHp = Math.min(active.maxHp, active.currentHp + side.wishAmount);
          state = updatePokemon(state, player, state[player].activePokemonIndex, { ...active, currentHp: newHp });
          log.push({ turn: state.turn, message: `${active.slot.pokemon.name}'s wish came true!`, kind: "heal" });
        }
        state = { ...state, field: { ...state.field, [sideKey]: { ...state.field[sideKey], wishPending: 0, wishAmount: 0 } } };
      } else {
        state = { ...state, field: { ...state.field, [sideKey]: { ...state.field[sideKey], wishPending: newPending } } };
      }
    }
  }
  return state;
}

export function resolveYawn(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const yawnPoke = getActivePokemon(state[player]);
    if (yawnPoke.isFainted || yawnPoke.yawnTurns <= 0) continue;

    const newYawnTurns = yawnPoke.yawnTurns - 1;
    if (newYawnTurns === 0) {
      if (!yawnPoke.status) {
        state = updatePokemon(state, player, state[player].activePokemonIndex, {
          ...yawnPoke, yawnTurns: 0, status: "sleep", sleepTurns: 2 + Math.floor(battleRandom() * 2),
        });
        log.push({ turn: state.turn, message: `${yawnPoke.slot.pokemon.name} fell asleep!`, kind: "status" });
      } else {
        state = updatePokemon(state, player, state[player].activePokemonIndex, { ...yawnPoke, yawnTurns: 0 });
      }
    } else {
      state = updatePokemon(state, player, state[player].activePokemonIndex, { ...yawnPoke, yawnTurns: newYawnTurns });
    }
  }
  return state;
}

/** Returns [updated pokemon, whether Poison Heal handled the status]. */
export function applyStatusDamage(
  state: BattleState,
  player: Player,
  log: BattleLogEntry[],
): { state: BattleState; poisonHandled: boolean } {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return { state, poisonHandled: false };

  const updated = { ...active };
  const abilityHooks = getAbilityHooks(updated.slot.ability);
  const blocksIndirect = abilityHooks?.preventIndirectDamage === true;

  // Ability: Poison Heal (replaces poison/toxic damage with healing)
  let poisonHandled = false;
  if (abilityHooks?.onEndOfTurn && (updated.status === "poison" || updated.status === "toxic")) {
    const endResult = abilityHooks.onEndOfTurn({ pokemon: updated });
    if (endResult?.type === "heal" && endResult.healFraction) {
      const heal = Math.max(1, Math.floor(updated.maxHp * endResult.healFraction));
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      if (endResult.message) {
        log.push({ turn: state.turn, message: endResult.message, kind: "heal" });
      }
      poisonHandled = true;
    }
  }

  // Status damage (skip if Magic Guard or Poison Heal already handled)
  if (!poisonHandled && !blocksIndirect) {
    if (updated.status === "burn") {
      const damage = Math.max(1, Math.floor(updated.maxHp / 16));
      updated.currentHp = Math.max(0, updated.currentHp - damage);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by its burn!`, kind: "status" });
    } else if (updated.status === "poison") {
      const damage = Math.max(1, Math.floor(updated.maxHp / 8));
      updated.currentHp = Math.max(0, updated.currentHp - damage);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by poison!`, kind: "status" });
    } else if (updated.status === "toxic") {
      updated.toxicCounter = (updated.toxicCounter ?? 0) + 1;
      const damage = Math.max(1, Math.floor((updated.maxHp * updated.toxicCounter) / 16));
      updated.currentHp = Math.max(0, updated.currentHp - damage);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by toxic poison!`, kind: "status" });
    }
  }

  state = updatePokemon(state, player, state[player].activePokemonIndex, updated);
  return { state, poisonHandled };
}

export function applyItemHealing(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  let updated = { ...active };

  // Leftovers / Black Sludge healing
  if (updated.slot.heldItem) {
    const item = getHeldItem(updated.slot.heldItem);
    if (item?.battleModifier?.type === "hp_restore" && item.battleModifier.value) {
      if (item.name === "black-sludge") {
        const types = updated.slot.pokemon.types.map((t) => t.type.name);
        if (types.includes("poison")) {
          const heal = Math.max(1, Math.floor(updated.maxHp * item.battleModifier.value));
          updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Black Sludge!`, kind: "heal" });
        } else {
          const damage = Math.max(1, Math.floor(updated.maxHp / 8));
          updated.currentHp = Math.max(0, updated.currentHp - damage);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was hurt by its Black Sludge!`, kind: "damage" });
        }
      } else if (item.name === "leftovers") {
        const heal = Math.max(1, Math.floor(updated.maxHp * item.battleModifier.value));
        updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
        log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Leftovers!`, kind: "heal" });
      }
    }
  }

  // Pinch berry healing (Sitrus, Figy, Wiki, Mago, Aguav, Iapapa)
  if (updated.slot.heldItem && !updated.itemConsumed && updated.currentHp > 0) {
    const pinchItem = getHeldItem(updated.slot.heldItem);
    if (pinchItem?.battleModifier?.pinchHeal) {
      const { threshold, healFraction } = pinchItem.battleModifier.pinchHeal;
      if (updated.currentHp <= updated.maxHp * threshold) {
        const heal = Math.max(1, Math.floor(updated.maxHp * healFraction));
        updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
        updated = { ...updated, itemConsumed: true };
        log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with its ${pinchItem.displayName}!`, kind: "heal" });
      }
    }
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applyWeatherDamage(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  const abilityHooks = getAbilityHooks(active.slot.ability);
  const blocksIndirect = abilityHooks?.preventIndirectDamage === true;
  if (blocksIndirect) return state;

  const updated = { ...active };
  const abilityName = normalizeAbilityKey(updated.slot.ability);

  if (state.field.weather === "sandstorm") {
    const types = getEffectiveTypes(updated);
    const sandImmune = types.includes("rock") || types.includes("ground") || types.includes("steel") ||
      ["sand-veil", "sand-rush", "sand-force", "overcoat"].includes(abilityName);
    if (!sandImmune) {
      const weatherDmg = Math.max(1, Math.floor(updated.maxHp / 16));
      updated.currentHp = Math.max(0, updated.currentHp - weatherDmg);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was buffeted by the sandstorm!`, kind: "weather" });
    }
  } else if (state.field.weather === "hail") {
    const types = getEffectiveTypes(updated);
    const hailImmune = types.includes("ice") ||
      ["ice-body", "snow-cloak", "overcoat"].includes(abilityName);
    if (!hailImmune) {
      const weatherDmg = Math.max(1, Math.floor(updated.maxHp / 16));
      updated.currentHp = Math.max(0, updated.currentHp - weatherDmg);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was buffeted by the hail!`, kind: "weather" });
    }
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applyWeatherAbilities(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  const abilityName = normalizeAbilityKey(active.slot.ability);
  if (abilityName !== "dry-skin") return state;

  const updated = { ...active };
  const isHealBlocked = (updated.healBlocked ?? 0) > 0;

  if (state.field.weather === "rain") {
    if (!isHealBlocked) {
      const heal = Math.max(1, Math.floor(updated.maxHp / 8));
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s Dry Skin absorbed the rain!`, kind: "heal" });
    }
  } else if (state.field.weather === "sun") {
    const damage = Math.max(1, Math.floor(updated.maxHp / 8));
    updated.currentHp = Math.max(0, updated.currentHp - damage);
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s Dry Skin was hurt by the sunlight!`, kind: "weather" });
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applyTerrainHealing(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  if (state.field.terrain !== "grassy") return state;

  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  const types = getEffectiveTypes(active);
  const isFlying = types.includes("flying");
  const hasLevitate = normalizeAbilityKey(active.slot.ability) === "levitate";
  if (isFlying || hasLevitate) return state;

  const updated = { ...active };
  const heal = Math.max(1, Math.floor(updated.maxHp / 16));
  updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
  log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was healed by the Grassy Terrain!`, kind: "heal" });
  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applySpeedBoostAbility(
  state: BattleState,
  player: Player,
  log: BattleLogEntry[],
  poisonHandled: boolean,
): BattleState {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  const abilityHooks = getAbilityHooks(active.slot.ability);
  if (poisonHandled || !abilityHooks?.onEndOfTurn || (active.turnsOnField ?? 0) <= 1) return state;

  const endResult = abilityHooks.onEndOfTurn({ pokemon: active });
  if (endResult?.type === "speed_boost" && endResult.stat && endResult.stages) {
    const statKey = endResult.stat as keyof StatStages;
    const oldStage = active.statStages[statKey] ?? 0;
    const newStage = Math.min(STAT_STAGE_MAX, oldStage + endResult.stages);
    if (newStage !== oldStage) {
      const updated = { ...active, statStages: { ...active.statStages, [statKey]: newStage } };
      if (endResult.message) {
        log.push({ turn: state.turn, message: endResult.message, kind: "status" });
      }
      return updatePokemon(state, player, state[player].activePokemonIndex, updated);
    }
  }
  return state;
}

export function applyLeechSeedDrain(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  const seederSide = active.seededBy;
  if (!active.isSeeded || active.isFainted || !seederSide) return state;

  const types = getEffectiveTypes(active);
  if (types.includes("grass")) return state;

  let updated = { ...active };
  const drain = Math.max(1, Math.floor(updated.maxHp / 8));
  updated.currentHp = Math.max(0, updated.currentHp - drain);
  log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} had its energy drained!`, kind: "damage" });

  // Heal the seeder's active Pokemon
  const seeder = getActivePokemon(state[seederSide]);
  if (!seeder.isFainted && seeder.currentHp < seeder.maxHp) {
    const healAmt = Math.min(drain, seeder.maxHp - seeder.currentHp);
    state = updatePokemon(state, seederSide, state[seederSide].activePokemonIndex, {
      ...seeder, currentHp: seeder.currentHp + healAmt,
    });
  }

  updated = checkFaint(updated, state.turn, log);
  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applyBindingDamage(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (!(active.bindingTurns > 0) || active.isFainted) return state;

  let updated = { ...active };
  const bindDmg = Math.max(1, Math.floor(updated.maxHp / 8));
  updated.currentHp = Math.max(0, updated.currentHp - bindDmg);
  updated.bindingTurns -= 1;
  log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} is hurt by ${updated.bindingMove ?? "binding"}!`, kind: "damage" });

  if (updated.bindingTurns <= 0) {
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was freed from ${updated.bindingMove ?? "binding"}!`, kind: "info" });
    updated.bindingMove = null;
    updated.boundBy = null;
  }

  updated = checkFaint(updated, state.turn, log);
  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applyCurseDamage(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (!active.cursed || active.isFainted) return state;

  let updated = { ...active };
  const curseDmg = Math.max(1, Math.floor(updated.maxHp / 4));
  updated.currentHp = Math.max(0, updated.currentHp - curseDmg);
  log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} is afflicted by the curse!`, kind: "damage" });

  updated = checkFaint(updated, state.turn, log);
  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applyPerishCountdown(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (!(active.perishCount > 0)) return state;

  let updated = { ...active };
  updated.perishCount -= 1;
  log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s perish count fell to ${updated.perishCount}!`, kind: "info" });

  if (updated.perishCount <= 0) {
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} fainted due to Perish Song!`, kind: "faint" });
    updated = markFainted(updated);
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function applySelfHealing(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  const updated = { ...active };

  // Aqua Ring healing
  if (updated.aquaRing && (updated.healBlocked ?? 0) === 0) {
    const aquaHeal = Math.max(1, Math.floor(updated.maxHp / 16));
    updated.currentHp = Math.min(updated.maxHp, updated.currentHp + aquaHeal);
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Aqua Ring!`, kind: "heal" });
  }

  // Ingrain healing
  if (updated.ingrain && (updated.healBlocked ?? 0) === 0) {
    const ingrainHeal = Math.max(1, Math.floor(updated.maxHp / 16));
    updated.currentHp = Math.min(updated.maxHp, updated.currentHp + ingrainHeal);
    log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Ingrain!`, kind: "heal" });
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function tickVolatileTimers(state: BattleState, player: Player, log: BattleLogEntry[]): BattleState {
  const active = getActivePokemon(state[player]);
  if (active.isFainted) return state;

  const updated = { ...active };

  if (updated.taunted > 0) {
    updated.taunted -= 1;
    if (updated.taunted <= 0) {
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s taunt wore off!`, kind: "info" });
    }
  }
  if (updated.encored > 0) {
    updated.encored -= 1;
    if (updated.encored <= 0) {
      updated.encoredMove = null;
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s encore ended!`, kind: "info" });
    }
  }
  if (updated.disabledTurns > 0) {
    updated.disabledTurns -= 1;
    if (updated.disabledTurns <= 0) {
      updated.disabledMove = null;
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s disable wore off!`, kind: "info" });
    }
  }
  if (updated.healBlocked > 0) {
    updated.healBlocked -= 1;
    if (updated.healBlocked <= 0) {
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s Heal Block wore off!`, kind: "info" });
    }
  }
  if (updated.embargoed > 0) {
    updated.embargoed -= 1;
    if (updated.embargoed <= 0) {
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name}'s Embargo wore off!`, kind: "info" });
    }
  }

  return updatePokemon(state, player, state[player].activePokemonIndex, updated);
}

export function tickScreenTimers(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const sideKey of ["player1Side", "player2Side"] as const) {
    const side = state.field[sideKey];
    if (side.auroraVeil > 0) {
      const newVeil = side.auroraVeil - 1;
      const updatedSide = { ...side, auroraVeil: newVeil };
      state = { ...state, field: { ...state.field, [sideKey]: updatedSide } };
      if (newVeil <= 0) {
        const label = sideKey === "player1Side" ? "Player 1" : "Player 2";
        log.push({ turn: state.turn, message: `${label}'s Aurora Veil wore off!`, kind: "status" });
      }
    }
  }
  return state;
}

export function resolveFutureAttacks(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const sideKey = sideKeyFor(player);
    const side = state.field[sideKey];
    if (side.futureAttackTurn > 0 && side.futureAttackTurn === state.turn) {
      const target = getActivePokemon(state[player]);
      if (!target.isFainted) {
        const damage = Math.max(1, side.futureAttackDamage);
        const newHp = Math.max(0, target.currentHp - damage);
        let updatedTarget = { ...target, currentHp: newHp };
        log.push({ turn: state.turn, message: `${side.futureAttackMove ?? "Future attack"} hit ${target.slot.pokemon.name}!`, kind: "damage" });

        if (updatedTarget.currentHp <= 0) {
          updatedTarget = { ...updatedTarget, currentHp: 0, isFainted: true, isActive: false };
          log.push({ turn: state.turn, message: `${target.slot.pokemon.name} fainted!`, kind: "faint" });
        }

        state = updatePokemon(state, player, state[player].activePokemonIndex, updatedTarget);
      }

      // Reset future attack fields
      const clearedSide = { ...state.field[sideKey], futureAttackTurn: 0, futureAttackDamage: 0, futureAttackMove: null };
      state = { ...state, field: { ...state.field, [sideKey]: clearedSide } };
    }
  }
  return state;
}

// --- End of Turn Orchestrator ---

export function applyEndOfTurnEffects(state: BattleState, log: BattleLogEntry[]): BattleState {
  state = resolveWish(state, log);
  state = resolveYawn(state, log);

  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(state[player]);
    if (active.isFainted) continue;

    // Status damage (burn/poison/toxic with Poison Heal check)
    const statusResult = applyStatusDamage(state, player, log);
    state = statusResult.state;

    // Item healing (Leftovers, Black Sludge, Sitrus Berry)
    state = applyItemHealing(state, player, log);

    // Weather chip damage (sandstorm/hail)
    state = applyWeatherDamage(state, player, log);

    // Weather ability effects (Dry Skin)
    state = applyWeatherAbilities(state, player, log);

    // Terrain healing (Grassy Terrain)
    state = applyTerrainHealing(state, player, log);

    // Speed Boost ability
    state = applySpeedBoostAbility(state, player, log, statusResult.poisonHandled);

    // Faint from status/weather damage
    {
      const current = getActivePokemon(state[player]);
      if (current.currentHp <= 0 && !current.isFainted) {
        const fainted = markFainted(current);
        log.push({ turn: state.turn, message: `${current.slot.pokemon.name} fainted!`, kind: "faint" });
        state = updatePokemon(state, player, state[player].activePokemonIndex, fainted);
      }
    }

    // Leech Seed drain
    state = applyLeechSeedDrain(state, player, log);

    // Binding damage (Wrap, Fire Spin, etc.)
    state = applyBindingDamage(state, player, log);

    // Curse damage
    state = applyCurseDamage(state, player, log);

    // Perish Song countdown
    state = applyPerishCountdown(state, player, log);

    // Aqua Ring / Ingrain healing
    state = applySelfHealing(state, player, log);

    // Volatile timer ticks (Taunt, Encore, Disable, Heal Block, Embargo)
    state = tickVolatileTimers(state, player, log);
  }

  // Screen timers (Aurora Veil)
  state = tickScreenTimers(state, log);

  // Future attacks (Future Sight / Doom Desire)
  state = resolveFutureAttacks(state, log);

  return state;
}
