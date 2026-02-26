import { TypeName } from "@/types";
import { TYPE_LIST, getEffectiveness as getEffectiveness_JS, getDefensiveMultiplier as getDefensiveMultiplier_JS } from "@/data/typeChart";
import { loadWasmModule, loadESModule } from "./wasmLoader";

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
    const mod = await loadESModule("/wasm/pkmn_type_chart.js");
    const wasmInput = await loadWasmModule("/wasm/pkmn_type_chart_bg.wasm");
    await mod.default(wasmInput);
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

export function typeToIndex(type: TypeName | string): number {
  const idx = TYPE_LIST.indexOf(type as TypeName);
  return idx === -1 ? 0 : idx;
}

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

export function getDefensiveMultiplier(attackType: TypeName, defenderTypes: TypeName[]): number {
  if (wasmModule) {
    try {
      const atkIdx = typeToIndex(attackType);
      const def1 = typeToIndex(defenderTypes[0]);
      const def2 = defenderTypes.length > 1 ? typeToIndex(defenderTypes[1]) : 255;
      return wasmModule.get_defensive_multiplier(atkIdx, def1, def2);
    } catch {
      // fall through
    }
  }
  return getDefensiveMultiplier_JS(attackType, defenderTypes);
}
