import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRandomIVs, createWildTeamSlot, createWildBattlePokemon } from "../wildBattle";
import { mockCharizard, mockBlastoise } from "@/test/mocks/pokemon";
import { Pokemon } from "@/types";

// Mock the battle module to avoid import side-effects
vi.mock("../battle", () => ({
  initBattlePokemon: vi.fn((slot) => ({
    slot,
    currentHp: 200,
    maxHp: 200,
    originalMaxHp: 200,
    isActive: false,
    status: null,
    statStages: {
      attack: 0,
      defense: 0,
      spAtk: 0,
      spDef: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
    },
    volatileStatus: [],
    turnsOut: 0,
    lastMove: null,
    isProtecting: false,
    substituteHp: 0,
    toxicCounter: 0,
    sleepTurns: 0,
    isFlinching: false,
    hasActedThisTurn: false,
    activeMechanic: null,
  })),
  initStatStages: vi.fn(() => ({
    attack: 0,
    defense: 0,
    spAtk: 0,
    spDef: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  })),
  getStatStageMultiplier: vi.fn(() => 1),
  cacheBattleMove: vi.fn(),
  getCachedMoves: vi.fn(() => new Map()),
}));

// --- generateRandomIVs ---

describe("generateRandomIVs", () => {
  it("returns all 6 IV stats", () => {
    const ivs = generateRandomIVs();
    expect(ivs).toHaveProperty("hp");
    expect(ivs).toHaveProperty("attack");
    expect(ivs).toHaveProperty("defense");
    expect(ivs).toHaveProperty("spAtk");
    expect(ivs).toHaveProperty("spDef");
    expect(ivs).toHaveProperty("speed");
  });

  it("generates IVs in valid range (0-31)", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 50; i++) {
      const ivs = generateRandomIVs();
      for (const [key, val] of Object.entries(ivs)) {
        expect(val, `${key} should be >= 0`).toBeGreaterThanOrEqual(0);
        expect(val, `${key} should be <= 31`).toBeLessThanOrEqual(31);
      }
    }
  });

  it("generates integer values", () => {
    for (let i = 0; i < 20; i++) {
      const ivs = generateRandomIVs();
      for (const val of Object.values(ivs)) {
        expect(Number.isInteger(val)).toBe(true);
      }
    }
  });
});

// --- createWildTeamSlot ---

describe("createWildTeamSlot", () => {
  it("returns a valid TeamSlot with the provided Pokemon", () => {
    const slot = createWildTeamSlot(mockCharizard, 25);
    expect(slot.pokemon).toBe(mockCharizard);
    expect(slot.position).toBe(0);
  });

  it("selects at most 4 moves", () => {
    const manyMovesPokemon: Pokemon = {
      ...mockCharizard,
      moves: Array.from({ length: 10 }, (_, i) => ({
        move: { name: `move-${i}`, url: "" },
      })),
    };

    for (let i = 0; i < 20; i++) {
      const slot = createWildTeamSlot(manyMovesPokemon, 50);
      expect(slot.selectedMoves!.length).toBeLessThanOrEqual(4);
      expect(slot.selectedMoves!.length).toBeGreaterThan(0);
    }
  });

  it("handles Pokemon with fewer than 4 moves", () => {
    const twoMovesPokemon: Pokemon = {
      ...mockCharizard,
      moves: [
        { move: { name: "tackle", url: "" } },
        { move: { name: "growl", url: "" } },
      ],
    };

    const slot = createWildTeamSlot(twoMovesPokemon, 10);
    expect(slot.selectedMoves!.length).toBe(2);
  });

  it("assigns a nature", () => {
    const slot = createWildTeamSlot(mockCharizard, 50);
    expect(slot.nature).toBeDefined();
    expect(slot.nature!.name).toBeDefined();
  });

  it("assigns zero EVs", () => {
    const slot = createWildTeamSlot(mockBlastoise, 30);
    const evs = slot.evs!;
    expect(evs.hp).toBe(0);
    expect(evs.attack).toBe(0);
    expect(evs.defense).toBe(0);
    expect(evs.spAtk).toBe(0);
    expect(evs.spDef).toBe(0);
    expect(evs.speed).toBe(0);
  });

  it("assigns random IVs in valid range", () => {
    const slot = createWildTeamSlot(mockCharizard, 50);
    const ivs = slot.ivs!;
    for (const val of Object.values(ivs)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(31);
    }
  });

  it("assigns the first ability", () => {
    const slot = createWildTeamSlot(mockCharizard, 50);
    expect(slot.ability).toBe("blaze");
  });

  it("assigns null ability when Pokemon has no abilities", () => {
    const noAbilityPokemon: Pokemon = {
      ...mockCharizard,
      abilities: undefined,
    };
    const slot = createWildTeamSlot(noAbilityPokemon, 50);
    expect(slot.ability).toBeNull();
  });

  it("sets heldItem to null", () => {
    const slot = createWildTeamSlot(mockCharizard, 50);
    expect(slot.heldItem).toBeNull();
  });
});

// --- createWildBattlePokemon ---

describe("createWildBattlePokemon", () => {
  it("returns a BattlePokemon with isActive true", () => {
    const bp = createWildBattlePokemon(mockCharizard, 50);
    expect(bp.isActive).toBe(true);
  });

  it("scales HP based on level", () => {
    const bpLow = createWildBattlePokemon(mockCharizard, 5);
    const bpHigh = createWildBattlePokemon(mockCharizard, 50);

    // Level 50 should have much more HP than level 5
    expect(bpHigh.maxHp).toBeGreaterThan(bpLow.maxHp);
  });

  it("has minimum HP of 10", () => {
    const bp = createWildBattlePokemon(mockCharizard, 1);
    expect(bp.maxHp).toBeGreaterThanOrEqual(10);
    expect(bp.currentHp).toBeGreaterThanOrEqual(10);
  });

  it("currentHp equals maxHp (full health)", () => {
    const bp = createWildBattlePokemon(mockBlastoise, 30);
    expect(bp.currentHp).toBe(bp.maxHp);
  });

  it("originalMaxHp equals maxHp", () => {
    const bp = createWildBattlePokemon(mockCharizard, 40);
    expect(bp.originalMaxHp).toBe(bp.maxHp);
  });

  it("slot contains the original Pokemon", () => {
    const bp = createWildBattlePokemon(mockBlastoise, 25);
    expect(bp.slot.pokemon).toBe(mockBlastoise);
  });

  it("level scaling at level 50 gives full HP", () => {
    const bp = createWildBattlePokemon(mockCharizard, 50);
    // At level 50, scale is max(0.2, 50/50) = 1.0 → full HP from initBattlePokemon
    // initBattlePokemon mock returns 200 HP, so scaledHp = floor(200 * 1.0) = 200
    expect(bp.maxHp).toBe(200);
  });

  it("level scaling at level 10 reduces HP", () => {
    const bp = createWildBattlePokemon(mockCharizard, 10);
    // scale = max(0.2, 10/50) = 0.2, scaledHp = max(10, floor(200 * 0.2)) = 40
    expect(bp.maxHp).toBe(40);
  });
});
