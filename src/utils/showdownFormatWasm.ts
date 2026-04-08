import type { TeamSlot, EVSpread, IVSpread, Nature, TypeName } from "@/types";
import { silentWarn } from "@/utils/silentWarn";
import { NATURES } from "@/data/natures";
import { fetchPokemon } from "@/hooks/usePokemon";
import { DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import {
  exportToShowdown as exportToShowdown_JS,
  exportSlotToShowdown as exportSlotToShowdown_JS,
  importFromShowdown as importFromShowdown_JS,
} from "./showdownFormat";
import { STAT_KEYS } from "@/data/constants";

import { createWasmWrapper } from "./createWasmWrapper";

type ShowdownWasmModule = {
  parse_showdown_paste: (input: string) => string;
  export_showdown_paste: (json: string) => string;
};

const wrapper = createWasmWrapper<ShowdownWasmModule>("pkmn-showdown", async () => {
  // @ts-ignore — WASM pkg only exists locally after wasm-pack build
  const mod = await import(/* webpackIgnore: true */ "../../rust/pkmn-showdown/pkg/pkmn_showdown.js");
  await mod.default("/wasm/pkmn_showdown_bg.wasm");
  return {
    parse_showdown_paste: mod.parse_showdown_paste,
    export_showdown_paste: mod.export_showdown_paste,
  };
});

export const ensureWasmReady = wrapper.ensureReady;
export const isWasmActive = wrapper.isActive;

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

export async function importFromShowdown(text: string): Promise<TeamSlot[]> {
  const wasmModule = wrapper.getModule();
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
        } catch (e) {
          silentWarn("wasmImportShowdownFetchPokemon", e);
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
    } catch (e) { silentWarn("wasmImportShowdown", e); }
  }
  return importFromShowdown_JS(text);
}

export function exportToShowdown(team: TeamSlot[]): string {
  const wasmModule = wrapper.getModule();
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
    } catch (e) { silentWarn("wasmExportShowdown", e); }
  }
  return exportToShowdown_JS(team);
}

export function exportSlotToShowdown(slot: TeamSlot): string {
  return exportToShowdown([slot]);
}
