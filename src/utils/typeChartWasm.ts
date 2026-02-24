/**
 * WASM-powered type chart with JS fallback.
 *
 * Follows the gen3ParserWasm.ts pattern: lazy init, JS fallback, ensureWasmReady().
 * The TS wrapper converts TypeName strings to u8 indices for the Rust crate.
 */

import { TypeName } from "@/types";
import { TYPE_LIST, getEffectiveness as getEffectiveness_JS, getDefensiveMultiplier as getDefensiveMultiplier_JS } from "@/data/typeChart";

let wasmModule: {
  get_effectiveness: (atk_type: number, def_type: number) => number;
  get_defensive_multiplier: (atk_type: number, def_type1: number, def_type2: number) => number;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    const mod = await import(
      /* webpackIgnore: true */
      "../../rust/pkmn-type-chart/pkg/pkmn_type_chart.js"
    );
    await mod.default("/wasm/pkmn_type_chart_bg.wasm");
    wasmModule = {
      get_effectiveness: mod.get_effectiveness,
      get_defensive_multiplier: mod.get_defensive_multiplier,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-type-chart] WASM init failed, using JS fallback:", e);
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

function typeToIndex(type: TypeName): number {
  const idx = TYPE_LIST.indexOf(type);
  return idx === -1 ? 0 : idx;
}

/**
 * Get effectiveness of attackType vs defendType.
 * Uses WASM if loaded, otherwise JS fallback (synchronous).
 */
export function getEffectiveness(attackType: TypeName, defendType: TypeName): number {
  if (wasmModule) {
    try {
      return wasmModule.get_effectiveness(typeToIndex(attackType), typeToIndex(defendType));
    } catch {
      // fall through
    }
  }
  return getEffectiveness_JS(attackType, defendType);
}

/**
 * Get combined defensive multiplier of attackType vs defender's types.
 * Uses WASM if loaded, otherwise JS fallback (synchronous).
 */
export function getDefensiveMultiplier(attackType: TypeName, defenderTypes: TypeName[]): number {
  if (wasmModule) {
    try {
      const atkIdx = typeToIndex(attackType);
      const def1 = typeToIndex(defenderTypes[0]);
      const def2 = defenderTypes.length > 1 ? typeToIndex(defenderTypes[1]) : -1;
      return wasmModule.get_defensive_multiplier(atkIdx, def1, def2);
    } catch {
      // fall through
    }
  }
  return getDefensiveMultiplier_JS(attackType, defenderTypes);
}
