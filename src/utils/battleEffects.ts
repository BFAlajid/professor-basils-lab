import {
  BattleState,
  BattlePokemon,
  BattleLogEntry,
  StatusCondition,
  StatStages,
  TypeName,
} from "@/types";
import { getHeldItem } from "@/data/heldItems";
import { getAbilityHooks } from "@/data/abilities";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { getActivePokemon, getEffectiveTypes, updatePokemon } from "./battleHelpers";

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
  const hasLevitate = pokemon.slot.ability?.toLowerCase().replace(/\s+/g, "-") === "levitate";
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
    const newStage = Math.max(-6, oldStage - 1);
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

// --- End of Turn Effects ---

export function applyEndOfTurnEffects(state: BattleState, log: BattleLogEntry[]): BattleState {
  for (const player of ["player1", "player2"] as const) {
    const active = getActivePokemon(state[player]);
    if (active.isFainted) continue;

    let updated = { ...active };
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
          }
        } else if (item.name === "leftovers") {
          const heal = Math.max(1, Math.floor(updated.maxHp * item.battleModifier.value));
          updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with Leftovers!`, kind: "heal" });
        }
      }
    }

    // Sitrus Berry
    if (updated.slot.heldItem === "sitrus-berry" && updated.currentHp <= updated.maxHp / 2 && updated.currentHp > 0) {
      const heal = Math.floor(updated.maxHp * 0.25);
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      updated = { ...updated, slot: { ...updated.slot, heldItem: null } };
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with its Sitrus Berry!`, kind: "heal" });
    }

    // Weather damage (sandstorm/hail) — blocked by Magic Guard
    if (!blocksIndirect) {
      if (state.field.weather === "sandstorm") {
        const types = getEffectiveTypes(updated);
        if (!types.includes("rock") && !types.includes("ground") && !types.includes("steel")) {
          const weatherDmg = Math.max(1, Math.floor(updated.maxHp / 16));
          updated.currentHp = Math.max(0, updated.currentHp - weatherDmg);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was buffeted by the sandstorm!`, kind: "weather" });
        }
      } else if (state.field.weather === "hail") {
        const types = getEffectiveTypes(updated);
        if (!types.includes("ice")) {
          const weatherDmg = Math.max(1, Math.floor(updated.maxHp / 16));
          updated.currentHp = Math.max(0, updated.currentHp - weatherDmg);
          log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was buffeted by the hail!`, kind: "weather" });
        }
      }
    }

    // Grassy Terrain healing
    if (state.field.terrain === "grassy") {
      const heal = Math.max(1, Math.floor(updated.maxHp / 16));
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was healed by the Grassy Terrain!`, kind: "heal" });
    }

    // Ability: onEndOfTurn — Speed Boost (only if not already handled as Poison Heal)
    if (!poisonHandled && abilityHooks?.onEndOfTurn) {
      const endResult = abilityHooks.onEndOfTurn({ pokemon: updated });
      if (endResult?.type === "speed_boost" && endResult.stat && endResult.stages) {
        const statKey = endResult.stat as keyof StatStages;
        const oldStage = updated.statStages[statKey] ?? 0;
        const newStage = Math.min(6, oldStage + endResult.stages);
        if (newStage !== oldStage) {
          updated = { ...updated, statStages: { ...updated.statStages, [statKey]: newStage } };
          if (endResult.message) {
            log.push({ turn: state.turn, message: endResult.message, kind: "status" });
          }
        }
      }
    }

    // Faint from status/weather damage
    if (updated.currentHp <= 0) {
      updated = { ...updated, currentHp: 0, isFainted: true, isActive: false };
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} fainted!`, kind: "faint" });
    }

    state = updatePokemon(state, player, state[player].activePokemonIndex, updated);
  }

  return state;
}
