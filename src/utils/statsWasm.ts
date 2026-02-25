/**
 * WASM-powered stat calculator with JS fallback.
 *
 * Follows the gen3ParserWasm.ts pattern: lazy init, JS fallback, ensureWasmReady().
 */

import { calculateHP as calculateHP_JS, calculateStat as calculateStat_JS, calculateAllStats as calculateAllStats_JS } from "./stats";
import type { CalculatedStats } from "./stats";
import type { BaseStats, EVSpread, IVSpread, Nature, StatKey } from "@/types";

// Re-export constants and types so consumers can switch to a single import
export { DEFAULT_EVS, DEFAULT_IVS } from "./stats";
export type { CalculatedStats } from "./stats";
import { getNatureModifier } from "@/data/natures";

let wasmModule: {
  calculate_hp: (base: number, iv: number, ev: number, level: number) => number;
  calculate_stat: (base: number, iv: number, ev: number, nature_modifier: number, level: number) => number;
  calculate_all_stats: (
    hp_base: number, atk_base: number, def_base: number, spa_base: number, spd_base: number, spe_base: number,
    hp_iv: number, atk_iv: number, def_iv: number, spa_iv: number, spd_iv: number, spe_iv: number,
    hp_ev: number, atk_ev: number, def_ev: number, spa_ev: number, spd_ev: number, spe_ev: number,
    atk_nature: number, def_nature: number, spa_nature: number, spd_nature: number, spe_nature: number,
  ) => Uint32Array;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    const mod = await import(
      /* webpackIgnore: true */
      "../../rust/pkmn-stats/pkg/pkmn_stats.js"
    );
    await mod.default("/wasm/pkmn_stats_bg.wasm");
    wasmModule = {
      calculate_hp: mod.calculate_hp,
      calculate_stat: mod.calculate_stat,
      calculate_all_stats: mod.calculate_all_stats,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-stats] WASM init failed, using JS fallback:", e);
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

/**
 * Calculate HP stat. Uses WASM if loaded, otherwise JS fallback (synchronous).
 */
export function calculateHP(base: number, iv: number, ev: number, level: number = 50): number {
  if (wasmModule) {
    try {
      return wasmModule.calculate_hp(base, iv, ev, level);
    } catch {
      // fall through
    }
  }
  return calculateHP_JS(base, iv, ev, level);
}

/**
 * Calculate a single stat. Uses WASM if loaded, otherwise JS fallback (synchronous).
 */
export function calculateStat(
  base: number,
  iv: number,
  ev: number,
  nature: Nature | null,
  statKey: StatKey,
  level: number = 50
): number {
  const modifier = nature ? getNatureModifier(nature, statKey) : 1.0;
  if (wasmModule) {
    try {
      return wasmModule.calculate_stat(base, iv, ev, modifier, level);
    } catch {
      // fall through
    }
  }
  return calculateStat_JS(base, iv, ev, nature, statKey, level);
}

/**
 * Calculate all 6 stats. Uses WASM if loaded, otherwise JS fallback (synchronous).
 */
export function calculateAllStats(
  baseStats: BaseStats,
  ivs: IVSpread,
  evs: EVSpread,
  nature: Nature | null
): CalculatedStats {
  if (wasmModule) {
    try {
      const atkMod = nature ? getNatureModifier(nature, "attack") : 1.0;
      const defMod = nature ? getNatureModifier(nature, "defense") : 1.0;
      const spaMod = nature ? getNatureModifier(nature, "spAtk") : 1.0;
      const spdMod = nature ? getNatureModifier(nature, "spDef") : 1.0;
      const speMod = nature ? getNatureModifier(nature, "speed") : 1.0;

      const result = wasmModule.calculate_all_stats(
        baseStats.hp, baseStats.attack, baseStats.defense, baseStats.spAtk, baseStats.spDef, baseStats.speed,
        ivs.hp, ivs.attack, ivs.defense, ivs.spAtk, ivs.spDef, ivs.speed,
        evs.hp, evs.attack, evs.defense, evs.spAtk, evs.spDef, evs.speed,
        atkMod, defMod, spaMod, spdMod, speMod,
      );

      return {
        hp: result[0],
        attack: result[1],
        defense: result[2],
        spAtk: result[3],
        spDef: result[4],
        speed: result[5],
      };
    } catch {
      // fall through
    }
  }
  return calculateAllStats_JS(baseStats, ivs, evs, nature);
}
