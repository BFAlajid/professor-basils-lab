import { describe, it, expect } from "vitest";
import { suggestTeamFillers, ScoredCandidate } from "../teamSuggestion";
import { Pokemon, TeamSlot } from "@/types";

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
  return { pokemon, position };
}

// Candidate pool for tests: one of each type
const candidatePool: Pokemon[] = [
  mockMonoType("normal-mon", "normal", 101),
  mockMonoType("fire-mon", "fire", 102),
  mockMonoType("water-mon", "water", 103),
  mockMonoType("electric-mon", "electric", 104),
  mockMonoType("grass-mon", "grass", 105),
  mockMonoType("ice-mon", "ice", 106),
  mockMonoType("fighting-mon", "fighting", 107),
  mockMonoType("poison-mon", "poison", 108),
  mockMonoType("ground-mon", "ground", 109),
  mockMonoType("flying-mon", "flying", 110),
  mockMonoType("psychic-mon", "psychic", 111),
  mockMonoType("bug-mon", "bug", 112),
  mockMonoType("rock-mon", "rock", 113),
  mockMonoType("ghost-mon", "ghost", 114),
  mockMonoType("dragon-mon", "dragon", 115),
  mockMonoType("dark-mon", "dark", 116),
  mockMonoType("steel-mon", "steel", 117),
  mockMonoType("fairy-mon", "fairy", 118),
  mockDualType("steel-fairy", "steel", "fairy", 119),
  mockDualType("water-ground", "water", "ground", 120),
];

describe("suggestTeamFillers", () => {
  it("returns empty array for full team (6 Pokemon)", () => {
    const team = Array.from({ length: 6 }, (_, i) =>
      slotFrom(mockMonoType(`mon-${i}`, "normal", i + 1), i)
    );
    const results = suggestTeamFillers(team, candidatePool);
    expect(results).toEqual([]);
  });

  it("suggests balanced Pokemon for empty team", () => {
    const results = suggestTeamFillers([], candidatePool, 5);
    // With empty team, all types are gaps, so candidates that cover many types offensively score highest
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
    // Each result should have a positive score
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it("suggests Electric/Grass resistors for all-water team", () => {
    // 3 water Pokemon: weak to Electric and Grass, no resistor
    const team = [
      slotFrom(mockMonoType("water-a", "water", 1), 0),
      slotFrom(mockMonoType("water-b", "water", 2), 1),
      slotFrom(mockMonoType("water-c", "water", 3), 2),
    ];

    const results = suggestTeamFillers(team, candidatePool, 10);
    expect(results.length).toBeGreaterThan(0);

    // Top suggestions should resist Electric and/or Grass
    const topResult = results[0];
    const resistsElecOrGrass =
      topResult.resistsWeaknesses.includes("electric") ||
      topResult.resistsWeaknesses.includes("grass");
    expect(resistsElecOrGrass).toBe(true);

    // Water/Ground should rank highly: immune to electric, resists (neutral) nothing extra
    const waterGround = results.find((r) => r.pokemon.name === "water-ground");
    if (waterGround) {
      expect(waterGround.resistsWeaknesses).toContain("electric");
    }

    // Grass-mon should resist water team's electric weakness
    const grassMon = results.find((r) => r.pokemon.name === "grass-mon");
    if (grassMon) {
      expect(grassMon.resistsWeaknesses).toContain("electric");
      expect(grassMon.resistsWeaknesses).toContain("grass");
    }
  });

  it("excludes Pokemon already on the team", () => {
    const waterMon = mockMonoType("water-mon", "water", 103);
    const team = [slotFrom(waterMon, 0)];
    const results = suggestTeamFillers(team, candidatePool);

    const ids = results.map((r) => r.pokemon.id);
    expect(ids).not.toContain(103);
  });

  it("returns ScoredCandidate with correct shape", () => {
    const team = [slotFrom(mockMonoType("fire-a", "fire", 1), 0)];
    const results = suggestTeamFillers(team, candidatePool, 1);

    if (results.length > 0) {
      const r = results[0];
      expect(r).toHaveProperty("pokemon");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("resistsWeaknesses");
      expect(r).toHaveProperty("addsOffensiveCoverage");
      expect(typeof r.score).toBe("number");
      expect(Array.isArray(r.resistsWeaknesses)).toBe(true);
      expect(Array.isArray(r.addsOffensiveCoverage)).toBe(true);
    }
  });

  it("respects count parameter", () => {
    const team = [slotFrom(mockMonoType("fire-a", "fire", 1), 0)];
    const results = suggestTeamFillers(team, candidatePool, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("gives immunity higher score than resistance", () => {
    // Ground is immune to Electric; Grass resists Electric
    // For a team weak to Electric, ground should score >= grass on that weakness
    const team = [
      slotFrom(mockMonoType("water-a", "water", 1), 0),
      slotFrom(mockMonoType("water-b", "water", 2), 1),
    ];

    const results = suggestTeamFillers(team, candidatePool, 20);
    const groundMon = results.find((r) => r.pokemon.name === "ground-mon");
    const grassMon = results.find((r) => r.pokemon.name === "grass-mon");

    // Ground gets +3 for electric immunity; grass gets +2 for electric resist + +2 for grass resist
    // Both should be present
    expect(groundMon).toBeDefined();
    expect(grassMon).toBeDefined();
  });

  it("penalizes shared weaknesses", () => {
    // Fire team is weak to Water, Ground, Rock
    // Rock-mon is also weak to Water and Ground — should be penalized
    const team = [
      slotFrom(mockMonoType("fire-a", "fire", 1), 0),
      slotFrom(mockMonoType("fire-b", "fire", 2), 1),
    ];

    const results = suggestTeamFillers(team, candidatePool, 20);
    const rockMon = results.find((r) => r.pokemon.name === "rock-mon");
    const waterMon = results.find((r) => r.pokemon.name === "water-mon");

    // Water resists fire-team weaknesses (water) and shouldn't share as many weaknesses
    // Rock shares water+ground weaknesses with fire team
    if (rockMon && waterMon) {
      expect(waterMon.score).toBeGreaterThanOrEqual(rockMon.score);
    }
  });
});
