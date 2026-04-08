import { normalizeAbilityKey } from "./format";
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
import { STAT_STAGE_MIN, STAT_STAGE_MAX } from "@/data/constants";
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

// --- End of Turn Effects ---

export function applyEndOfTurnEffects(state: BattleState, log: BattleLogEntry[]): BattleState {
  // Wish resolution — decrement counter, heal when it reaches 0
  for (const player of ["player1", "player2"] as const) {
    const sideKey = player === "player1" ? "player1Side" : "player2Side";
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

  // Yawn countdown — apply sleep when yawnTurns reaches 0
  for (const player of ["player1", "player2"] as const) {
    const yawnPoke = getActivePokemon(state[player]);
    if (yawnPoke.isFainted || yawnPoke.yawnTurns <= 0) continue;

    const newYawnTurns = yawnPoke.yawnTurns - 1;
    if (newYawnTurns === 0) {
      if (!yawnPoke.status) {
        state = updatePokemon(state, player, state[player].activePokemonIndex, {
          ...yawnPoke, yawnTurns: 0, status: "sleep", sleepTurns: 2 + Math.floor(Math.random() * 2),
        });
        log.push({ turn: state.turn, message: `${yawnPoke.slot.pokemon.name} fell asleep!`, kind: "status" });
      } else {
        state = updatePokemon(state, player, state[player].activePokemonIndex, { ...yawnPoke, yawnTurns: 0 });
      }
    } else {
      state = updatePokemon(state, player, state[player].activePokemonIndex, { ...yawnPoke, yawnTurns: newYawnTurns });
    }
  }

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

    // Sitrus Berry
    if (updated.slot.heldItem === "sitrus-berry" && updated.currentHp <= updated.maxHp / 2 && updated.currentHp > 0) {
      const heal = Math.floor(updated.maxHp * 0.25);
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
      updated = { ...updated, slot: { ...updated.slot, heldItem: null } };
      log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} restored HP with its Sitrus Berry!`, kind: "heal" });
    }

    // Weather damage (sandstorm/hail) — blocked by Magic Guard
    if (!blocksIndirect) {
      const abilityName = (updated.slot.ability ?? "").toLowerCase().replace(/\s+/g, "-");
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
    }

    // Grassy Terrain healing (grounded Pokemon only)
    if (state.field.terrain === "grassy") {
      const grassyTypes = getEffectiveTypes(updated);
      const grassyIsFlying = grassyTypes.includes("flying");
      const grassyHasLevitate = normalizeAbilityKey(updated.slot.ability) === "levitate";
      if (!grassyIsFlying && !grassyHasLevitate) {
        const heal = Math.max(1, Math.floor(updated.maxHp / 16));
        updated.currentHp = Math.min(updated.maxHp, updated.currentHp + heal);
        log.push({ turn: state.turn, message: `${updated.slot.pokemon.name} was healed by the Grassy Terrain!`, kind: "heal" });
      }
    }

    // Ability: onEndOfTurn — Speed Boost (only if not already handled as Poison Heal)
    // Speed Boost should not activate on the switch-in turn (turnsOnField <= 1)
    if (!poisonHandled && abilityHooks?.onEndOfTurn && (updated.turnsOnField ?? 0) > 1) {
      const endResult = abilityHooks.onEndOfTurn({ pokemon: updated });
      if (endResult?.type === "speed_boost" && endResult.stat && endResult.stages) {
        const statKey = endResult.stat as keyof StatStages;
        const oldStage = updated.statStages[statKey] ?? 0;
        const newStage = Math.min(STAT_STAGE_MAX, oldStage + endResult.stages);
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
