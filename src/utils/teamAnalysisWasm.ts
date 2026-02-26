import type { TypeName, TeamSlot, Pokemon } from "@/types";
import { TYPE_LIST } from "@/data/typeChart";
import { typeToIndex } from "./typeChartWasm";
import {
  analyzeTeam as analyzeTeam_JS,
  type TeamWeaknessReport,
  type DefensiveEntry,
  type SuggestedType,
} from "./teamAnalysis";
import {
  analyzeDefensiveCoverage as analyzeDefensiveCoverage_JS,
  type CoverageResult,
} from "./teamAnalysis";
import { capitalize } from "./format";

let wasmModule: {
  analyze_team: (team_types: Uint8Array, team_size: number) => Float64Array;
  analyze_defensive_coverage: (team_types: Uint8Array, team_size: number) => Float64Array;
} | null = null;

let wasmInitPromise: Promise<boolean> | null = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;

  try {
    // @ts-ignore — WASM pkg only exists locally after wasm-pack build
    const mod = await import(/* webpackIgnore: true */ "../../rust/pkmn-analysis/pkg/pkmn_analysis.js");
    await mod.default("/wasm/pkmn_analysis_bg.wasm");
    wasmModule = {
      analyze_team: mod.analyze_team,
      analyze_defensive_coverage: mod.analyze_defensive_coverage,
    };
    return true;
  } catch (e) {
    console.warn("[pkmn-analysis] WASM init failed, using JS fallback:", e);
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

// 255 = mono-type sentinel
function flattenTeamTypes(team: TeamSlot[]): Uint8Array {
  const arr = new Uint8Array(team.length * 2);
  for (let i = 0; i < team.length; i++) {
    const types = team[i].pokemon.types;
    arr[i * 2] = typeToIndex(types[0].type.name);
    arr[i * 2 + 1] = types.length > 1 ? typeToIndex(types[1].type.name) : 255;
  }
  return arr;
}

function flattenPokemonTypes(team: Pokemon[]): Uint8Array {
  const arr = new Uint8Array(team.length * 2);
  for (let i = 0; i < team.length; i++) {
    const types = team[i].types;
    arr[i * 2] = typeToIndex(types[0].type.name);
    arr[i * 2 + 1] = types.length > 1 ? typeToIndex(types[1].type.name) : 255;
  }
  return arr;
}

export function analyzeTeam(team: TeamSlot[]): TeamWeaknessReport {
  if (!wasmModule || team.length === 0) {
    return analyzeTeam_JS(team);
  }

  try {
    const teamTypes = flattenTeamTypes(team);
    const result = wasmModule.analyze_team(teamTypes, team.length);

    let offset = 0;

    // 18 triples of (weakCount, resistCount, immuneCount)
    const defensiveChart = {} as Record<TypeName, DefensiveEntry>;
    for (let i = 0; i < 18; i++) {
      defensiveChart[TYPE_LIST[i]] = {
        weakCount: result[offset++],
        resistCount: result[offset++],
        immuneCount: result[offset++],
      };
    }

    const threatScore = result[offset++];

    const numUncovered = result[offset++];
    const uncoveredWeaknesses: TypeName[] = [];
    for (let i = 0; i < numUncovered; i++) {
      uncoveredWeaknesses.push(TYPE_LIST[result[offset++]]);
    }

    const numCovered = result[offset++];
    const offensiveCoverage: TypeName[] = [];
    for (let i = 0; i < numCovered; i++) {
      offensiveCoverage.push(TYPE_LIST[result[offset++]]);
    }

    const numGaps = result[offset++];
    const offensiveGaps: TypeName[] = [];
    for (let i = 0; i < numGaps; i++) {
      offensiveGaps.push(TYPE_LIST[result[offset++]]);
    }

    const numSuggestions = result[offset++];
    const suggestedTypes: SuggestedType[] = [];

    const teamTypeSet = new Set<TypeName>();
    for (const slot of team) {
      for (const t of slot.pokemon.types) {
        teamTypeSet.add(t.type.name);
      }
    }

    const problematic = TYPE_LIST.filter((type) => {
      const entry = defensiveChart[type];
      return entry.weakCount >= 2 && entry.resistCount === 0 && entry.immuneCount === 0;
    });

    for (let i = 0; i < numSuggestions; i++) {
      const typeIdx = result[offset++];
      const score = result[offset++];
      const candidateType = TYPE_LIST[typeIdx];

      const covers: TypeName[] = [];
      for (const problemType of problematic) {
        covers.push(problemType);
      }

      const typeName = capitalize(candidateType);
      const alreadyOnTeam = teamTypeSet.has(candidateType);
      const coverList = problematic.map(capitalize).join(", ");

      const reason = alreadyOnTeam
        ? `Another ${typeName} type would further cover ${coverList} weaknesses`
        : `A ${typeName} type would cover ${coverList} weaknesses`;

      suggestedTypes.push({ type: candidateType, reason });
      void score;
    }

    return {
      uncoveredWeaknesses,
      offensiveCoverage,
      offensiveGaps,
      defensiveChart,
      threatScore,
      suggestedTypes,
    };
  } catch {
    return analyzeTeam_JS(team);
  }
}

export function analyzeDefensiveCoverage(team: Pokemon[]): CoverageResult[] {
  if (!wasmModule || team.length === 0) {
    return analyzeDefensiveCoverage_JS(team);
  }

  try {
    const teamTypes = flattenPokemonTypes(team);
    const result = wasmModule.analyze_defensive_coverage(teamTypes, team.length);

    // 18 entries × 4 values each
    const coverage: CoverageResult[] = [];
    for (let i = 0; i < 18; i++) {
      const offset = i * 4;
      const statusCode = result[offset];
      const offensiveCovered = result[offset + 1] > 0;
      const worstDefensiveMultiplier = result[offset + 2];
      const bestDefensiveMultiplier = result[offset + 3];

      let defensiveStatus: "resist" | "weak" | "neutral" = "neutral";
      if (statusCode === 1) defensiveStatus = "resist";
      else if (statusCode === 2) defensiveStatus = "weak";

      coverage.push({
        type: TYPE_LIST[i],
        defensiveStatus,
        offensiveCovered,
        worstDefensiveMultiplier,
        bestDefensiveMultiplier,
      });
    }

    return coverage;
  } catch {
    return analyzeDefensiveCoverage_JS(team);
  }
}

export type { TeamWeaknessReport, DefensiveEntry, SuggestedType, CoverageResult } from "./teamAnalysis";
export { getWeaknesses, getResistances, getOffensiveCoverage } from "./teamAnalysis";
