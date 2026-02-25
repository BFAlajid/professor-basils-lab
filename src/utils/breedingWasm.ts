import type { PCBoxPokemon, IVSpread, Nature } from "@/types";
import { NATURES } from "@/data/natures";
import { randomSeed } from "./random";
import {
  checkCompatibility as checkCompatibility_JS,
  inheritIVs as inheritIVs_JS,
  inheritNature as inheritNature_JS,
  fetchEggGroups,
  getOffspringSpeciesId,
  createEgg,
} from "./breeding";

const EGG_GROUP_MAP: Record<string, number> = {
  monster: 0, water1: 1, bug: 2, flying: 3, field: 4,
  fairy: 5, grass: 6, "human-like": 7, water3: 8, mineral: 9,
  amorphous: 10, water2: 11, ditto: 12, dragon: 13, "no-eggs": 15,
};

function eggGroupToId(name: string): number {
  return EGG_GROUP_MAP[name] ?? 255;
}

let wasmModule: {
  check_compatibility: (g1: Uint8Array, g2: Uint8Array, d1: boolean, d2: boolean) => number;
  inherit_ivs: (p1: Uint8Array, p2: Uint8Array, dk: boolean, seed: number) => Uint8Array;
  determine_offspring_nature: (n1: number, n2: number, ev: number, seed: number) => number;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    // @ts-ignore — WASM pkg only exists locally after wasm-pack build
    const mod = await import(/* webpackIgnore: true */ "../../rust/pkmn-breeding/pkg/pkmn_breeding.js");
    await mod.default("/wasm/pkmn_breeding_bg.wasm");
    wasmModule = {
      check_compatibility: mod.check_compatibility,
      inherit_ivs: mod.inherit_ivs,
      determine_offspring_nature: mod.determine_offspring_nature,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-breeding] WASM init failed, using JS fallback:", e);
    wasmFailed = true;
    return false;
  }
}

export async function ensureWasmReady(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;
  if (!wasmInitPromise) wasmInitPromise = initWasm();
  return wasmInitPromise;
}

export function isWasmActive(): boolean {
  return wasmModule !== null;
}

export function checkCompatibility(
  groups1: string[],
  groups2: string[],
  isDitto1: boolean,
  isDitto2: boolean,
): { compatible: boolean; message: string } {
  if (wasmModule) {
    try {
      const g1 = new Uint8Array(groups1.map(eggGroupToId));
      const g2 = new Uint8Array(groups2.map(eggGroupToId));
      const result = wasmModule.check_compatibility(g1, g2, isDitto1, isDitto2);
      if (result === 0) {
        if (isDitto1 && isDitto2) return { compatible: false, message: "Two Ditto cannot breed together." };
        if (groups1.includes("no-eggs") || groups2.includes("no-eggs"))
          return { compatible: false, message: "This Pokemon is in the Undiscovered egg group." };
        return { compatible: false, message: "These Pokemon don't share an egg group." };
      }
      if (result === 2) return { compatible: true, message: "Ditto can breed with any compatible Pokemon!" };
      return { compatible: true, message: "These Pokemon share an egg group and can breed!" };
    } catch { /* fall through */ }
  }
  return checkCompatibility_JS(groups1, groups2, isDitto1, isDitto2);
}

export function inheritIVs(
  p1: PCBoxPokemon,
  p2: PCBoxPokemon,
  hasDestinyKnot: boolean,
): { stat: keyof IVSpread; fromParent: 1 | 2 }[] {
  if (wasmModule) {
    try {
      const statKeys: (keyof IVSpread)[] = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];
      const ivs1 = new Uint8Array(statKeys.map((k) => p1.ivs[k]));
      const ivs2 = new Uint8Array(statKeys.map((k) => p2.ivs[k]));
      const result = wasmModule.inherit_ivs(ivs1, ivs2, hasDestinyKnot, randomSeed());

      // [stat0, parent0, stat1, parent1, ..., iv_hp, ..., iv_spe]
      const numPairs = hasDestinyKnot ? 5 : 3;
      const inherited: { stat: keyof IVSpread; fromParent: 1 | 2 }[] = [];
      for (let i = 0; i < numPairs; i++) {
        const statIdx = result[i * 2];
        const parent = result[i * 2 + 1] as 1 | 2;
        inherited.push({ stat: statKeys[statIdx], fromParent: parent });
      }
      return inherited;
    } catch { /* fall through */ }
  }
  return inheritIVs_JS(p1, p2, hasDestinyKnot);
}

export function inheritNature(
  p1: PCBoxPokemon,
  p2: PCBoxPokemon,
  everstoneHolder: 1 | 2 | null,
): { nature: Nature; from: 1 | 2 | "random" } {
  if (wasmModule) {
    try {
      const n1 = NATURES.findIndex((n) => n.name === p1.nature.name);
      const n2 = NATURES.findIndex((n) => n.name === p2.nature.name);
      const ev = everstoneHolder ?? 0;
      const resultIdx = wasmModule.determine_offspring_nature(n1, n2, ev, randomSeed());
      const nature = NATURES[resultIdx] ?? NATURES[0];

      if (everstoneHolder === 1) return { nature, from: 1 };
      if (everstoneHolder === 2) return { nature, from: 2 };
      return { nature, from: "random" };
    } catch { /* fall through */ }
  }
  return inheritNature_JS(p1, p2, everstoneHolder);
}

export { fetchEggGroups, getOffspringSpeciesId, createEgg };
