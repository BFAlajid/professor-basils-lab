import { describe, it, expect } from "vitest";
import { POKEMON_IDS } from "../pokemonIds";

describe("POKEMON_IDS", () => {
  const entries = Object.entries(POKEMON_IDS);
  const ids = Object.values(POKEMON_IDS);

  it("contains exactly 151 entries", () => {
    expect(entries).toHaveLength(151);
  });

  it("all IDs are positive integers", () => {
    for (const [name, id] of entries) {
      expect(id, `${name} should be a positive integer`).toBeGreaterThan(0);
      expect(Number.isInteger(id), `${name} should be an integer`).toBe(true);
    }
  });

  it("IDs range from 1 to 151 with no gaps", () => {
    const sorted = [...ids].sort((a, b) => a - b);
    const expected = Array.from({ length: 151 }, (_, i) => i + 1);
    expect(sorted).toEqual(expected);
  });

  it("has no duplicate IDs", () => {
    const unique = new Set(ids);
    expect(unique.size).toBe(151);
  });

  it.each([
    ["bulbasaur", 1],
    ["pikachu", 25],
    ["mew", 151],
    ["mr-mime", 122],
    ["nidoran-f", 29],
    ["nidoran-m", 32],
    ["farfetchd", 83],
  ] as const)("%s maps to ID %d", (name, expectedId) => {
    expect(POKEMON_IDS[name]).toBe(expectedId);
  });
});
