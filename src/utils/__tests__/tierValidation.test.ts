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
