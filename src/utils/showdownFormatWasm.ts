/**
 * WASM-powered Showdown format parser/exporter with JS fallback.
 *
 * Rust handles pure string parsing and formatting.
 * PokeAPI fetching and move validation stay in JS.
 */

import type { TeamSlot, EVSpread, IVSpread, Nature, TypeName } from "@/types";
import { NATURES } from "@/data/natures";
import { fetchPokemon } from "@/hooks/usePokemon";
import { DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import {
  exportToShowdown as exportToShowdown_JS,
  importFromShowdown as importFromShowdown_JS,
} from "./showdownFormat";

const STAT_KEYS: (keyof EVSpread)[] = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];

let wasmModule: {
  parse_showdown_paste: (input: string) => string;
  export_showdown_paste: (json: string) => string;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    const mod = await import(
      /* webpackIgnore: true */
      "../../rust/pkmn-showdown/pkg/pkmn_showdown.js"
    );
    await mod.default("/wasm/pkmn_showdown_bg.wasm");
    wasmModule = {
      parse_showdown_paste: mod.parse_showdown_paste,
      export_showdown_paste: mod.export_showdown_paste,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-showdown] WASM init failed, using JS fallback:", e);
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

interface ParsedBlock {
  species: string;
  item: string;
  ability: string;
  nature: string;
  teraType: string;
  evs: number[];
  ivs: number[] | null;
  moves: string[];
}

/**
 * Import a Showdown paste. Uses WASM for parsing, JS for PokeAPI fetching.
 */
export async function importFromShowdown(text: string): Promise<TeamSlot[]> {
  if (wasmModule) {
    try {
      const jsonStr = wasmModule.parse_showdown_paste(text);
      const parsed: ParsedBlock[] = JSON.parse(jsonStr);

      const slots: TeamSlot[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        if (!p || !p.species) continue;

        let pokemon;
        try {
          pokemon = await fetchPokemon(p.species);
        } catch {
          continue;
        }

        const nature: Nature | null =
          NATURES.find((n) => n.name === p.nature) ?? null;

        const evs: EVSpread = { ...DEFAULT_EVS };
        if (p.evs && p.evs.length === 6) {
          STAT_KEYS.forEach((k, j) => { evs[k] = p.evs[j]; });
        }

        const ivs: IVSpread = { ...DEFAULT_IVS };
        const hasIvs = p.ivs !== null;
        if (hasIvs && p.ivs!.length === 6) {
          STAT_KEYS.forEach((k, j) => { ivs[k] = p.ivs![j]; });
        }

        const slot: TeamSlot = {
          pokemon,
          position: slots.length,
          nature,
          evs,
          ivs: hasIvs ? ivs : { ...DEFAULT_IVS },
          ability: p.ability || null,
          heldItem: p.item || null,
          selectedMoves: p.moves.length > 0 ? p.moves : undefined,
          teraConfig: p.teraType ? { teraType: p.teraType as TypeName } : undefined,
        };

        slots.push(slot);
      }

      return slots;
    } catch { /* fall through */ }
  }
  return importFromShowdown_JS(text);
}

/**
 * Export a team to Showdown paste format. Uses WASM if loaded.
 */
export function exportToShowdown(team: TeamSlot[]): string {
  if (wasmModule) {
    try {
      const data = team.map((slot) => ({
        species: slot.pokemon.name,
        item: slot.heldItem ?? "",
        ability: slot.ability ?? "",
        nature: slot.nature?.name ?? "",
        teraType: slot.teraConfig?.teraType ?? "",
        evs: STAT_KEYS.map((k) => (slot.evs ?? DEFAULT_EVS)[k]),
        ivs: STAT_KEYS.map((k) => (slot.ivs ?? DEFAULT_IVS)[k]),
        moves: slot.selectedMoves ?? [],
      }));
      return wasmModule.export_showdown_paste(JSON.stringify(data));
    } catch { /* fall through */ }
  }
  return exportToShowdown_JS(team);
}
