import { TypeName, Pokemon } from "@/types";
import { TYPE_LIST, getDefensiveMultiplier } from "@/data/typeChart";

export interface CoverageResult {
  type: TypeName;
  defensiveStatus: "resist" | "weak" | "neutral";
  offensiveCovered: boolean;
  worstDefensiveMultiplier: number;
  bestDefensiveMultiplier: number;
}

export function analyzeDefensiveCoverage(team: Pokemon[]): CoverageResult[] {
  return TYPE_LIST.map((attackingType) => {
    let anyResists = false;
    let allNeutralOrWorse = true;
    let worstMultiplier = 0;
    let bestMultiplier = Infinity;

    for (const pokemon of team) {
      const defenderTypes = pokemon.types.map((t) => t.type.name);
      const multiplier = getDefensiveMultiplier(attackingType, defenderTypes);

      if (multiplier < 1) {
        anyResists = true;
      }
      if (multiplier > worstMultiplier) {
        worstMultiplier = multiplier;
      }
      if (multiplier < bestMultiplier) {
        bestMultiplier = multiplier;
      }
    }

    // Check offensive coverage (STAB)
    let offensiveCovered = false;
    for (const pokemon of team) {
      const attackerTypes = pokemon.types.map((t) => t.type.name);
      if (attackerTypes.includes(attackingType)) {
        offensiveCovered = true;
        break;
      }
    }

    let defensiveStatus: "resist" | "weak" | "neutral" = "neutral";
    if (anyResists) {
      defensiveStatus = "resist";
    } else if (worstMultiplier > 1) {
      defensiveStatus = "weak";
    }

    return {
      type: attackingType,
      defensiveStatus,
      offensiveCovered,
      worstDefensiveMultiplier: worstMultiplier,
      bestDefensiveMultiplier: bestMultiplier,
    };
  });
}

export function getWeaknesses(coverage: CoverageResult[]): TypeName[] {
  return coverage
    .filter((c) => c.defensiveStatus === "weak")
    .map((c) => c.type);
}

export function getResistances(coverage: CoverageResult[]): TypeName[] {
  return coverage
    .filter((c) => c.defensiveStatus === "resist")
    .map((c) => c.type);
}

export function getOffensiveCoverage(coverage: CoverageResult[]): TypeName[] {
  return coverage
    .filter((c) => c.offensiveCovered)
    .map((c) => c.type);
}
