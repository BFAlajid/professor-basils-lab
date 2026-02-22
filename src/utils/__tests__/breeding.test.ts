import { describe, it, expect, vi } from "vitest";
import { checkCompatibility, inheritIVs, inheritNature, createEgg } from "../breeding";
import { PCBoxPokemon, IVSpread } from "@/types";
import { mockCharizard, mockBlastoise } from "@/test/mocks/pokemon";

function createPCBoxPokemon(overrides: Partial<PCBoxPokemon> = {}): PCBoxPokemon {
  return {
    pokemon: mockCharizard,
    caughtWith: "poke-ball",
    caughtInArea: "Route 1",
    caughtDate: new Date().toISOString(),
    level: 50,
    nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
    ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
    ability: "blaze",
    ...overrides,
  };
}

describe("checkCompatibility", () => {
  it("allows breeding with shared egg group", () => {
    const result = checkCompatibility(["monster", "dragon"], ["monster", "water1"], false, false);
    expect(result.compatible).toBe(true);
  });

  it("rejects when no shared egg group", () => {
    const result = checkCompatibility(["mineral"], ["water1"], false, false);
    expect(result.compatible).toBe(false);
  });

  it("Ditto breeds with anything compatible", () => {
    const result = checkCompatibility(["ditto"], ["monster"], true, false);
    expect(result.compatible).toBe(true);
  });

  it("two Dittos cannot breed", () => {
    const result = checkCompatibility(["ditto"], ["ditto"], true, true);
    expect(result.compatible).toBe(false);
  });

  it("Undiscovered egg group cannot breed", () => {
    const result = checkCompatibility(["no-eggs"], ["monster"], false, false);
    expect(result.compatible).toBe(false);
  });

  it("Ditto + Undiscovered cannot breed", () => {
    const result = checkCompatibility(["ditto"], ["no-eggs"], true, false);
    expect(result.compatible).toBe(false);
  });
});

describe("inheritIVs", () => {
  it("inherits 3 IVs by default", () => {
    const p1 = createPCBoxPokemon();
    const p2 = createPCBoxPokemon({ pokemon: mockBlastoise });
    const inherited = inheritIVs(p1, p2, false);
    expect(inherited.length).toBe(3);
    inherited.forEach((iv) => {
      expect(["hp", "attack", "defense", "spAtk", "spDef", "speed"]).toContain(iv.stat);
      expect([1, 2]).toContain(iv.fromParent);
    });
  });

  it("inherits 5 IVs with Destiny Knot", () => {
    const p1 = createPCBoxPokemon();
    const p2 = createPCBoxPokemon({ pokemon: mockBlastoise });
    const inherited = inheritIVs(p1, p2, true);
    expect(inherited.length).toBe(5);
  });

  it("inherits unique stats (no duplicates)", () => {
    const p1 = createPCBoxPokemon();
    const p2 = createPCBoxPokemon();
    const inherited = inheritIVs(p1, p2, true);
    const stats = inherited.map((iv) => iv.stat);
    const unique = new Set(stats);
    expect(unique.size).toBe(stats.length);
  });
});

describe("inheritNature", () => {
  it("inherits from parent 1 with everstone", () => {
    const p1 = createPCBoxPokemon({ nature: { name: "jolly", increased: "speed", decreased: "spAtk" } });
    const p2 = createPCBoxPokemon({ nature: { name: "modest", increased: "spAtk", decreased: "attack" } });
    const result = inheritNature(p1, p2, 1);
    expect(result.nature.name).toBe("jolly");
    expect(result.from).toBe(1);
  });

  it("inherits from parent 2 with everstone", () => {
    const p1 = createPCBoxPokemon({ nature: { name: "jolly", increased: "speed", decreased: "spAtk" } });
    const p2 = createPCBoxPokemon({ nature: { name: "modest", increased: "spAtk", decreased: "attack" } });
    const result = inheritNature(p1, p2, 2);
    expect(result.nature.name).toBe("modest");
    expect(result.from).toBe(2);
  });

  it("gives random nature without everstone", () => {
    const p1 = createPCBoxPokemon();
    const p2 = createPCBoxPokemon();
    const result = inheritNature(p1, p2, null);
    expect(result.from).toBe("random");
    expect(result.nature).toBeDefined();
    expect(result.nature.name).toBeTruthy();
  });
});

describe("createEgg", () => {
  it("creates an egg with correct structure", () => {
    const p1 = createPCBoxPokemon();
    const p2 = createPCBoxPokemon({ pokemon: mockBlastoise });
    const egg = createEgg(p1, p2, 4, "charmander");

    expect(egg.id).toMatch(/^egg-/);
    expect(egg.speciesId).toBe(4);
    expect(egg.speciesName).toBe("charmander");
    expect(egg.stepsRequired).toBeGreaterThan(0);
    expect(egg.stepsCompleted).toBe(0);
    expect(egg.isHatched).toBe(false);
    expect(egg.hatchedPokemon).toBeNull();
    expect(egg.inheritedIVs.length).toBe(3); // no Destiny Knot
  });

  it("uses Destiny Knot for 5 IV inheritance", () => {
    const p1 = createPCBoxPokemon();
    const p2 = createPCBoxPokemon({ pokemon: mockBlastoise });
    const egg = createEgg(p1, p2, 4, "charmander", true);

    expect(egg.inheritedIVs.length).toBe(5);
  });
});
