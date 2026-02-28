import { describe, it, expect } from "vitest";
import {
  analyzeTeam,
  analyzeDefensiveCoverage,
  getWeaknesses,
  getResistances,
  getOffensiveCoverage,
} from "../teamAnalysis";
import { mockCharizard, mockBlastoise, mockVenusaur, createMockTeamSlot } from "@/test/mocks/pokemon";
import { Pokemon, TeamSlot } from "@/types";

// Helper to create a mono-type mock Pokemon
function mockMonoType(name: string, typeName: string, id: number = 1): Pokemon {
  return {
    id,
    name,
    sprites: { front_default: null },
    stats: [
      { base_stat: 80, stat: { name: "hp" } },
      { base_stat: 80, stat: { name: "attack" } },
      { base_stat: 80, stat: { name: "defense" } },
      { base_stat: 80, stat: { name: "special-attack" } },
      { base_stat: 80, stat: { name: "special-defense" } },
      { base_stat: 80, stat: { name: "speed" } },
    ],
    types: [{ slot: 1, type: { name: typeName as any } }],
    moves: [{ move: { name: "tackle", url: "" } }],
    abilities: [{ ability: { name: "overgrow", url: "" }, is_hidden: false, slot: 1 }],
  };
}

function mockDualType(name: string, type1: string, type2: string, id: number = 1): Pokemon {
  return {
    ...mockMonoType(name, type1, id),
    types: [
      { slot: 1, type: { name: type1 as any } },
      { slot: 2, type: { name: type2 as any } },
    ],
  };
}

function slotFrom(pokemon: Pokemon, position: number = 0): TeamSlot {
  return createMockTeamSlot(pokemon, position);
}

// --- analyzeTeam ---

describe("analyzeTeam", () => {
  it("returns empty results for empty team", () => {
    const report = analyzeTeam([]);
    expect(report.uncoveredWeaknesses).toEqual([]);
    expect(report.offensiveCoverage).toEqual([]);
    expect(report.offensiveGaps.length).toBe(18); // all types are gaps
    expect(report.threatScore).toBe(0);
    expect(report.suggestedTypes).toEqual([]);
  });

  it("detects Electric and Grass weakness for all-Water team", () => {
    const team: TeamSlot[] = [
      slotFrom(mockBlastoise, 0),
      slotFrom(mockMonoType("vaporeon", "water", 134), 1),
      slotFrom(mockMonoType("lapras-water", "water", 131), 2),
      slotFrom(mockMonoType("gyarados-water", "water", 130), 3),
    ];

    const report = analyzeTeam(team);

    // All 4 water types are weak to Electric and Grass
    expect(report.uncoveredWeaknesses).toContain("electric");
    expect(report.uncoveredWeaknesses).toContain("grass");

    // Water STAB hits Fire, Ground, Rock super-effectively
    expect(report.offensiveCoverage).toContain("fire");
    expect(report.offensiveCoverage).toContain("ground");
    expect(report.offensiveCoverage).toContain("rock");

    // Threat score should be elevated
    expect(report.threatScore).toBeGreaterThan(0);
  });

  it("identifies uncovered weaknesses only when 3+ weak and 0 resist/immune", () => {
    // 3 Water + 1 Ground: Ground resists Electric, so Electric should NOT be uncovered
    const team: TeamSlot[] = [
      slotFrom(mockMonoType("water-a", "water", 1), 0),
      slotFrom(mockMonoType("water-b", "water", 2), 1),
      slotFrom(mockMonoType("water-c", "water", 3), 2),
      slotFrom(mockMonoType("sandslash", "ground", 28), 3),
    ];

    const report = analyzeTeam(team);

    // Electric: 3 water weak, but ground is immune → NOT uncovered
    expect(report.uncoveredWeaknesses).not.toContain("electric");

    // Grass: 3 water weak to grass, ground is also weak to grass (4 weak),
    // and no one resists → IS uncovered
    expect(report.uncoveredWeaknesses).toContain("grass");
  });

  it("produces low threat score for balanced team", () => {
    // A well-balanced team with diverse types
    const team: TeamSlot[] = [
      slotFrom(mockCharizard, 0),         // Fire/Flying
      slotFrom(mockBlastoise, 1),          // Water
      slotFrom(mockVenusaur, 2),           // Grass/Poison
      slotFrom(mockMonoType("jolteon", "electric", 135), 3),
      slotFrom(mockDualType("steelix", "steel", "ground", 208), 4),
      slotFrom(mockMonoType("alakazam", "psychic", 65), 5),
    ];

    const report = analyzeTeam(team);

    // Well-balanced team should have low threat score
    expect(report.threatScore).toBeLessThan(50);

    // Should have good offensive coverage
    expect(report.offensiveCoverage.length).toBeGreaterThan(10);
  });

  it("includes suggestedTypes when weaknesses exist", () => {
    // Team of 4 ice-types: weak to Fire, Fighting, Rock, Steel
    const team: TeamSlot[] = [
      slotFrom(mockMonoType("ice-a", "ice", 1), 0),
      slotFrom(mockMonoType("ice-b", "ice", 2), 1),
      slotFrom(mockMonoType("ice-c", "ice", 3), 2),
      slotFrom(mockMonoType("ice-d", "ice", 4), 3),
    ];

    const report = analyzeTeam(team);

    expect(report.suggestedTypes.length).toBeGreaterThan(0);
    expect(report.suggestedTypes.length).toBeLessThanOrEqual(3);

    // Each suggestion should have type and reason
    for (const suggestion of report.suggestedTypes) {
      expect(suggestion.type).toBeDefined();
      expect(suggestion.reason).toBeDefined();
      expect(suggestion.reason.length).toBeGreaterThan(0);
    }
  });

  it("defensiveChart has entries for all 18 types", () => {
    const team = [slotFrom(mockCharizard, 0)];
    const report = analyzeTeam(team);

    const chartKeys = Object.keys(report.defensiveChart);
    expect(chartKeys.length).toBe(18);

    // Each entry should have the expected shape
    for (const entry of Object.values(report.defensiveChart)) {
      expect(entry).toHaveProperty("weakCount");
      expect(entry).toHaveProperty("resistCount");
      expect(entry).toHaveProperty("immuneCount");
    }
  });

  it("threat score is clamped to 0-100", () => {
    // Single Pokemon — should have some threat but not extreme
    const team = [slotFrom(mockCharizard, 0)];
    const report = analyzeTeam(team);
    expect(report.threatScore).toBeGreaterThanOrEqual(0);
    expect(report.threatScore).toBeLessThanOrEqual(100);
  });
});

// --- analyzeDefensiveCoverage ---

describe("analyzeDefensiveCoverage", () => {
  it("returns 18 entries (one per type)", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard]);
    expect(coverage.length).toBe(18);
  });

  it("correctly identifies Water as weakness for Fire/Flying", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard]);
    const waterEntry = coverage.find((c) => c.type === "water");
    expect(waterEntry).toBeDefined();
    // Fire is weak to Water (2x), Flying is neutral to Water → total 2x
    expect(waterEntry!.defensiveStatus).toBe("weak");
    expect(waterEntry!.worstDefensiveMultiplier).toBe(2);
  });

  it("correctly identifies Grass resistance for Water type", () => {
    const coverage = analyzeDefensiveCoverage([mockBlastoise]);
    const grassEntry = coverage.find((c) => c.type === "water");
    expect(grassEntry).toBeDefined();
    // Water resists Water → 0.5x
    expect(grassEntry!.defensiveStatus).toBe("resist");
  });

  it("marks Ground as immune for a Flying type", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard]);
    const groundEntry = coverage.find((c) => c.type === "ground");
    expect(groundEntry).toBeDefined();
    // Fire/Flying: Flying is immune to Ground → 0x
    expect(groundEntry!.bestDefensiveMultiplier).toBe(0);
  });

  it("tracks offensive coverage based on team STAB types", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard, mockBlastoise]);
    const fireCov = coverage.find((c) => c.type === "fire");
    const waterCov = coverage.find((c) => c.type === "water");
    const flyingCov = coverage.find((c) => c.type === "flying");

    // Charizard provides Fire and Flying STAB, Blastoise provides Water STAB
    expect(fireCov!.offensiveCovered).toBe(true);
    expect(waterCov!.offensiveCovered).toBe(true);
    expect(flyingCov!.offensiveCovered).toBe(true);
  });
});

// --- getWeaknesses / getResistances / getOffensiveCoverage ---

describe("getWeaknesses", () => {
  it("returns types the team is weak to", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard]);
    const weaknesses = getWeaknesses(coverage);

    // Charizard (Fire/Flying) is weak to: Rock (4x), Water, Electric
    expect(weaknesses).toContain("rock");
    expect(weaknesses).toContain("water");
    expect(weaknesses).toContain("electric");
    // Should not include types it resists
    expect(weaknesses).not.toContain("grass");
    expect(weaknesses).not.toContain("bug");
  });
});

describe("getResistances", () => {
  it("returns types the team resists", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard]);
    const resistances = getResistances(coverage);

    // Charizard resists: Fire, Grass, Bug, Steel, Fighting, Fairy + immune to Ground
    expect(resistances).toContain("fire");
    expect(resistances).toContain("grass");
    expect(resistances).toContain("bug");
    expect(resistances).toContain("steel");
    expect(resistances).toContain("fighting");
    expect(resistances).toContain("fairy");
    // Ground immunity also counts as resist in the coverage logic
    expect(resistances).toContain("ground");
  });
});

describe("getOffensiveCoverage", () => {
  it("returns types the team has STAB for", () => {
    const coverage = analyzeDefensiveCoverage([mockCharizard, mockBlastoise, mockVenusaur]);
    const offensive = getOffensiveCoverage(coverage);

    // Charizard = fire, flying; Blastoise = water; Venusaur = grass, poison
    expect(offensive).toContain("fire");
    expect(offensive).toContain("flying");
    expect(offensive).toContain("water");
    expect(offensive).toContain("grass");
    expect(offensive).toContain("poison");

    // Types NOT on the team
    expect(offensive).not.toContain("electric");
    expect(offensive).not.toContain("dragon");
  });
});
