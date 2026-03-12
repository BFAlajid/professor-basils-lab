import { describe, it, expect } from "vitest";
import {
  applyFilters,
  DEFAULT_FILTER_CONFIG,
  PokemonBaseData,
  PokedexFilterConfig,
} from "../pokedexFilterEngine";

// --- Sample data ---

function makePokemon(overrides: Partial<PokemonBaseData>): PokemonBaseData {
  return {
    id: 1,
    name: "bulbasaur",
    types: ["grass", "poison"],
    abilities: ["overgrow", "chlorophyll"],
    stats: { hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45 },
    bst: 318,
    ...overrides,
  };
}

const SAMPLE_DATA: PokemonBaseData[] = [
  makePokemon({ id: 1, name: "bulbasaur", types: ["grass", "poison"], bst: 318 }),
  makePokemon({ id: 4, name: "charmander", types: ["fire"], abilities: ["blaze", "solar-power"], bst: 309, stats: { hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65 } }),
  makePokemon({ id: 7, name: "squirtle", types: ["water"], abilities: ["torrent", "rain-dish"], bst: 314, stats: { hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43 } }),
  makePokemon({ id: 25, name: "pikachu", types: ["electric"], abilities: ["static", "lightning-rod"], bst: 320, stats: { hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90 } }),
  makePokemon({ id: 150, name: "mewtwo", types: ["psychic"], abilities: ["pressure", "unnerve"], bst: 680, stats: { hp: 106, attack: 110, defense: 90, spAttack: 154, spDefense: 90, speed: 130 } }),
  makePokemon({ id: 252, name: "treecko", types: ["grass"], abilities: ["overgrow", "unburden"], bst: 310, stats: { hp: 40, attack: 45, defense: 35, spAttack: 65, spDefense: 55, speed: 70 } }),
];

const dataMap = new Map(SAMPLE_DATA.map((p) => [p.id, p]));
const allIds = SAMPLE_DATA.map((p) => p.id);

function filter(overrides: Partial<PokedexFilterConfig> = {}): number[] {
  return applyFilters(allIds, { ...DEFAULT_FILTER_CONFIG, ...overrides }, dataMap);
}

describe("applyFilters", () => {
  it("returns all when no filters applied", () => {
    const result = filter();
    expect(result).toEqual([1, 4, 7, 25, 150, 252]);
  });

  it("filters by primary type", () => {
    const result = filter({ typeFilter: "grass" });
    expect(result).toEqual([1, 252]);
  });

  it("filters by type that matches no pokemon", () => {
    const result = filter({ typeFilter: "dragon" });
    expect(result).toEqual([]);
  });

  it("filters by dual type (requires both types)", () => {
    const result = filter({ typeFilter: "grass", dualTypeFilter: "poison" });
    expect(result).toEqual([1]); // bulbasaur is grass/poison
  });

  it("dual type filter requires primary type filter", () => {
    // If typeFilter is null but dualTypeFilter is set, everything is filtered out
    const result = filter({ typeFilter: null, dualTypeFilter: "poison" });
    expect(result).toEqual([]);
  });

  it("filters by generation range", () => {
    const result = filter({ generationRange: { start: 1, end: 151 } });
    expect(result).toEqual([1, 4, 7, 25, 150]);
  });

  it("filters by generation range (gen 3 only)", () => {
    const result = filter({ generationRange: { start: 252, end: 386 } });
    expect(result).toEqual([252]);
  });

  it("filters by minimum BST", () => {
    const result = filter({ minBST: 315 });
    expect(result).toEqual([1, 25, 150]);
  });

  it("filters by maximum BST", () => {
    const result = filter({ maxBST: 315 });
    expect(result).toEqual([4, 7, 252]);
  });

  it("filters by BST range", () => {
    const result = filter({ minBST: 310, maxBST: 320 });
    expect(result).toEqual([1, 7, 25, 252]);
  });

  it("filters by stat threshold (speed >= 70)", () => {
    const result = filter({ statThresholds: { speed: 70 } });
    expect(result).toEqual([25, 150, 252]);
  });

  it("filters by multiple stat thresholds", () => {
    const result = filter({ statThresholds: { speed: 70, spAttack: 100 } });
    expect(result).toEqual([150]); // only mewtwo has both
  });

  it("filters by ability search (case insensitive)", () => {
    const result = filter({ abilitySearch: "OVERGROW" });
    expect(result).toEqual([1, 252]);
  });

  it("filters by partial ability name", () => {
    const result = filter({ abilitySearch: "static" });
    expect(result).toEqual([25]);
  });

  it("combines multiple filters", () => {
    const result = filter({
      typeFilter: "grass",
      minBST: 315,
    });
    expect(result).toEqual([1]); // only bulbasaur is grass with BST >= 315
  });

  it("sorts by name ascending", () => {
    const result = filter({ sortBy: "name", sortDirection: "asc" });
    expect(result).toEqual([1, 4, 150, 25, 7, 252]);
  });

  it("sorts by name descending", () => {
    const result = filter({ sortBy: "name", sortDirection: "desc" });
    expect(result).toEqual([252, 7, 25, 150, 4, 1]);
  });

  it("sorts by BST ascending", () => {
    const result = filter({ sortBy: "bst", sortDirection: "asc" });
    expect(result).toEqual([4, 252, 7, 1, 25, 150]);
  });

  it("sorts by BST descending", () => {
    const result = filter({ sortBy: "bst", sortDirection: "desc" });
    expect(result).toEqual([150, 25, 1, 7, 252, 4]);
  });

  it("sorts by dex number descending", () => {
    const result = filter({ sortBy: "dex", sortDirection: "desc" });
    expect(result).toEqual([252, 150, 25, 7, 4, 1]);
  });

  it("skips IDs not in the data map", () => {
    const result = applyFilters(
      [1, 999, 4],
      DEFAULT_FILTER_CONFIG,
      dataMap
    );
    expect(result).toEqual([1, 4]); // 999 is not in map, filtered out
  });
});
