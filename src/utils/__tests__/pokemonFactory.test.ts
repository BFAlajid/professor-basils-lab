import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/wildBattle", () => ({
  generateRandomIVs: vi.fn(() => ({
    hp: 15,
    attack: 20,
    defense: 10,
    spAtk: 25,
    spDef: 18,
    speed: 31,
  })),
}));

import { createPCBoxPokemon, CreatePCBoxPokemonOpts } from "../pokemonFactory";
import { NATURES } from "@/data/natures";

function makeFakePokemon(overrides: Record<string, unknown> = {}) {
  return {
    id: 25,
    name: "pikachu",
    types: [{ type: { name: "electric" } }],
    stats: [
      { base_stat: 35, stat: { name: "hp" } },
      { base_stat: 55, stat: { name: "attack" } },
    ],
    abilities: [
      { ability: { name: "static" }, is_hidden: false, slot: 1 },
      { ability: { name: "lightning-rod" }, is_hidden: true, slot: 3 },
    ],
    sprites: { front_default: "sprite.png" },
    moves: [],
    ...overrides,
  } as any;
}

describe("createPCBoxPokemon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Seed Math.random for deterministic nature selection
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a PCBoxPokemon with correct defaults", () => {
    const pokemon = makeFakePokemon();
    const result = createPCBoxPokemon({
      pokemon,
      caughtInArea: "Route 1",
      level: 5,
    });

    expect(result.pokemon).toBe(pokemon);
    expect(result.caughtWith).toBe("poke-ball");
    expect(result.caughtInArea).toBe("Route 1");
    expect(result.level).toBe(5);
    expect(result.nickname).toBeUndefined();
    expect(result.isShiny).toBeUndefined();
    expect(result.ability).toBe("static"); // roll=0 < 0.5 picks slot 1
    expect(result.gender).toBeDefined();
  });

  it("uses provided nickname", () => {
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      nickname: "Sparky",
      caughtInArea: "Viridian Forest",
      level: 10,
    });

    expect(result.nickname).toBe("Sparky");
  });

  it("uses provided ball type", () => {
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtWith: "ultra-ball",
      caughtInArea: "Safari Zone",
      level: 30,
    });

    expect(result.caughtWith).toBe("ultra-ball");
  });

  it("sets isShiny when provided", () => {
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
      isShiny: true,
    });

    expect(result.isShiny).toBe(true);
  });

  it("assigns a valid nature from the NATURES array", () => {
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
    });

    expect(NATURES).toContainEqual(result.nature);
  });

  it("assigns IVs from generateRandomIVs", () => {
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
    });

    expect(result.ivs).toEqual({
      hp: 15,
      attack: 20,
      defense: 10,
      spAtk: 25,
      spDef: 18,
      speed: 31,
    });
  });

  it("sets caughtDate to a valid ISO string", () => {
    const before = new Date().toISOString();
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
    });
    const after = new Date().toISOString();

    expect(result.caughtDate).toBeTruthy();
    expect(typeof result.caughtDate).toBe("string");
    // The date should be between before and after
    expect(result.caughtDate >= before).toBe(true);
    expect(result.caughtDate <= after).toBe(true);
  });

  it("handles pokemon with no abilities", () => {
    const pokemon = makeFakePokemon({ abilities: [] });
    const result = createPCBoxPokemon({
      pokemon,
      caughtInArea: "Route 1",
      level: 5,
    });

    expect(result.ability).toBe("unknown");
  });

  it("handles pokemon with undefined abilities", () => {
    const pokemon = makeFakePokemon({ abilities: undefined });
    const result = createPCBoxPokemon({
      pokemon,
      caughtInArea: "Route 1",
      level: 5,
    });

    expect(result.ability).toBe("unknown");
  });
});

describe("gender assignment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("assigns genderless when genderRate is -1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
      genderRate: -1,
    });
    expect(result.gender).toBe("genderless");
  });

  it("assigns male when genderRate is 0 (always male)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
      genderRate: 0,
    });
    expect(result.gender).toBe("male");
  });

  it("assigns female when genderRate is 8 (always female)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
      genderRate: 8,
    });
    expect(result.gender).toBe("female");
  });

  it("uses 50/50 default when genderRate is not provided", () => {
    // Math.random=0 => 0 < 0.5 (femaleChance for rate 4) => female
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
    });
    expect(result.gender).toBe("female");
  });

  it("assigns male with high random roll at default rate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const result = createPCBoxPokemon({
      pokemon: makeFakePokemon(),
      caughtInArea: "Route 1",
      level: 5,
    });
    expect(result.gender).toBe("male");
  });
});

describe("ability selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("picks first normal ability when roll < 0.5", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const pokemon = makeFakePokemon({
      abilities: [
        { ability: { name: "static" }, is_hidden: false, slot: 1 },
        { ability: { name: "lightning-rod" }, is_hidden: true, slot: 3 },
      ],
    });
    const result = createPCBoxPokemon({ pokemon, caughtInArea: "Route 1", level: 5 });
    expect(result.ability).toBe("static");
  });

  it("picks second normal ability when roll is 0.5-0.8 and two normal abilities exist", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    const pokemon = makeFakePokemon({
      abilities: [
        { ability: { name: "static" }, is_hidden: false, slot: 1 },
        { ability: { name: "surge-surfer" }, is_hidden: false, slot: 2 },
        { ability: { name: "lightning-rod" }, is_hidden: true, slot: 3 },
      ],
    });
    const result = createPCBoxPokemon({ pokemon, caughtInArea: "Route 1", level: 5 });
    expect(result.ability).toBe("surge-surfer");
  });

  it("picks hidden ability when roll >= 0.8 and hidden ability exists", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.85);
    const pokemon = makeFakePokemon({
      abilities: [
        { ability: { name: "static" }, is_hidden: false, slot: 1 },
        { ability: { name: "lightning-rod" }, is_hidden: true, slot: 3 },
      ],
    });
    const result = createPCBoxPokemon({ pokemon, caughtInArea: "Route 1", level: 5 });
    expect(result.ability).toBe("lightning-rod");
  });

  it("falls back to first ability when only one normal ability and no hidden", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    const pokemon = makeFakePokemon({
      abilities: [
        { ability: { name: "static" }, is_hidden: false, slot: 1 },
      ],
    });
    const result = createPCBoxPokemon({ pokemon, caughtInArea: "Route 1", level: 5 });
    expect(result.ability).toBe("static");
  });

  it("returns unknown for empty abilities array", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const pokemon = makeFakePokemon({ abilities: [] });
    const result = createPCBoxPokemon({ pokemon, caughtInArea: "Route 1", level: 5 });
    expect(result.ability).toBe("unknown");
  });
});
