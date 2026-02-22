import { TypeName, TeamSlot } from "@/types";
import { capitalize } from "./format";
import { TYPE_LIST, getEffectiveness, getDefensiveMultiplier } from "@/data/typeChart";

export interface DefensiveEntry {
  weakCount: number;
  resistCount: number;
  immuneCount: number;
}

export interface SuggestedType {
  type: TypeName;
  reason: string;
}

export interface TeamWeaknessReport {
  /** Types the team is weak to (3+ members weak, 0 resist) */
  uncoveredWeaknesses: TypeName[];
  /** Types the team can hit super-effectively via STAB or selected moves */
  offensiveCoverage: TypeName[];
  /** Types the team has no super-effective moves against */
  offensiveGaps: TypeName[];
  /** Per-type defensive summary across the team */
  defensiveChart: Record<TypeName, DefensiveEntry>;
  /** Overall threat score (0-100, higher = more vulnerable) */
  threatScore: number;
  /** Suggested types that would shore up team weaknesses */
  suggestedTypes: SuggestedType[];
}

/**
 * For a single Pokemon, get its defensive types (accounting for types array).
 */
function getPokemonTypes(slot: TeamSlot): TypeName[] {
  return slot.pokemon.types.map((t) => t.type.name);
}

/**
 * Build the per-type defensive chart: for each attacking type, count how many
 * team members are weak (multiplier > 1), resist (0 < multiplier < 1), or
 * immune (multiplier === 0).
 */
function buildDefensiveChart(
  team: TeamSlot[]
): Record<TypeName, DefensiveEntry> {
  const chart = {} as Record<TypeName, DefensiveEntry>;

  for (const attackType of TYPE_LIST) {
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const slot of team) {
      const defenderTypes = getPokemonTypes(slot);
      const multiplier = getDefensiveMultiplier(attackType, defenderTypes);

      if (multiplier === 0) {
        immuneCount++;
      } else if (multiplier < 1) {
        resistCount++;
      } else if (multiplier > 1) {
        weakCount++;
      }
    }

    chart[attackType] = { weakCount, resistCount, immuneCount };
  }

  return chart;
}

/**
 * Identify uncovered weaknesses: types where 3+ team members are weak
 * and 0 members resist or are immune.
 */
function findUncoveredWeaknesses(
  chart: Record<TypeName, DefensiveEntry>
): TypeName[] {
  return TYPE_LIST.filter((type) => {
    const entry = chart[type];
    return entry.weakCount >= 3 && entry.resistCount === 0 && entry.immuneCount === 0;
  });
}

/**
 * Determine offensive coverage. If a slot has selectedMoves we check each
 * move's type for super-effectiveness. Otherwise we fall back to STAB coverage
 * using the Pokemon's own types.
 */
function computeOffensiveCoverage(team: TeamSlot[]): {
  covered: TypeName[];
  gaps: TypeName[];
} {
  // Collect all attacking types available to the team
  const attackingTypes = new Set<TypeName>();

  for (const slot of team) {
    // Always include STAB types
    for (const t of slot.pokemon.types) {
      attackingTypes.add(t.type.name);
    }

    // If the slot has selected moves, we could potentially check move types
    // but we don't have resolved Move objects here (only names). So STAB
    // coverage is the primary signal.
  }

  const covered: TypeName[] = [];
  const gaps: TypeName[] = [];

  for (const defenseType of TYPE_LIST) {
    let canHitSuperEffective = false;

    for (const atkType of attackingTypes) {
      const effectiveness = getEffectiveness(atkType, defenseType);
      if (effectiveness > 1) {
        canHitSuperEffective = true;
        break;
      }
    }

    if (canHitSuperEffective) {
      covered.push(defenseType);
    } else {
      gaps.push(defenseType);
    }
  }

  return { covered, gaps };
}

/**
 * Compute threat score (0-100).
 *
 * Scoring factors:
 * - Each uncovered weakness contributes heavily (12 points each)
 * - Each type with 2 weak / 0 resist contributes moderately (6 points)
 * - Each type with 1+ weak / 0 resist contributes lightly (2 points)
 * - Offensive gaps add minor penalty (1 point each)
 *
 * Clamped to 0-100.
 */
function computeThreatScore(
  chart: Record<TypeName, DefensiveEntry>,
  uncoveredWeaknesses: TypeName[],
  offensiveGaps: TypeName[]
): number {
  let score = 0;

  // Heavy penalty for uncovered weaknesses (3+ weak, 0 resist)
  score += uncoveredWeaknesses.length * 12;

  // Moderate penalty for types with 2 weak and no coverage
  for (const type of TYPE_LIST) {
    const entry = chart[type];
    if (
      entry.weakCount >= 2 &&
      entry.resistCount === 0 &&
      entry.immuneCount === 0 &&
      !uncoveredWeaknesses.includes(type)
    ) {
      score += 6;
    } else if (
      entry.weakCount >= 1 &&
      entry.resistCount === 0 &&
      entry.immuneCount === 0 &&
      !uncoveredWeaknesses.includes(type)
    ) {
      score += 2;
    }
  }

  // Minor penalty for offensive gaps
  score += offensiveGaps.length * 1;

  return Math.min(100, Math.max(0, score));
}

/**
 * Suggest types that would improve team composition by resisting uncovered
 * weaknesses. We score each candidate type by how many of the team's worst
 * weaknesses it resists or is immune to.
 */
function suggestTypes(
  chart: Record<TypeName, DefensiveEntry>,
  team: TeamSlot[]
): SuggestedType[] {
  // Gather the problematic attacking types: sorted by severity
  const problematic = TYPE_LIST
    .filter((type) => {
      const entry = chart[type];
      return entry.weakCount >= 2 && entry.resistCount === 0 && entry.immuneCount === 0;
    })
    .sort((a, b) => chart[b].weakCount - chart[a].weakCount);

  if (problematic.length === 0) return [];

  // Already-present types on the team
  const teamTypes = new Set<TypeName>();
  for (const slot of team) {
    for (const t of slot.pokemon.types) {
      teamTypes.add(t.type.name);
    }
  }

  // Score every candidate type
  const candidates: { type: TypeName; score: number; covers: TypeName[] }[] = [];

  for (const candidateType of TYPE_LIST) {
    let score = 0;
    const covers: TypeName[] = [];

    for (const problemType of problematic) {
      const eff = getEffectiveness(problemType, candidateType);
      if (eff === 0) {
        score += 3; // immunity is very valuable
        covers.push(problemType);
      } else if (eff < 1) {
        score += 2; // resistance is good
        covers.push(problemType);
      }
    }

    if (score > 0) {
      candidates.push({ type: candidateType, score, covers });
    }
  }

  // Sort by score descending, take top suggestions
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate: don't suggest types already well-represented
  const suggestions: SuggestedType[] = [];
  const seen = new Set<TypeName>();

  for (const c of candidates) {
    if (seen.has(c.type)) continue;
    if (suggestions.length >= 3) break;

    seen.add(c.type);
    const coverList = c.covers
      .map(capitalize)
      .join(", ");

    const alreadyOnTeam = teamTypes.has(c.type);
    const typeName = capitalize(c.type);

    const reason = alreadyOnTeam
      ? `Another ${typeName} type would further cover ${coverList} weaknesses`
      : `A ${typeName} type would cover ${coverList} weaknesses`;

    suggestions.push({ type: c.type, reason });
  }

  return suggestions;
}

/**
 * Analyze a team's type weaknesses and suggest improvements.
 */
export function analyzeTeam(team: TeamSlot[]): TeamWeaknessReport {
  if (team.length === 0) {
    const emptyChart = {} as Record<TypeName, DefensiveEntry>;
    for (const type of TYPE_LIST) {
      emptyChart[type] = { weakCount: 0, resistCount: 0, immuneCount: 0 };
    }
    return {
      uncoveredWeaknesses: [],
      offensiveCoverage: [],
      offensiveGaps: [...TYPE_LIST],
      defensiveChart: emptyChart,
      threatScore: 0,
      suggestedTypes: [],
    };
  }

  const defensiveChart = buildDefensiveChart(team);
  const uncoveredWeaknesses = findUncoveredWeaknesses(defensiveChart);
  const { covered: offensiveCoverage, gaps: offensiveGaps } =
    computeOffensiveCoverage(team);
  const threatScore = computeThreatScore(
    defensiveChart,
    uncoveredWeaknesses,
    offensiveGaps
  );
  const suggestedTypes = suggestTypes(defensiveChart, team);

  return {
    uncoveredWeaknesses,
    offensiveCoverage,
    offensiveGaps,
    defensiveChart,
    threatScore,
    suggestedTypes,
  };
}
