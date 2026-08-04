import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockBlastoise,
  mockCharizard,
  mockVenusaur,
} from "@/test/mocks/pokemon";
import { Pokemon, BattleLogEntry, BattlePokemon, BattleState, TypeName } from "@/types";

// --- Mocks ---

vi.mock("@/data/heldItems", () => ({
  getHeldItem: vi.fn(() => null),
}));

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn(() => null),
}));

vi.mock("@/data/typeChart", () => ({
  getDefensiveMultiplier: vi.fn(() => 1),
}));

import { applyEndOfTurnEffects } from "../battleEffects";
import { getAbilityHooks } from "@/data/abilities";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { getHeldItem } from "@/data/heldItems";

// --- Helpers ---

function mockMonoType(name: string, typeName: TypeName): Pokemon {
  return {
    id: 1,
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
    types: [{ slot: 1, type: { name: typeName } }],
    moves: [{ move: { name: "tackle", url: "" } }],
    abilities: [{ ability: { name: "pressure", url: "" }, is_hidden: false, slot: 1 }],
  };
}

/**
 * Build a BattleState with player1 active (configurable) and player2 fainted (skipped).
 * Mirrors the stateForEOT helper in battleEffects.test.ts.
 */
function stateForEOT(
  p1Overrides?: Partial<BattlePokemon>,
  fieldOverrides?: Partial<BattleState["field"]>,
  pokemon?: Pokemon,
): { state: BattleState; log: BattleLogEntry[] } {
  const pkmn = pokemon ?? mockBlastoise;
  const slot = createMockTeamSlot(pkmn);
  if (p1Overrides?.slot) Object.assign(slot, p1Overrides.slot);
  const bp = createMockBattlePokemon(slot, p1Overrides);
  const state: BattleState = {
    ...createMockBattleState(),
    player1: { pokemon: [bp], activePokemonIndex: 0, selectedMechanic: null },
    player2: {
      pokemon: [createMockBattlePokemon(createMockTeamSlot(mockCharizard), { isFainted: true })],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    field: {
      weather: null, weatherTurnsLeft: 0, terrain: null, terrainTurnsLeft: 0,
      player1Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
      player2Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
      ...fieldOverrides,
    },
  };
  return { state, log: [] };
}

/**
 * Build a BattleState with both players active (needed for Leech Seed cross-side healing).
 */
function stateWithBothActive(
  p1Overrides?: Partial<BattlePokemon>,
  p2Overrides?: Partial<BattlePokemon>,
  p1Pokemon?: Pokemon,
  p2Pokemon?: Pokemon,
): { state: BattleState; log: BattleLogEntry[] } {
  const pkmn1 = p1Pokemon ?? mockBlastoise;
  const slot1 = createMockTeamSlot(pkmn1);
  if (p1Overrides?.slot) Object.assign(slot1, p1Overrides.slot);
  const bp1 = createMockBattlePokemon(slot1, p1Overrides);

  const pkmn2 = p2Pokemon ?? mockCharizard;
  const slot2 = createMockTeamSlot(pkmn2);
  if (p2Overrides?.slot) Object.assign(slot2, p2Overrides.slot);
  const bp2 = createMockBattlePokemon(slot2, p2Overrides);

  const state: BattleState = {
    ...createMockBattleState(),
    player1: { pokemon: [bp1], activePokemonIndex: 0, selectedMechanic: null },
    player2: { pokemon: [bp2], activePokemonIndex: 0, selectedMechanic: null },
    field: {
      weather: null, weatherTurnsLeft: 0, terrain: null, terrainTurnsLeft: 0,
      player1Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
      player2Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 },
    },
  };
  return { state, log: [] };
}

beforeEach(() => {
  vi.mocked(getAbilityHooks).mockReturnValue(null);
  vi.mocked(getDefensiveMultiplier).mockReturnValue(1);
  vi.mocked(getHeldItem).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ========== Volatile Status: Leech Seed ==========

describe("Leech Seed", () => {
  it("drains 1/8 max HP from seeded Pokemon each turn", () => {
    const { state, log } = stateForEOT({
      isSeeded: true,
      seededBy: "player2",
      currentHp: 300,
    });
    const result = applyEndOfTurnEffects(state, log);
    const expectedDrain = Math.max(1, Math.floor(300 / 8)); // 37
    expect(result.player1.pokemon[0].currentHp).toBe(300 - expectedDrain);
  });

  it("heals the seeder's active Pokemon by the same drain amount", () => {
    const { state, log } = stateWithBothActive(
      { isSeeded: true, seededBy: "player2", currentHp: 300 },
      { currentHp: 200 },
    );
    const result = applyEndOfTurnEffects(state, log);
    const expectedDrain = Math.max(1, Math.floor(300 / 8)); // 37
    expect(result.player2.pokemon[0].currentHp).toBe(200 + expectedDrain);
  });

  it("does not heal seeder beyond max HP", () => {
    const { state, log } = stateWithBothActive(
      { isSeeded: true, seededBy: "player2", currentHp: 300 },
      { currentHp: 290 }, // only 10 HP missing
    );
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player2.pokemon[0].currentHp).toBe(300); // capped at maxHp
  });

  it("does not affect Grass-type Pokemon", () => {
    // Venusaur is grass/poison
    const { state, log } = stateForEOT(
      { isSeeded: true, seededBy: "player2", currentHp: 300 },
      undefined,
      mockVenusaur,
    );
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
    expect(log.every((l) => !l.message.includes("drained"))).toBe(true);
  });

  it("can cause the seeded Pokemon to faint", () => {
    const { state, log } = stateForEOT({
      isSeeded: true,
      seededBy: "player2",
      currentHp: 1,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint")).toBe(true);
  });

  it("does not drain from fainted Pokemon", () => {
    const { state, log } = stateForEOT({
      isSeeded: true,
      seededBy: "player2",
      isFainted: true,
      currentHp: 0,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(log.every((l) => !l.message.includes("drained"))).toBe(true);
  });

  it("logs drain message", () => {
    const { state, log } = stateForEOT({
      isSeeded: true,
      seededBy: "player2",
      currentHp: 300,
    });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.kind === "damage" && l.message.includes("energy drained"))).toBe(true);
  });
});

// ========== Volatile Status: Binding ==========

describe("Binding", () => {
  it("deals 1/8 max HP per turn while bound", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 4,
      bindingMove: "wrap",
      boundBy: "player2",
      currentHp: 300,
    });
    const result = applyEndOfTurnEffects(state, log);
    const expectedDmg = Math.max(1, Math.floor(300 / 8)); // 37
    expect(result.player1.pokemon[0].currentHp).toBe(300 - expectedDmg);
  });

  it("decrements binding turn counter each turn", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 4,
      bindingMove: "wrap",
      boundBy: "player2",
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].bindingTurns).toBe(3);
  });

  it("clears binding state when turns reach 0", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 1,
      bindingMove: "fire-spin",
      boundBy: "player2",
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].bindingTurns).toBe(0);
    expect(result.player1.pokemon[0].bindingMove).toBeNull();
    expect(result.player1.pokemon[0].boundBy).toBeNull();
  });

  it("logs freed message when binding expires", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 1,
      bindingMove: "fire-spin",
      boundBy: "player2",
    });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.kind === "info" && l.message.includes("freed"))).toBe(true);
  });

  it("can cause faint from binding damage", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 3,
      bindingMove: "whirlpool",
      boundBy: "player2",
      currentHp: 1,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint")).toBe(true);
  });

  it("does not deal damage when bindingTurns is 0", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 0,
      bindingMove: null,
      boundBy: null,
      currentHp: 300,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
  });

  it("uses bindingMove name in the log message", () => {
    const { state, log } = stateForEOT({
      bindingTurns: 3,
      bindingMove: "magma-storm",
      boundBy: "player2",
    });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.message.includes("magma-storm"))).toBe(true);
  });
});

// ========== Volatile Status: Taunt ==========

describe("Taunt", () => {
  it("decrements taunted counter each turn", () => {
    const { state, log } = stateForEOT({ taunted: 3 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].taunted).toBe(2);
  });

  it("wears off after reaching 0", () => {
    const { state, log } = stateForEOT({ taunted: 1 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].taunted).toBe(0);
    expect(log.some((l) => l.kind === "info" && l.message.includes("taunt wore off"))).toBe(true);
  });

  it("does not log wore-off message while turns remain", () => {
    const { state, log } = stateForEOT({ taunted: 2 });
    applyEndOfTurnEffects(state, log);
    expect(log.every((l) => !l.message.includes("taunt wore off"))).toBe(true);
  });

  it("has no effect when taunted is already 0", () => {
    const { state, log } = stateForEOT({ taunted: 0 });
    const initialLogLength = log.length;
    applyEndOfTurnEffects(state, log);
    // Should not add any taunt-related log entries
    expect(log.filter((l) => l.message.includes("taunt")).length).toBe(0);
  });
});

// ========== Volatile Status: Encore ==========

describe("Encore", () => {
  it("decrements encored counter each turn", () => {
    const { state, log } = stateForEOT({ encored: 3, encoredMove: "thunderbolt" });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].encored).toBe(2);
  });

  it("wears off and clears encoredMove when counter reaches 0", () => {
    const { state, log } = stateForEOT({ encored: 1, encoredMove: "thunderbolt" });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].encored).toBe(0);
    expect(result.player1.pokemon[0].encoredMove).toBeNull();
    expect(log.some((l) => l.kind === "info" && l.message.includes("encore ended"))).toBe(true);
  });

  it("does not clear encoredMove while turns remain", () => {
    const { state, log } = stateForEOT({ encored: 2, encoredMove: "ice-beam" });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].encoredMove).toBe("ice-beam");
  });

  it("has no effect when encored is already 0", () => {
    const { state, log } = stateForEOT({ encored: 0, encoredMove: null });
    applyEndOfTurnEffects(state, log);
    expect(log.filter((l) => l.message.includes("encore")).length).toBe(0);
  });
});

// ========== Volatile Status: Perish Song ==========

describe("Perish Song", () => {
  it("decrements perish count each turn", () => {
    const { state, log } = stateForEOT({ perishCount: 3 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].perishCount).toBe(2);
  });

  it("logs the current perish count", () => {
    const { state, log } = stateForEOT({ perishCount: 3 });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.message.includes("perish count fell to 2"))).toBe(true);
  });

  it("causes faint when count reaches 0", () => {
    const { state, log } = stateForEOT({ perishCount: 1 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].perishCount).toBe(0);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint" && l.message.includes("Perish Song"))).toBe(true);
  });

  it("does not trigger when perishCount is 0", () => {
    const { state, log } = stateForEOT({ perishCount: 0 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
    expect(log.filter((l) => l.message.includes("perish")).length).toBe(0);
  });

  it("counts down from 2 to 1 without fainting", () => {
    const { state, log } = stateForEOT({ perishCount: 2 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].perishCount).toBe(1);
    expect(result.player1.pokemon[0].isFainted).toBe(false);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
  });
});

// ========== Volatile Status: Curse (Ghost) ==========

describe("Curse (Ghost)", () => {
  it("deals 1/4 max HP per turn to cursed Pokemon", () => {
    const { state, log } = stateForEOT({ cursed: true, currentHp: 300 });
    const result = applyEndOfTurnEffects(state, log);
    const expectedDmg = Math.max(1, Math.floor(300 / 4)); // 75
    expect(result.player1.pokemon[0].currentHp).toBe(300 - expectedDmg);
  });

  it("logs the curse damage message", () => {
    const { state, log } = stateForEOT({ cursed: true });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.kind === "damage" && l.message.includes("curse"))).toBe(true);
  });

  it("can cause faint from curse damage", () => {
    const { state, log } = stateForEOT({ cursed: true, currentHp: 10 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
    expect(log.some((l) => l.kind === "faint")).toBe(true);
  });

  it("does not deal damage when not cursed", () => {
    const { state, log } = stateForEOT({ cursed: false, currentHp: 300 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
    expect(log.every((l) => !l.message.includes("curse"))).toBe(true);
  });

  it("does not deal curse damage to fainted Pokemon", () => {
    const { state, log } = stateForEOT({ cursed: true, isFainted: true, currentHp: 0 });
    applyEndOfTurnEffects(state, log);
    expect(log.every((l) => !l.message.includes("curse"))).toBe(true);
  });
});

// ========== Volatile Status: Aqua Ring ==========

describe("Aqua Ring", () => {
  it("heals 1/16 max HP per turn", () => {
    const { state, log } = stateForEOT({ aquaRing: true, currentHp: 200 });
    const result = applyEndOfTurnEffects(state, log);
    const expectedHeal = Math.max(1, Math.floor(300 / 16)); // 18
    expect(result.player1.pokemon[0].currentHp).toBe(200 + expectedHeal);
  });

  it("does not heal above max HP", () => {
    const { state, log } = stateForEOT({ aquaRing: true, currentHp: 295 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
  });

  it("logs the healing message", () => {
    const { state, log } = stateForEOT({ aquaRing: true, currentHp: 200 });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.kind === "heal" && l.message.includes("Aqua Ring"))).toBe(true);
  });

  it("is blocked by Heal Block", () => {
    const { state, log } = stateForEOT({ aquaRing: true, healBlocked: 3, currentHp: 200 });
    const result = applyEndOfTurnEffects(state, log);
    // Heal Block prevents aqua ring healing; healBlocked decrements to 2
    expect(result.player1.pokemon[0].currentHp).toBe(200);
    expect(log.every((l) => !l.message.includes("Aqua Ring"))).toBe(true);
  });

  it("does not activate when aquaRing is false", () => {
    const { state, log } = stateForEOT({ aquaRing: false, currentHp: 200 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(200);
  });
});

// ========== Volatile Status: Ingrain ==========

describe("Ingrain", () => {
  it("heals 1/16 max HP per turn", () => {
    const { state, log } = stateForEOT({ ingrain: true, currentHp: 200 });
    const result = applyEndOfTurnEffects(state, log);
    const expectedHeal = Math.max(1, Math.floor(300 / 16)); // 18
    expect(result.player1.pokemon[0].currentHp).toBe(200 + expectedHeal);
  });

  it("does not heal above max HP", () => {
    const { state, log } = stateForEOT({ ingrain: true, currentHp: 295 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(300);
  });

  it("logs the healing message", () => {
    const { state, log } = stateForEOT({ ingrain: true, currentHp: 200 });
    applyEndOfTurnEffects(state, log);
    expect(log.some((l) => l.kind === "heal" && l.message.includes("Ingrain"))).toBe(true);
  });

  it("is blocked by Heal Block", () => {
    const { state, log } = stateForEOT({ ingrain: true, healBlocked: 2, currentHp: 200 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(200);
    expect(log.every((l) => !l.message.includes("Ingrain"))).toBe(true);
  });

  it("stacks with Aqua Ring when both active", () => {
    const { state, log } = stateForEOT({ ingrain: true, aquaRing: true, currentHp: 200 });
    const result = applyEndOfTurnEffects(state, log);
    const healEach = Math.max(1, Math.floor(300 / 16)); // 18
    // Both should heal independently
    expect(result.player1.pokemon[0].currentHp).toBe(200 + healEach + healEach);
  });
});

// ========== Side Condition: Aurora Veil ==========

describe("Aurora Veil", () => {
  it("decrements countdown each turn", () => {
    const { state, log } = stateForEOT(undefined, {
      player1Side: {
        stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0,
        stickyWeb: false, reflect: 0, lightScreen: 0, auroraVeil: 5,
      },
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.field.player1Side.auroraVeil).toBe(4);
  });

  it("wears off when count reaches 0", () => {
    const { state, log } = stateForEOT(undefined, {
      player1Side: {
        stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0,
        stickyWeb: false, reflect: 0, lightScreen: 0, auroraVeil: 1,
      },
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.field.player1Side.auroraVeil).toBe(0);
    expect(log.some((l) => l.kind === "status" && l.message.includes("Aurora Veil wore off"))).toBe(true);
  });

  it("does not log when countdown is not yet 0", () => {
    const { state, log } = stateForEOT(undefined, {
      player1Side: {
        stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0,
        stickyWeb: false, reflect: 0, lightScreen: 0, auroraVeil: 3,
      },
    });
    applyEndOfTurnEffects(state, log);
    expect(log.every((l) => !l.message.includes("Aurora Veil"))).toBe(true);
  });

  it("does not change when already at 0", () => {
    const { state, log } = stateForEOT(undefined, {
      player1Side: {
        stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0,
        stickyWeb: false, reflect: 0, lightScreen: 0, auroraVeil: 0,
      },
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.field.player1Side.auroraVeil).toBe(0);
  });

  it("works independently per side", () => {
    const { state, log } = stateWithBothActive();
    const modState: BattleState = {
      ...state,
      field: {
        ...state.field,
        player1Side: { ...state.field.player1Side, auroraVeil: 1 },
        player2Side: { ...state.field.player2Side, auroraVeil: 3 },
      },
    };
    const result = applyEndOfTurnEffects(modState, log);
    expect(result.field.player1Side.auroraVeil).toBe(0);
    expect(result.field.player2Side.auroraVeil).toBe(2);
    expect(log.some((l) => l.message.includes("Player 1") && l.message.includes("Aurora Veil wore off"))).toBe(true);
    expect(log.every((l) => !(l.message.includes("Player 2") && l.message.includes("Aurora Veil wore off")))).toBe(true);
  });
});

// ========== Timer Countdowns ==========

describe("Disable timer", () => {
  it("decrements disabledTurns each turn", () => {
    const { state, log } = stateForEOT({ disabledTurns: 3, disabledMove: "flamethrower" });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].disabledTurns).toBe(2);
  });

  it("clears disabledMove when timer reaches 0", () => {
    const { state, log } = stateForEOT({ disabledTurns: 1, disabledMove: "flamethrower" });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].disabledTurns).toBe(0);
    expect(result.player1.pokemon[0].disabledMove).toBeNull();
    expect(log.some((l) => l.kind === "info" && l.message.includes("disable wore off"))).toBe(true);
  });

  it("preserves disabledMove while turns remain", () => {
    const { state, log } = stateForEOT({ disabledTurns: 2, disabledMove: "earthquake" });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].disabledMove).toBe("earthquake");
  });

  it("has no effect when disabledTurns is 0", () => {
    const { state, log } = stateForEOT({ disabledTurns: 0, disabledMove: null });
    applyEndOfTurnEffects(state, log);
    expect(log.filter((l) => l.message.includes("disable")).length).toBe(0);
  });
});

describe("Heal Block timer", () => {
  it("decrements healBlocked each turn", () => {
    const { state, log } = stateForEOT({ healBlocked: 3 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].healBlocked).toBe(2);
  });

  it("logs message when Heal Block wears off", () => {
    const { state, log } = stateForEOT({ healBlocked: 1 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].healBlocked).toBe(0);
    expect(log.some((l) => l.kind === "info" && l.message.includes("Heal Block wore off"))).toBe(true);
  });

  it("has no effect when healBlocked is 0", () => {
    const { state, log } = stateForEOT({ healBlocked: 0 });
    applyEndOfTurnEffects(state, log);
    expect(log.filter((l) => l.message.includes("Heal Block")).length).toBe(0);
  });
});

describe("Embargo timer", () => {
  it("decrements embargoed each turn", () => {
    const { state, log } = stateForEOT({ embargoed: 3 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].embargoed).toBe(2);
  });

  it("logs message when Embargo wears off", () => {
    const { state, log } = stateForEOT({ embargoed: 1 });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].embargoed).toBe(0);
    expect(log.some((l) => l.kind === "info" && l.message.includes("Embargo wore off"))).toBe(true);
  });
});

// ========== Interaction: Multiple volatile statuses in one turn ==========

describe("Multiple volatile statuses in one turn", () => {
  it("applies Leech Seed, binding, and curse damage in sequence", () => {
    const { state, log } = stateForEOT({
      isSeeded: true,
      seededBy: "player2",
      bindingTurns: 3,
      bindingMove: "wrap",
      boundBy: "player2",
      cursed: true,
      currentHp: 300,
    });
    const result = applyEndOfTurnEffects(state, log);
    const leechDrain = Math.max(1, Math.floor(300 / 8));  // 37
    const bindDmg = Math.max(1, Math.floor(300 / 8));     // 37
    const curseDmg = Math.max(1, Math.floor(300 / 4));    // 75
    const expectedHp = 300 - leechDrain - bindDmg - curseDmg; // 300 - 37 - 37 - 75 = 151
    expect(result.player1.pokemon[0].currentHp).toBe(expectedHp);
  });

  it("perish song faint applies even at full HP", () => {
    const { state, log } = stateForEOT({
      perishCount: 1,
      currentHp: 300,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(0);
    expect(result.player1.pokemon[0].isFainted).toBe(true);
  });

  it("Aqua Ring and Ingrain both heal when not Heal Blocked", () => {
    const { state, log } = stateForEOT({
      aquaRing: true,
      ingrain: true,
      healBlocked: 0,
      currentHp: 200,
    });
    const result = applyEndOfTurnEffects(state, log);
    const healPer = Math.max(1, Math.floor(300 / 16)); // 18
    expect(result.player1.pokemon[0].currentHp).toBe(200 + healPer + healPer); // 236
    expect(log.filter((l) => l.kind === "heal").length).toBeGreaterThanOrEqual(2);
  });

  it("Heal Block prevents both Aqua Ring and Ingrain healing", () => {
    const { state, log } = stateForEOT({
      aquaRing: true,
      ingrain: true,
      healBlocked: 3,
      currentHp: 200,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].currentHp).toBe(200);
  });

  it("all timer countdowns tick simultaneously", () => {
    const { state, log } = stateForEOT({
      taunted: 2,
      encored: 2,
      encoredMove: "thunderbolt",
      disabledTurns: 2,
      disabledMove: "earthquake",
      healBlocked: 2,
      embargoed: 2,
    });
    const result = applyEndOfTurnEffects(state, log);
    expect(result.player1.pokemon[0].taunted).toBe(1);
    expect(result.player1.pokemon[0].encored).toBe(1);
    expect(result.player1.pokemon[0].disabledTurns).toBe(1);
    expect(result.player1.pokemon[0].healBlocked).toBe(1);
    expect(result.player1.pokemon[0].embargoed).toBe(1);
  });
});
