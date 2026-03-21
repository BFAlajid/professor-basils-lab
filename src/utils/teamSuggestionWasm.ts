import { TeamSlot, Pokemon } from "@/types";
import { silentWarn } from "@/utils/silentWarn";
import {
  suggestTeamFillers as suggestTeamFillers_JS,
  type ScoredCandidate,
} from "./teamSuggestion";
import { createWasmWrapper } from "./createWasmWrapper";

type SuggestionWasmModule = {
  suggest_team_fillers: (
    team_types_json: string,
    candidates_json: string,
    max_results: number,
  ) => string;
};

const wrapper = createWasmWrapper<SuggestionWasmModule>("pkmn-analysis", async () => {
  // @ts-ignore
  const mod: any = await import(/* webpackIgnore: true */ "../../rust/pkmn-analysis/pkg/pkmn_analysis.js");
  await mod.default("/wasm/pkmn_analysis_bg.wasm");
  if (typeof mod.suggest_team_fillers !== "function") {
    throw new Error("suggest_team_fillers not found in WASM module — rebuild needed");
  }
  return {
    suggest_team_fillers: mod.suggest_team_fillers,
  };
});

export const ensureWasmReady = wrapper.ensureReady;
export const isWasmActive = wrapper.isActive;

interface WasmScoredResult {
  id: number;
  name: string;
  score: number;
  resistsWeaknesses: string[];
  addsOffensiveCoverage: string[];
}

export function suggestTeamFillers(
  currentTeam: TeamSlot[],
  candidatePool: Pokemon[],
  count: number = 5,
): ScoredCandidate[] {
  const wasmModule = wrapper.getModule();
  if (!wasmModule || currentTeam.length === 0) {
    return suggestTeamFillers_JS(currentTeam, candidatePool, count);
  }

  try {
    // Build team types JSON: [["fire","flying"], ["water"], ...]
    const teamTypes = currentTeam.map((slot) =>
      slot.pokemon.types.map((t) => t.type.name),
    );

    // Build candidates JSON, excluding team members
    const teamIds = new Set(currentTeam.map((s) => s.pokemon.id));
    const candidates = candidatePool
      .filter((p) => !teamIds.has(p.id))
      .map((p) => ({
        id: p.id,
        types: p.types.map((t) => t.type.name),
        name: p.name,
      }));

    const resultJson = wasmModule.suggest_team_fillers(
      JSON.stringify(teamTypes),
      JSON.stringify(candidates),
      count,
    );

    const wasmResults: WasmScoredResult[] = JSON.parse(resultJson);

    // Map back to ScoredCandidate with full Pokemon objects
    const pokemonById = new Map<number, Pokemon>();
    for (const p of candidatePool) {
      pokemonById.set(p.id, p);
    }

    return wasmResults
      .map((r) => {
        const pokemon = pokemonById.get(r.id);
        if (!pokemon) return null;
        return {
          pokemon,
          score: r.score,
          resistsWeaknesses: r.resistsWeaknesses,
          addsOffensiveCoverage: r.addsOffensiveCoverage,
        } as ScoredCandidate;
      })
      .filter((c): c is ScoredCandidate => c !== null);
  } catch (e) {
    silentWarn("wasmSuggestTeamFillers", e);
    return suggestTeamFillers_JS(currentTeam, candidatePool, count);
  }
}

export type { ScoredCandidate } from "./teamSuggestion";
