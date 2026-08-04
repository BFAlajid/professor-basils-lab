import { vi } from "vitest";
import type { TeamSlot } from "@/types";
import { mockCharizard, mockBlastoise, mockVenusaur, createMockTeamSlot } from "@/test/mocks/pokemon";

vi.mock("@/data/tierLists", () => ({
  TIER_LISTS: [],
}));

import { validateTeam, TierViolation } from "../tierValidation";
import type { TierList } from "@/data/tierLists";

const testTier: TierList = {
  id: "test-ou",
  name: "Test OU",
  bannedPokemon: [150], // Mewtwo banned
  clauses: ["Species Clause", "Item Clause", "Sleep Clause"],
};

function makeSlot(pokemon: typeof mockCharizard, position: number, overrides?: Partial<TeamSlot>): TeamSlot {
  return { ...createMockTeamSlot(pokemon, position), ...overrides };
}

describe("validateTeam", () => {
  it("returns no violations for a clean team", () => {
    const team = [
      makeSlot(mockCharizard, 0),
      makeSlot(mockBlastoise, 1),
      makeSlot(mockVenusaur, 2),
    ];

    const violations = validateTeam(team, testTier);
    expect(violations).toEqual([]);
  });

  it("returns error for banned Pokemon", () => {
    const mewtwo = { ...mockCharizard, id: 150, name: "mewtwo" };
    const team = [makeSlot(mewtwo, 0)];

    const violations = validateTeam(team, testTier);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("error");
    expect(violations[0].message).toContain("banned");
    expect(violations[0].message).toContain("Mewtwo");
  });

  it("returns error for Species Clause (duplicate species)", () => {
    const team = [
      makeSlot(mockCharizard, 0),
      makeSlot(mockCharizard, 1),
    ];

    const violations = validateTeam(team, testTier);
    const speciesViolations = violations.filter((v) => v.message.includes("Species Clause"));
    expect(speciesViolations).toHaveLength(1);
    expect(speciesViolations[0].severity).toBe("error");
    expect(speciesViolations[0].position).toBe(1);
  });

  it("returns error for Item Clause (duplicate items)", () => {
    const team = [
      makeSlot(mockCharizard, 0, { heldItem: "life-orb" }),
      makeSlot(mockBlastoise, 1, { heldItem: "life-orb" }),
    ];

    const violations = validateTeam(team, testTier);
    const itemViolations = violations.filter((v) => v.message.includes("Item Clause"));
    expect(itemViolations).toHaveLength(1);
    expect(itemViolations[0].severity).toBe("error");
  });

  it("returns warning for Sleep Clause (2+ sleep move users)", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "spore"] }),
      makeSlot(mockBlastoise, 1, { selectedMoves: ["hydro-pump", "hypnosis"] }),
    ];

    const violations = validateTeam(team, testTier);
    const sleepViolations = violations.filter((v) => v.message.includes("Sleep Clause"));
    expect(sleepViolations.length).toBeGreaterThanOrEqual(2);
    expect(sleepViolations[0].severity).toBe("warning");
  });

  it("no item clause violation when items differ", () => {
    const team = [
      makeSlot(mockCharizard, 0, { heldItem: "life-orb" }),
      makeSlot(mockBlastoise, 1, { heldItem: "choice-scarf" }),
    ];

    const violations = validateTeam(team, testTier);
    const itemViolations = violations.filter((v) => v.message.includes("Item Clause"));
    expect(itemViolations).toHaveLength(0);
  });

  it("no species clause when tier does not include it", () => {
    const tierNoClause: TierList = { ...testTier, clauses: [] };
    const team = [
      makeSlot(mockCharizard, 0),
      makeSlot(mockCharizard, 1),
    ];

    const violations = validateTeam(team, tierNoClause);
    const speciesViolations = violations.filter((v) => v.message.includes("Species Clause"));
    expect(speciesViolations).toHaveLength(0);
  });
});

// --- Evasion Clause ---

describe("Evasion Clause", () => {
  const evasionTier: TierList = {
    id: "test-evasion",
    name: "Test Evasion",
    bannedPokemon: [],
    clauses: ["Evasion Clause"],
  };

  it("flags Double Team as a violation", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "double-team"] }),
    ];

    const violations = validateTeam(team, evasionTier);
    const evasion = violations.filter((v) => v.message.includes("Evasion Clause"));
    expect(evasion).toHaveLength(1);
    expect(evasion[0].severity).toBe("error");
    expect(evasion[0].message).toContain("Double Team");
    expect(evasion[0].position).toBe(0);
  });

  it("flags Minimize as a violation", () => {
    const team = [
      makeSlot(mockBlastoise, 0, { selectedMoves: ["hydro-pump", "minimize"] }),
    ];

    const violations = validateTeam(team, evasionTier);
    const evasion = violations.filter((v) => v.message.includes("Evasion Clause"));
    expect(evasion).toHaveLength(1);
    expect(evasion[0].severity).toBe("error");
    expect(evasion[0].message).toContain("Minimize");
  });

  it("passes when team has no evasion-boosting moves", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "air-slash"] }),
      makeSlot(mockBlastoise, 1, { selectedMoves: ["hydro-pump", "ice-beam"] }),
    ];

    const violations = validateTeam(team, evasionTier);
    const evasion = violations.filter((v) => v.message.includes("Evasion Clause"));
    expect(evasion).toHaveLength(0);
  });
});

// --- OHKO Clause ---

describe("OHKO Clause", () => {
  const ohkoTier: TierList = {
    id: "test-ohko",
    name: "Test OHKO",
    bannedPokemon: [],
    clauses: ["OHKO Clause"],
  };

  it("flags Fissure as a violation", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "fissure"] }),
    ];

    const violations = validateTeam(team, ohkoTier);
    const ohko = violations.filter((v) => v.message.includes("OHKO Clause"));
    expect(ohko).toHaveLength(1);
    expect(ohko[0].severity).toBe("error");
    expect(ohko[0].message).toContain("Fissure");
  });

  it("flags Sheer Cold as a violation", () => {
    const team = [
      makeSlot(mockBlastoise, 0, { selectedMoves: ["hydro-pump", "sheer-cold"] }),
    ];

    const violations = validateTeam(team, ohkoTier);
    const ohko = violations.filter((v) => v.message.includes("OHKO Clause"));
    expect(ohko).toHaveLength(1);
    expect(ohko[0].message).toContain("Sheer Cold");
  });

  it("flags Horn Drill as a violation", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["horn-drill"] }),
    ];

    const violations = validateTeam(team, ohkoTier);
    const ohko = violations.filter((v) => v.message.includes("OHKO Clause"));
    expect(ohko).toHaveLength(1);
    expect(ohko[0].message).toContain("Horn Drill");
  });

  it("flags Guillotine as a violation", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["guillotine"] }),
    ];

    const violations = validateTeam(team, ohkoTier);
    const ohko = violations.filter((v) => v.message.includes("OHKO Clause"));
    expect(ohko).toHaveLength(1);
    expect(ohko[0].message).toContain("Guillotine");
  });

  it("flags multiple OHKO moves on the same Pokemon individually", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["fissure", "sheer-cold"] }),
    ];

    const violations = validateTeam(team, ohkoTier);
    const ohko = violations.filter((v) => v.message.includes("OHKO Clause"));
    expect(ohko).toHaveLength(2);
  });
});

// --- Moody Clause ---

describe("Moody Clause", () => {
  const moodyTier: TierList = {
    id: "test-moody",
    name: "Test Moody",
    bannedPokemon: [],
    clauses: ["Moody Clause"],
  };

  it("flags a Pokemon with the Moody ability", () => {
    const team = [
      makeSlot(mockCharizard, 0, { ability: "moody" }),
    ];

    const violations = validateTeam(team, moodyTier);
    const moody = violations.filter((v) => v.message.includes("Moody Clause"));
    expect(moody).toHaveLength(1);
    expect(moody[0].severity).toBe("error");
    expect(moody[0].position).toBe(0);
  });

  it("passes when no Pokemon has Moody", () => {
    const team = [
      makeSlot(mockCharizard, 0, { ability: "blaze" }),
      makeSlot(mockBlastoise, 1, { ability: "torrent" }),
    ];

    const violations = validateTeam(team, moodyTier);
    const moody = violations.filter((v) => v.message.includes("Moody Clause"));
    expect(moody).toHaveLength(0);
  });

  it("does not flag Moody when the clause is absent from the tier", () => {
    const noMoodyClauseTier: TierList = {
      id: "test-no-moody",
      name: "Test No Moody Clause",
      bannedPokemon: [],
      clauses: [],
    };
    const team = [
      makeSlot(mockCharizard, 0, { ability: "moody" }),
    ];

    const violations = validateTeam(team, noMoodyClauseTier);
    const moody = violations.filter((v) => v.message.includes("Moody Clause"));
    expect(moody).toHaveLength(0);
  });
});

// --- Baton Pass Clause ---

describe("Baton Pass Clause", () => {
  const bpTier: TierList = {
    id: "test-bp",
    name: "Test BP",
    bannedPokemon: [],
    clauses: ["Baton Pass Clause"],
  };

  it("flags when 2+ Pokemon know Baton Pass", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "baton-pass"] }),
      makeSlot(mockBlastoise, 1, { selectedMoves: ["hydro-pump", "baton-pass"] }),
    ];

    const violations = validateTeam(team, bpTier);
    const bp = violations.filter((v) => v.message.includes("Baton Pass Clause"));
    expect(bp).toHaveLength(2);
    expect(bp[0].severity).toBe("error");
    expect(bp[0].position).toBe(0);
    expect(bp[1].position).toBe(1);
  });

  it("passes when only one Pokemon knows Baton Pass", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "baton-pass"] }),
      makeSlot(mockBlastoise, 1, { selectedMoves: ["hydro-pump", "ice-beam"] }),
    ];

    const violations = validateTeam(team, bpTier);
    const bp = violations.filter((v) => v.message.includes("Baton Pass Clause"));
    expect(bp).toHaveLength(0);
  });

  it("passes when no Pokemon knows Baton Pass", () => {
    const team = [
      makeSlot(mockCharizard, 0, { selectedMoves: ["flamethrower", "air-slash"] }),
      makeSlot(mockBlastoise, 1, { selectedMoves: ["hydro-pump", "ice-beam"] }),
    ];

    const violations = validateTeam(team, bpTier);
    const bp = violations.filter((v) => v.message.includes("Baton Pass Clause"));
    expect(bp).toHaveLength(0);
  });
});

// --- Monotype Clause ---

describe("Monotype Clause", () => {
  const monotypeTier: TierList = {
    id: "test-mono",
    name: "Monotype",
    bannedPokemon: [],
    clauses: [],
    monotype: true,
  };

  it("passes when all Pokemon share at least one type", () => {
    // Charizard: fire/flying, custom fire Pokemon
    const fireMon = {
      ...mockBlastoise,
      id: 99,
      name: "fire-mon",
      types: [
        { slot: 1, type: { name: "fire" } },
        { slot: 2, type: { name: "steel" } },
      ],
    };
    const team = [
      makeSlot(mockCharizard, 0), // fire/flying
      makeSlot(fireMon, 1),       // fire/steel
    ];

    const violations = validateTeam(team, monotypeTier);
    const mono = violations.filter((v) => v.message.includes("share at least one type"));
    expect(mono).toHaveLength(0);
  });

  it("fails when Pokemon have no shared type", () => {
    // Charizard: fire/flying, Blastoise: water
    const team = [
      makeSlot(mockCharizard, 0),
      makeSlot(mockBlastoise, 1),
    ];

    const violations = validateTeam(team, monotypeTier);
    const mono = violations.filter((v) => v.message.includes("share at least one type"));
    expect(mono).toHaveLength(1);
    expect(mono[0].severity).toBe("error");
  });

  it("does not check monotype when tier.monotype is false", () => {
    const normalTier: TierList = {
      id: "test-normal",
      name: "Test Normal",
      bannedPokemon: [],
      clauses: [],
    };
    const team = [
      makeSlot(mockCharizard, 0),
      makeSlot(mockBlastoise, 1),
    ];

    const violations = validateTeam(team, normalTier);
    const mono = violations.filter((v) => v.message.includes("share at least one type"));
    expect(mono).toHaveLength(0);
  });

  it("skips monotype check for a single Pokemon", () => {
    const team = [makeSlot(mockCharizard, 0)];

    const violations = validateTeam(team, monotypeTier);
    const mono = violations.filter((v) => v.message.includes("share at least one type"));
    expect(mono).toHaveLength(0);
  });
});

// --- Little Cup (LC) ---

describe("Little Cup (LC)", () => {
  const lcTier: TierList = {
    id: "test-lc",
    name: "LC",
    bannedPokemon: [],
    clauses: ["Species Clause", "Evasion Clause", "OHKO Clause"],
    levelCap: 5,
    nfeOnly: true,
    bannedMoves: ["dragon-rage", "sonic-boom"],
    bannedItems: ["berry-juice"],
    bannedAbilities: ["moody"],
  };

  // NFE Pokemon (id=1 Bulbasaur is in the NFE set)
  const bulbasaur = {
    ...mockVenusaur,
    id: 1,
    name: "bulbasaur",
  };

  it("passes for an NFE Pokemon", () => {
    const team = [makeSlot(bulbasaur, 0)];

    const violations = validateTeam(team, lcTier);
    const nfeViolations = violations.filter((v) => v.message.includes("not NFE"));
    expect(nfeViolations).toHaveLength(0);
  });

  it("fails for a fully evolved Pokemon (nfeOnly check)", () => {
    // Charizard id=6 is NOT in the NFE set
    const team = [makeSlot(mockCharizard, 0)];

    const violations = validateTeam(team, lcTier);
    const nfeViolations = violations.filter((v) => v.message.includes("not NFE"));
    expect(nfeViolations).toHaveLength(1);
    expect(nfeViolations[0].severity).toBe("error");
    expect(nfeViolations[0].message).toContain("Charizard");
  });

  it("fails for banned move Dragon Rage", () => {
    const team = [
      makeSlot(bulbasaur, 0, { selectedMoves: ["tackle", "dragon-rage"] }),
    ];

    const violations = validateTeam(team, lcTier);
    const moveViolations = violations.filter((v) => v.message.includes("Dragon Rage") && v.message.includes("banned"));
    expect(moveViolations).toHaveLength(1);
    expect(moveViolations[0].severity).toBe("error");
  });

  it("fails for banned move Sonic Boom", () => {
    const team = [
      makeSlot(bulbasaur, 0, { selectedMoves: ["tackle", "sonic-boom"] }),
    ];

    const violations = validateTeam(team, lcTier);
    const moveViolations = violations.filter((v) => v.message.includes("Sonic Boom") && v.message.includes("banned"));
    expect(moveViolations).toHaveLength(1);
    expect(moveViolations[0].severity).toBe("error");
  });

  it("fails for banned item Berry Juice", () => {
    const team = [
      makeSlot(bulbasaur, 0, { heldItem: "berry-juice" }),
    ];

    const violations = validateTeam(team, lcTier);
    const itemViolations = violations.filter((v) => v.message.includes("Berry Juice") && v.message.includes("banned"));
    expect(itemViolations).toHaveLength(1);
    expect(itemViolations[0].severity).toBe("error");
  });

  it("fails for banned ability Moody", () => {
    const team = [
      makeSlot(bulbasaur, 0, { ability: "moody" }),
    ];

    const violations = validateTeam(team, lcTier);
    const abilityViolations = violations.filter((v) => v.message.includes("Moody") && v.message.includes("banned"));
    expect(abilityViolations).toHaveLength(1);
    expect(abilityViolations[0].severity).toBe("error");
  });

  it("emits a level cap warning", () => {
    const team = [makeSlot(bulbasaur, 0)];

    const violations = validateTeam(team, lcTier);
    const capWarnings = violations.filter((v) => v.message.includes("level cap"));
    expect(capWarnings).toHaveLength(1);
    expect(capWarnings[0].severity).toBe("warning");
    expect(capWarnings[0].message).toContain("5");
  });
});

// --- Tier ban lists (cumulative bans) ---

describe("Tier ban lists", () => {
  it("flags a UU-banned Pokemon in UU", () => {
    // Aegislash (id=681) is banned in UU via UU_BANS
    const uuTier: TierList = {
      id: "test-uu",
      name: "UU",
      bannedPokemon: [150, 681], // OU_BANNED (150=Mewtwo) + UU_BANS (681=Aegislash)
      clauses: [],
    };
    const aegislash = {
      ...mockCharizard,
      id: 681,
      name: "aegislash",
      types: [
        { slot: 1, type: { name: "steel" } },
        { slot: 2, type: { name: "ghost" } },
      ],
    };
    const team = [makeSlot(aegislash, 0)];

    const violations = validateTeam(team, uuTier);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("error");
    expect(violations[0].message).toContain("banned");
    expect(violations[0].message).toContain("Aegislash");
  });

  it("OU-banned Pokemon are also banned in UU (cumulative)", () => {
    // Mewtwo (id=150) is in OU_BANNED, so UU_BANNED includes it
    const uuTier: TierList = {
      id: "test-uu",
      name: "UU",
      bannedPokemon: [150, 681],
      clauses: [],
    };
    const mewtwo = { ...mockCharizard, id: 150, name: "mewtwo" };
    const team = [makeSlot(mewtwo, 0)];

    const violations = validateTeam(team, uuTier);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("error");
    expect(violations[0].message).toContain("banned");
    expect(violations[0].message).toContain("Mewtwo");
  });

  it("allows a Pokemon that is banned in UU but legal in OU", () => {
    const ouTier: TierList = {
      id: "test-ou",
      name: "OU",
      bannedPokemon: [150], // Only Ubers-level bans
      clauses: [],
    };
    const aegislash = {
      ...mockCharizard,
      id: 681,
      name: "aegislash",
      types: [
        { slot: 1, type: { name: "steel" } },
        { slot: 2, type: { name: "ghost" } },
      ],
    };
    const team = [makeSlot(aegislash, 0)];

    const violations = validateTeam(team, ouTier);
    expect(violations).toHaveLength(0);
  });
});
