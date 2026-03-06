import { TypeName } from "@/types";
import { TYPE_LIST, getEffectiveness as getEffectiveness_JS, getDefensiveMultiplier as getDefensiveMultiplier_JS } from "@/data/typeChart";
import { createWasmWrapper } from "./createWasmWrapper";

type TypeChartWasmModule = {
  get_effectiveness: (atk_type: number, def_type: number) => number;
  get_defensive_multiplier: (atk_type: number, def_type1: number, def_type2: number) => number;
};

const wrapper = createWasmWrapper<TypeChartWasmModule>("pkmn-type-chart", async () => {
  // @ts-ignore — WASM pkg only exists locally after wasm-pack build
  const mod = await import(/* webpackIgnore: true */ "../../rust/pkmn-type-chart/pkg/pkmn_type_chart.js");
  await mod.default("/wasm/pkmn_type_chart_bg.wasm");
  return {
    get_effectiveness: mod.get_effectiveness,
    get_defensive_multiplier: mod.get_defensive_multiplier,
  };
});

export const ensureWasmReady = wrapper.ensureReady;
export const isWasmActive = wrapper.isActive;

export function typeToIndex(type: TypeName | string): number {
  const idx = TYPE_LIST.indexOf(type as TypeName);
  return idx === -1 ? 0 : idx;
}

export function getEffectiveness(attackType: TypeName, defendType: TypeName): number {
  const wasmModule = wrapper.getModule();
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
  const wasmModule = wrapper.getModule();
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
