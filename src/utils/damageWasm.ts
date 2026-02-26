import type { Pokemon, Move, TypeName, BattlePokemon } from "@/types";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { typeToIndex } from "./typeChartWasm";
import { getHeldItem } from "@/data/heldItems";
import { getAbilityHooks } from "@/data/abilities";
import { loadWasmModule, loadESModule } from "./wasmLoader";
import {
  calculateDamage as calculateDamage_JS,
  extractBaseStats,
  type DamageCalcOptions,
  type DamageResult,
} from "./damage";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";

let wasmModule: {
  calculate_damage: (
    effective_atk: number,
    effective_def: number,
    move_power: number,
    move_type: number,
    def_type1: number,
    def_type2: number,
    stab: number,
    is_critical: boolean,
    weather: number,
    move_is_fire: boolean,
    move_is_water: boolean,
    item_damage_mult: number,
    ability_atk_mult: number,
    is_burned_physical: boolean,
    atk_stage: number,
    def_stage: number,
    def_item_spdef_mult: number,
    is_physical: boolean,
  ) => Float64Array;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    const mod = await loadESModule("/wasm/pkmn_damage.js");
    const wasmInput = await loadWasmModule("/wasm/pkmn_damage_bg.wasm");
    await mod.default(wasmInput);
    wasmModule = {
      calculate_damage: mod.calculate_damage,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-damage] WASM init failed, using JS fallback:", e);
    wasmFailed = true;
    return false;
  }
}

export async function ensureWasmReady(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm();
  }
  return wasmInitPromise;
}

export function isWasmActive(): boolean {
  return wasmModule !== null;
}

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  options?: DamageCalcOptions
): DamageResult {
  if (!wasmModule) {
    return calculateDamage_JS(attacker, defender, move, options);
  }

  if (move.power === null || move.damage_class.name === "status") {
    return { min: 0, max: 0, effectiveness: 1, stab: false, isCritical: false };
  }

  try {
    const isCritical = options?.isCritical ?? false;
    const isPhysical = move.damage_class.name === "physical";

    let atk: number;
    let def: number;

    if (options && (options.attackerEvs || options.attackerNature || options.defenderEvs || options.defenderNature)) {
      const attackerBase = extractBaseStats(attacker);
      const defenderBase = extractBaseStats(defender);
      const attackerCalc = calculateAllStats(
        attackerBase,
        options.attackerIvs ?? DEFAULT_IVS,
        options.attackerEvs ?? DEFAULT_EVS,
        options.attackerNature ?? null
      );
      const defenderCalc = calculateAllStats(
        defenderBase,
        options.defenderIvs ?? DEFAULT_IVS,
        options.defenderEvs ?? DEFAULT_EVS,
        options.defenderNature ?? null
      );
      atk = isPhysical ? attackerCalc.attack : attackerCalc.spAtk;
      def = isPhysical ? defenderCalc.defense : defenderCalc.spDef;
    } else {
      const attackerStats = extractBaseStats(attacker);
      const defenderStats = extractBaseStats(defender);
      atk = isPhysical ? attackerStats.attack : attackerStats.spAtk;
      def = isPhysical ? defenderStats.defense : defenderStats.spDef;
    }

    const abilityHooks = options?.attackerAbility ? getAbilityHooks(options.attackerAbility) : null;
    const gutsActive = abilityHooks?.modifyAttackStat &&
      options?.attackerBattlePokemon?.status &&
      options.attackerAbility?.toLowerCase().replace(/\s+/g, "-") === "guts";

    let abilityAtkMult = 1.0;
    if (abilityHooks?.modifyAttackStat && options?.attackerBattlePokemon) {
      abilityAtkMult = abilityHooks.modifyAttackStat({
        attacker: options.attackerBattlePokemon,
        movePower: move.power,
        isPhysical,
      });
    }

    const isBurnedPhysical = options?.attackerStatus === "burn" && isPhysical && !gutsActive;

    const attackerTypes = options?.attackerEffectiveTypes ?? attacker.types.map((t) => t.type.name);
    const defenderTypes = options?.defenderEffectiveTypes ?? defender.types.map((t) => t.type.name);

    let stab = 1.0;
    if (attackerTypes.includes(move.type.name as TypeName)) {
      if (options?.isTerastallized && options?.attackerOriginalTypes?.includes(move.type.name as TypeName)) {
        stab = 2.0;
      } else {
        stab = 1.5;
      }
    } else if (options?.isTerastallized && options?.attackerOriginalTypes?.includes(move.type.name as TypeName)) {
      stab = 1.5;
    }

    // Adaptability
    if (stab > 1 && abilityHooks?.modifySTAB && options?.attackerBattlePokemon) {
      stab = abilityHooks.modifySTAB({ attacker: options.attackerBattlePokemon, stab });
    }

    let itemDamageMult = 1.0;
    if (options?.attackerItem) {
      const item = getHeldItem(options.attackerItem);
      if (item?.battleModifier?.type === "damage_boost") {
        const mod = item.battleModifier;
        let applies = false;
        if (!mod.condition) {
          applies = true;
        } else if (mod.condition === "physical" && isPhysical) {
          applies = true;
        } else if (mod.condition === "special" && !isPhysical) {
          applies = true;
        } else if (mod.condition === "super_effective") {
          const typeEff = getDefensiveMultiplier(move.type.name, defenderTypes);
          applies = typeEff > 1;
        } else if (mod.condition.startsWith("type:")) {
          const itemType = mod.condition.replace("type:", "");
          applies = move.type.name === itemType;
        }
        if (applies && mod.value) {
          itemDamageMult = mod.value;
        }
      }
    }

    let defItemSpdefMult = 1.0;
    if (options?.defenderItem && !isPhysical) {
      const defItem = getHeldItem(options.defenderItem);
      if (defItem?.battleModifier?.type === "stat_boost" && defItem.battleModifier.condition === "spDef") {
        defItemSpdefMult = defItem.battleModifier.value ?? 1.0;
      }
    }

    let weather = 0;
    if (options?.fieldWeather === "sun") weather = 1;
    else if (options?.fieldWeather === "rain") weather = 2;

    const result = wasmModule.calculate_damage(
      atk,
      def,
      move.power,
      typeToIndex(move.type.name),
      typeToIndex(defenderTypes[0]),
      defenderTypes.length > 1 ? typeToIndex(defenderTypes[1]) : 255,
      stab,
      isCritical,
      weather,
      move.type.name === "fire",
      move.type.name === "water",
      itemDamageMult,
      abilityAtkMult,
      isBurnedPhysical,
      options?.attackerStatStage ?? 0,
      options?.defenderStatStage ?? 0,
      defItemSpdefMult,
      isPhysical,
    );

    return {
      min: result[0],
      max: result[1],
      effectiveness: result[2],
      stab: result[3] > 0,
      isCritical: result[4] > 0,
    };
  } catch {
    return calculateDamage_JS(attacker, defender, move, options);
  }
}

export { extractBaseStats, getEffectivenessText } from "./damage";
export type { DamageCalcOptions, DamageResult } from "./damage";
