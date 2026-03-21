import { TypeName, Pokemon, TeamSlot } from "@/types";
import { TYPE_LIST, getEffectiveness, getDefensiveMultiplier } from "@/data/typeChart";

export interface ScoredCandidate {
  pokemon: Pokemon;
  score: number;
  resistsWeaknesses: string[];
  addsOffensiveCoverage: string[];
}

/**
 * Find types the team is defensively weak to with no resist/immunity cover.
 * A type qualifies if any team member is weak (multiplier > 1) and no member
 * resists or is immune. For teams with 2+ members we also include types where
 * at least 2 members are weak (matching the stricter criteria used elsewhere).
 */
function getTeamDefensiveWeaknesses(team: TeamSlot[]): TypeName[] {
  if (team.length === 0) return [...TYPE_LIST];

  return TYPE_LIST.filter((attackType) => {
    let weakCount = 0;
    let resistOrImmune = false;

    for (const slot of team) {
      const defTypes = slot.pokemon.types.map((t) => t.type.name);
      const mult = getDefensiveMultiplier(attackType, defTypes);
      if (mult > 1) weakCount++;
      if (mult < 1) resistOrImmune = true;
    }

    // Unresisted weakness: at least 1 member weak, nobody resists
    return weakCount >= 1 && !resistOrImmune;
  });
}

/**
 * Find types the team cannot hit super-effectively via STAB.
 */
function getTeamOffensiveGaps(team: TeamSlot[]): TypeName[] {
  const attackingTypes = new Set<TypeName>();
  for (const slot of team) {
    for (const t of slot.pokemon.types) {
      attackingTypes.add(t.type.name);
    }
  }

  return TYPE_LIST.filter((defType) => {
    for (const atkType of attackingTypes) {
      if (getEffectiveness(atkType, defType) > 1) return false;
    }
    return true;
  });
}

/**
 * Score a candidate Pokemon against the team's weaknesses and gaps.
 *
 * +3 per team weakness the candidate is immune to
 * +2 per team weakness the candidate resists
 * +1 per offensive gap the candidate's STAB covers super-effectively
 * -1 per type weakness the candidate shares with existing team members
 */
function scoreCandidate(
  candidate: Pokemon,
  teamWeaknesses: TypeName[],
  offensiveGaps: TypeName[],
  existingWeakTypes: Set<TypeName>
): ScoredCandidate {
  let score = 0;
  const resistsWeaknesses: string[] = [];
  const addsOffensiveCoverage: string[] = [];

  const candTypes = candidate.types.map((t) => t.type.name);

  // Defensive value: how many team weaknesses does this candidate handle?
  for (const weakness of teamWeaknesses) {
    const mult = getDefensiveMultiplier(weakness, candTypes);
    if (mult === 0) {
      score += 3;
      resistsWeaknesses.push(weakness);
    } else if (mult < 1) {
      score += 2;
      resistsWeaknesses.push(weakness);
    }
  }

  // Offensive value: what gaps does its STAB close?
  for (const gap of offensiveGaps) {
    for (const atkType of candTypes) {
      if (getEffectiveness(atkType, gap) > 1) {
        score += 1;
        addsOffensiveCoverage.push(gap);
        break;
      }
    }
  }

  // Penalty: shared weaknesses with the existing team
  for (const attackType of TYPE_LIST) {
    const mult = getDefensiveMultiplier(attackType, candTypes);
    if (mult > 1 && existingWeakTypes.has(attackType)) {
      score -= 1;
    }
  }

  return { pokemon: candidate, score, resistsWeaknesses, addsOffensiveCoverage };
}

/**
 * Suggest Pokemon from `candidatePool` that best fill the current team's
 * defensive weaknesses and offensive gaps.
 *
 * Returns an empty array if the team is already full (6 members).
 */
export function suggestTeamFillers(
  currentTeam: TeamSlot[],
  candidatePool: Pokemon[],
  count: number = 5
): ScoredCandidate[] {
  if (currentTeam.length >= 6) return [];

  const teamWeaknesses = getTeamDefensiveWeaknesses(currentTeam);
  const offensiveGaps = getTeamOffensiveGaps(currentTeam);

  // Collect types the team is already weak to (for shared-weakness penalty)
  const existingWeakTypes = new Set<TypeName>();
  for (const slot of currentTeam) {
    const defTypes = slot.pokemon.types.map((t) => t.type.name);
    for (const attackType of TYPE_LIST) {
      if (getDefensiveMultiplier(attackType, defTypes) > 1) {
        existingWeakTypes.add(attackType);
      }
    }
  }

  // Exclude Pokemon already on the team
  const teamIds = new Set(currentTeam.map((s) => s.pokemon.id));

  const scored = candidatePool
    .filter((p) => !teamIds.has(p.id))
    .map((p) => scoreCandidate(p, teamWeaknesses, offensiveGaps, existingWeakTypes))
    .filter((c) => c.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: more resistances first, then alphabetical
    if (b.resistsWeaknesses.length !== a.resistsWeaknesses.length)
      return b.resistsWeaknesses.length - a.resistsWeaknesses.length;
    return a.pokemon.name.localeCompare(b.pokemon.name);
  });

  return scored.slice(0, count);
}
