import { describe, it, expect, vi, beforeEach } from "vitest";

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
      { ability: { name: "static" } },
      { ability: { name: "lightning-rod" } },
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
    expect(result.ability).toBe("static"); // first ability
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
