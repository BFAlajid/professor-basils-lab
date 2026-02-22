import { describe, it, expect } from "vitest";
import { exportToShowdown } from "../showdownFormat";
import { TeamSlot } from "@/types";
import { mockCharizard, createMockTeamSlot } from "@/test/mocks/pokemon";

describe("exportToShowdown", () => {
  it("exports a basic team slot", () => {
    const slot = createMockTeamSlot(mockCharizard, 0);
    const result = exportToShowdown([slot]);

    expect(result).toContain("Charizard");
    expect(result).toContain("Ability: Blaze");
    expect(result).toContain("Adamant Nature");
    expect(result).toContain("- Flamethrower");
    expect(result).toContain("- Air Slash");
  });

  it("exports EVs correctly", () => {
    const slot = createMockTeamSlot(mockCharizard, 0);
    slot.evs = { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 };
    const result = exportToShowdown([slot]);

    expect(result).toContain("EVs:");
    expect(result).toContain("252 Atk");
    expect(result).toContain("252 Spe");
    expect(result).toContain("4 SpD");
    // Should NOT contain 0 values
    expect(result).not.toContain("0 HP");
  });

  it("skips IVs when all are 31", () => {
    const slot = createMockTeamSlot(mockCharizard, 0);
    slot.ivs = { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 };
    const result = exportToShowdown([slot]);

    expect(result).not.toContain("IVs:");
  });

  it("includes IVs when non-max", () => {
    const slot = createMockTeamSlot(mockCharizard, 0);
    slot.ivs = { hp: 31, attack: 0, defense: 31, spAtk: 31, spDef: 31, speed: 31 };
    const result = exportToShowdown([slot]);

    expect(result).toContain("IVs:");
    expect(result).toContain("0 Atk");
  });

  it("includes held item", () => {
    const slot = createMockTeamSlot(mockCharizard, 0);
    slot.heldItem = "life-orb";
    const result = exportToShowdown([slot]);

    expect(result).toContain("Charizard @ Life Orb");
  });

  it("includes Tera type", () => {
    const slot = createMockTeamSlot(mockCharizard, 0);
    slot.teraConfig = { teraType: "steel" };
    const result = exportToShowdown([slot]);

    expect(result).toContain("Tera Type: Steel");
  });

  it("exports multiple team members separated by blank line", () => {
    const slot1 = createMockTeamSlot(mockCharizard, 0);
    const slot2 = createMockTeamSlot(mockCharizard, 1);
    slot2.pokemon = { ...mockCharizard, name: "blastoise" };
    const result = exportToShowdown([slot1, slot2]);

    expect(result).toContain("Charizard");
    expect(result).toContain("Blastoise");
    expect(result.split("\n\n").length).toBe(2);
  });

  it("handles empty team", () => {
    const result = exportToShowdown([]);
    expect(result).toBe("");
  });
});
