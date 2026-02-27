import { describe, it, expect, vi, afterEach } from "vitest";
import { BattleLogEntry, AltFormeData } from "@/types";
import {
  mockCharizard,
  mockBlastoise,
  createMockTeamSlot,
  createMockBattlePokemon,
  createMockBattleState,
} from "@/test/mocks/pokemon";

vi.mock("@/data/heldItems", () => ({
  getHeldItem: vi.fn(() => undefined),
  HELD_ITEMS: [],
}));

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn(() => null),
}));

vi.mock("@/data/maxMoves", () => ({
  getMaxMoveEffect: vi.fn(() => null),
}));

vi.mock("@/data/typeChart", () => ({
  getDefensiveMultiplier: vi.fn(() => 1),
}));

vi.mock("@/data/nfeList", () => ({
  isNFE: vi.fn(() => false),
}));

import {
  applyMegaEvolution,
  applyTerastallization,
  applyDynamax,
  endDynamax,
} from "../battleMechanics";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockMegaFormeData: AltFormeData = {
  name: "charizard-mega-x",
  types: [
    { slot: 1, type: { name: "fire" } },
    { slot: 2, type: { name: "dragon" } },
  ],
  stats: [
    { base_stat: 78, stat: { name: "hp" } },
    { base_stat: 130, stat: { name: "attack" } },
    { base_stat: 111, stat: { name: "defense" } },
    { base_stat: 130, stat: { name: "special-attack" } },
    { base_stat: 85, stat: { name: "special-defense" } },
    { base_stat: 100, stat: { name: "speed" } },
  ],
  ability: "tough-claws",
  spriteUrl: null,
};

// --- applyMegaEvolution ---

describe("applyMegaEvolution", () => {
  it("returns state unchanged when already mega evolved", () => {
    const state = createMockBattleState({
      p1Overrides: { hasMegaEvolved: true, megaFormeData: mockMegaFormeData },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("returns state unchanged when no megaFormeData", () => {
    const state = createMockBattleState();
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("returns state unchanged when mechanic is not mega", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData },
    });
    state.player1.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("returns state unchanged when mechanic is null", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData },
    });
    // selectedMechanic defaults to null
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);
    expect(result).toBe(state);
  });

  it("successfully mega evolves with correct flags", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);

    const active = result.player1.pokemon[0];
    expect(active.isMegaEvolved).toBe(true);
    expect(active.hasMegaEvolved).toBe(true);
    expect(active.activeStatOverride).toEqual({
      hp: 78,
      attack: 130,
      defense: 111,
      spAtk: 130,
      spDef: 85,
      speed: 100,
    });
  });

  it("logs mega evolution message", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    applyMegaEvolution(state, "player1", log);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("Mega Evolved");
    expect(log[0].message).toContain("charizard-mega-x");
    expect(log[0].kind).toBe("mega");
  });

  it("recalculates max HP based on mega forme stats", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData, currentHp: 300, maxHp: 300, originalMaxHp: 300 },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);
    const active = result.player1.pokemon[0];
    // The mega HP stat is 78, same as base charizard, so maxHp should be recalculated
    expect(active.maxHp).toBeGreaterThan(0);
    expect(active.currentHp).toBeGreaterThan(0);
    expect(active.originalMaxHp).toBe(300);
  });

  it("adjusts currentHp upward when mega gives more HP", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData, currentHp: 100, maxHp: 100, originalMaxHp: 100 },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player1", log);
    const active = result.player1.pokemon[0];
    // If new maxHp > old maxHp (100), currentHp should increase by the difference
    if (active.maxHp > 100) {
      expect(active.currentHp).toBe(100 + (active.maxHp - 100));
    } else {
      // If recalculated HP is <= 100 (e.g. same base HP), currentHp stays the same
      expect(active.currentHp).toBe(100);
    }
  });

  it("does not mutate original state", () => {
    const state = createMockBattleState({
      p1Overrides: { megaFormeData: mockMegaFormeData },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    applyMegaEvolution(state, "player1", log);
    expect(state.player1.pokemon[0].isMegaEvolved).toBe(false);
    expect(state.player1.pokemon[0].hasMegaEvolved).toBe(false);
  });

  it("works for player2", () => {
    const state = createMockBattleState({
      p2Overrides: { megaFormeData: mockMegaFormeData },
    });
    state.player2.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyMegaEvolution(state, "player2", log);
    expect(result.player2.pokemon[0].isMegaEvolved).toBe(true);
    expect(result.player1.pokemon[0].isMegaEvolved).toBe(false);
  });
});

// --- applyTerastallization ---

describe("applyTerastallization", () => {
  it("returns state unchanged when already terastallized", () => {
    const state = createMockBattleState({
      p1Overrides: { hasTerastallized: true, teraType: "fairy" },
    });
    state.player1.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    const result = applyTerastallization(state, "player1", log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("returns state unchanged when no teraType", () => {
    const state = createMockBattleState({
      p1Overrides: { teraType: null },
    });
    state.player1.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    const result = applyTerastallization(state, "player1", log);
    expect(result).toBe(state);
  });

  it("returns state unchanged when mechanic is not tera", () => {
    const state = createMockBattleState({
      p1Overrides: { teraType: "fairy" },
    });
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyTerastallization(state, "player1", log);
    expect(result).toBe(state);
  });

  it("returns state unchanged when mechanic is null", () => {
    const state = createMockBattleState({
      p1Overrides: { teraType: "fairy" },
    });
    const log: BattleLogEntry[] = [];
    const result = applyTerastallization(state, "player1", log);
    expect(result).toBe(state);
  });

  it("successfully terastallizes with correct flags", () => {
    const state = createMockBattleState({
      p1Overrides: { teraType: "fairy" },
    });
    state.player1.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    const result = applyTerastallization(state, "player1", log);
    const active = result.player1.pokemon[0];
    expect(active.isTerastallized).toBe(true);
    expect(active.hasTerastallized).toBe(true);
  });

  it("logs terastallization message with tera type", () => {
    const state = createMockBattleState({
      p1Overrides: { teraType: "fairy" },
    });
    state.player1.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    applyTerastallization(state, "player1", log);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("Terastallized");
    expect(log[0].message).toContain("fairy");
    expect(log[0].kind).toBe("tera");
  });

  it("does not mutate original state", () => {
    const state = createMockBattleState({
      p1Overrides: { teraType: "steel" },
    });
    state.player1.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    applyTerastallization(state, "player1", log);
    expect(state.player1.pokemon[0].isTerastallized).toBe(false);
    expect(state.player1.pokemon[0].hasTerastallized).toBe(false);
  });

  it("works for player2", () => {
    const state = createMockBattleState({
      p2Overrides: { teraType: "dragon" },
    });
    state.player2.selectedMechanic = "tera";
    const log: BattleLogEntry[] = [];
    const result = applyTerastallization(state, "player2", log);
    expect(result.player2.pokemon[0].isTerastallized).toBe(true);
    expect(result.player1.pokemon[0].isTerastallized).toBe(false);
  });
});

// --- applyDynamax ---

describe("applyDynamax", () => {
  it("returns state unchanged when already dynamaxed", () => {
    const state = createMockBattleState({
      p1Overrides: { hasDynamaxed: true },
    });
    state.player1.selectedMechanic = "dynamax";
    const log: BattleLogEntry[] = [];
    const result = applyDynamax(state, "player1", log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("returns state unchanged when mechanic is not dynamax", () => {
    const state = createMockBattleState();
    state.player1.selectedMechanic = "mega";
    const log: BattleLogEntry[] = [];
    const result = applyDynamax(state, "player1", log);
    expect(result).toBe(state);
  });

  it("returns state unchanged when mechanic is null", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyDynamax(state, "player1", log);
    expect(result).toBe(state);
  });

  it("successfully dynamaxes with doubled HP", () => {
    const state = createMockBattleState({
      p1Overrides: { currentHp: 200, maxHp: 200 },
    });
    state.player1.selectedMechanic = "dynamax";
    const log: BattleLogEntry[] = [];
    const result = applyDynamax(state, "player1", log);
    const active = result.player1.pokemon[0];
    expect(active.isDynamaxed).toBe(true);
    expect(active.hasDynamaxed).toBe(true);
    expect(active.maxHp).toBe(400);
    expect(active.currentHp).toBe(400);
    expect(active.dynamaxTurnsLeft).toBe(3);
  });

  it("doubles partial HP correctly", () => {
    const state = createMockBattleState({
      p1Overrides: { currentHp: 150, maxHp: 300 },
    });
    state.player1.selectedMechanic = "dynamax";
    const log: BattleLogEntry[] = [];
    const result = applyDynamax(state, "player1", log);
    const active = result.player1.pokemon[0];
    expect(active.maxHp).toBe(600);
    expect(active.currentHp).toBe(300);
  });

  it("logs dynamax message", () => {
    const state = createMockBattleState();
    state.player1.selectedMechanic = "dynamax";
    const log: BattleLogEntry[] = [];
    applyDynamax(state, "player1", log);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("Dynamaxed");
    expect(log[0].kind).toBe("dynamax");
  });

  it("does not mutate original state", () => {
    const state = createMockBattleState({
      p1Overrides: { currentHp: 200, maxHp: 200 },
    });
    state.player1.selectedMechanic = "dynamax";
    const log: BattleLogEntry[] = [];
    applyDynamax(state, "player1", log);
    expect(state.player1.pokemon[0].isDynamaxed).toBe(false);
    expect(state.player1.pokemon[0].maxHp).toBe(200);
  });

  it("works for player2", () => {
    const state = createMockBattleState({
      p2Overrides: { currentHp: 250, maxHp: 250 },
    });
    state.player2.selectedMechanic = "dynamax";
    const log: BattleLogEntry[] = [];
    const result = applyDynamax(state, "player2", log);
    expect(result.player2.pokemon[0].isDynamaxed).toBe(true);
    expect(result.player2.pokemon[0].maxHp).toBe(500);
    expect(result.player1.pokemon[0].isDynamaxed).toBe(false);
  });
});

// --- endDynamax ---

describe("endDynamax", () => {
  it("returns state unchanged when not dynamaxed", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = endDynamax(state, "player1", log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("halves HP and restores original maxHp on end", () => {
    const state = createMockBattleState({
      p1Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 0,
        currentHp: 400,
        maxHp: 400,
        originalMaxHp: 200,
      },
    });
    const log: BattleLogEntry[] = [];
    const result = endDynamax(state, "player1", log);
    const active = result.player1.pokemon[0];
    expect(active.isDynamaxed).toBe(false);
    expect(active.dynamaxTurnsLeft).toBe(0);
    expect(active.maxHp).toBe(200);
    expect(active.currentHp).toBe(200); // min(floor(400/2), 200) = 200
  });

  it("caps currentHp at originalMaxHp", () => {
    // Scenario: dynamaxed HP was somehow above 2x original (shouldn't happen but test the cap)
    const state = createMockBattleState({
      p1Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 1,
        currentHp: 600,
        maxHp: 600,
        originalMaxHp: 200,
      },
    });
    const log: BattleLogEntry[] = [];
    const result = endDynamax(state, "player1", log);
    // min(floor(600/2), 200) = min(300, 200) = 200
    expect(result.player1.pokemon[0].currentHp).toBe(200);
  });

  it("preserves at least 1 HP", () => {
    const state = createMockBattleState({
      p1Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 0,
        currentHp: 1,
        maxHp: 400,
        originalMaxHp: 200,
      },
    });
    const log: BattleLogEntry[] = [];
    const result = endDynamax(state, "player1", log);
    // floor(1/2) = 0, but clamped to max(1, 0) = 1
    expect(result.player1.pokemon[0].currentHp).toBe(1);
  });

  it("correctly halves partial HP", () => {
    const state = createMockBattleState({
      p1Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 0,
        currentHp: 100,
        maxHp: 400,
        originalMaxHp: 200,
      },
    });
    const log: BattleLogEntry[] = [];
    const result = endDynamax(state, "player1", log);
    // min(floor(100/2), 200) = min(50, 200) = 50, max(1, 50) = 50
    expect(result.player1.pokemon[0].currentHp).toBe(50);
  });

  it("logs end dynamax message", () => {
    const state = createMockBattleState({
      p1Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 0,
        currentHp: 400,
        maxHp: 400,
        originalMaxHp: 200,
      },
    });
    const log: BattleLogEntry[] = [];
    endDynamax(state, "player1", log);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("Dynamax ended");
    expect(log[0].kind).toBe("dynamax");
  });

  it("does not mutate original state", () => {
    const state = createMockBattleState({
      p1Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 1,
        currentHp: 400,
        maxHp: 400,
        originalMaxHp: 200,
      },
    });
    const log: BattleLogEntry[] = [];
    endDynamax(state, "player1", log);
    expect(state.player1.pokemon[0].isDynamaxed).toBe(true);
    expect(state.player1.pokemon[0].maxHp).toBe(400);
  });

  it("works for player2", () => {
    const state = createMockBattleState({
      p2Overrides: {
        isDynamaxed: true,
        dynamaxTurnsLeft: 0,
        currentHp: 500,
        maxHp: 500,
        originalMaxHp: 250,
      },
    });
    const log: BattleLogEntry[] = [];
    const result = endDynamax(state, "player2", log);
    expect(result.player2.pokemon[0].isDynamaxed).toBe(false);
    expect(result.player2.pokemon[0].maxHp).toBe(250);
    expect(result.player2.pokemon[0].currentHp).toBe(250);
  });
});
