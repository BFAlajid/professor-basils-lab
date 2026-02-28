import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockCharizard,
  mockBlastoise,
} from "@/test/mocks/pokemon";
import { BattleLogEntry, BattlePokemon, BattleState, Pokemon } from "@/types";

// --- Mocks ---

vi.mock("../damage", () => ({
  calculateDamage: vi.fn(() => ({ max: 100, effectiveness: 1, isCritical: false })),
}));

vi.mock("@/data/statusMoves", () => ({
  STATUS_MOVE_EFFECTS: {} as Record<string, any>,
}));

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn(() => null),
  getHighestStat: vi.fn(() => "attack"),
}));

vi.mock("@/data/maxMoves", () => ({
  convertToMaxMove: vi.fn(),
  getMaxMoveEffect: vi.fn(() => null),
}));

vi.mock("@/data/typeChart", () => ({
  getDefensiveMultiplier: vi.fn(() => 1),
}));

import { executeMove } from "../battleExecution";
import { calculateDamage } from "../damage";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { getAbilityHooks, getHighestStat } from "@/data/abilities";
import { cacheBattleMove } from "../battleHelpers";

beforeEach(() => {
  vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
  vi.mocked(getAbilityHooks).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Helpers ---

function buildState(
  p1Overrides?: Partial<BattlePokemon>,
  p2Overrides?: Partial<BattlePokemon>,
  fieldOverrides?: Partial<BattleState["field"]>,
): BattleState {
  return createMockBattleState({ p1Overrides, p2Overrides, ...fieldOverrides ? { field: { weather: null, weatherTurnsLeft: 0, terrain: null, terrainTurnsLeft: 0, player1Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 }, player2Side: { stealthRock: false, spikesLayers: 0, toxicSpikesLayers: 0, stickyWeb: false, reflect: 0, lightScreen: 0 }, ...fieldOverrides } } : {} });
}

// Pre-populate move cache for tests
function cacheTestMove(name: string, overrides?: Record<string, any>) {
  cacheBattleMove(name, {
    name,
    power: 80,
    accuracy: 100,
    pp: 15,
    type: { name: "normal" },
    damage_class: { name: "physical" },
    priority: 0,
    ...overrides,
  });
}

// ========== Pre-condition checks ==========

describe("executeMove", () => {
  describe("pre-condition checks", () => {
    it("returns unchanged state for fainted attacker", () => {
      const state = buildState({ isFainted: true });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result).toBe(state);
      expect(log).toHaveLength(0);
    });

    it("flinched attacker cannot move", () => {
      const state = buildState({ isFlinched: true });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("flinched"))).toBe(true);
    });

    it("paralysis has 25% chance to immobilize", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1); // < 0.25
      const state = buildState({ status: "paralyze" });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("paralyzed"))).toBe(true);
    });

    it("paralysis does not immobilize when random >= 0.25", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState({ status: "paralyze" });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("paralyzed") && l.message.includes("can't move"))).toBe(false);
    });

    it("sleeping Pokemon decrements sleep turns", () => {
      const state = buildState({ status: "sleep", sleepTurns: 2 });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].sleepTurns).toBe(1);
      expect(log.some((l) => l.message.includes("fast asleep"))).toBe(true);
    });

    it("sleeping Pokemon wakes up when sleepTurns is 0", () => {
      const state = buildState({ status: "sleep", sleepTurns: 0 });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].status).toBeNull();
      expect(log.some((l) => l.message.includes("woke up"))).toBe(true);
    });

    it("frozen Pokemon has 20% chance to thaw", () => {
      // First random call: 0.1 < 0.2 → thaw, then remaining random calls for move execution
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState({ status: "freeze" });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("thawed out"))).toBe(true);
    });

    it("frozen Pokemon stays frozen when random >= 0.2", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const state = buildState({ status: "freeze" });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("frozen solid"))).toBe(true);
    });
  });

  describe("no move available", () => {
    it("returns with 'no move' message when moveIndex is invalid", () => {
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = [];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("no move"))).toBe(true);
    });
  });

  describe("Assault Vest", () => {
    it("blocks status moves", () => {
      const slot = createMockTeamSlot(mockCharizard);
      slot.heldItem = "assault-vest";
      slot.selectedMoves = ["will-o-wisp", "flamethrower", "air-slash", "dragon-pulse"];
      // Register will-o-wisp as a status move in the mock
      (STATUS_MOVE_EFFECTS as any)["will-o-wisp"] = { targetStatus: "burn" };
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("Assault Vest"))).toBe(true);
      delete (STATUS_MOVE_EFFECTS as any)["will-o-wisp"];
    });

    it("allows hazard removal moves even with Assault Vest", () => {
      const slot = createMockTeamSlot(mockCharizard);
      slot.heldItem = "assault-vest";
      slot.selectedMoves = ["rapid-spin", "flamethrower", "air-slash", "dragon-pulse"];
      (STATUS_MOVE_EFFECTS as any)["rapid-spin"] = { clearHazards: "rapid-spin" };
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.every((l) => !l.message.includes("Assault Vest"))).toBe(true);
      delete (STATUS_MOVE_EFFECTS as any)["rapid-spin"];
    });
  });

  describe("status move routing", () => {
    it("delegates to applyStatusMoveEffect for known status moves", () => {
      (STATUS_MOVE_EFFECTS as any)["swords-dance"] = { selfStatChanges: { attack: 2 } };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["swords-dance", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].statStages.attack).toBe(2);
      delete (STATUS_MOVE_EFFECTS as any)["swords-dance"];
    });
  });

  describe("Fake Out", () => {
    it("fails when turnsOnField > 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      cacheTestMove("fake-out", { type: { name: "normal" }, priority: 3 });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["fake-out", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot, turnsOnField: 1 } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("Fake Out failed"))).toBe(true);
    });
  });

  describe("accuracy check", () => {
    it("misses when random roll exceeds accuracy", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99); // 0.99 * 100 = 99 >= 70 * 1
      cacheTestMove("focus-blast", { accuracy: 70, type: { name: "fighting" }, damage_class: { name: "special" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["focus-blast", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.kind === "miss")).toBe(true);
    });
  });

  describe("type immunity", () => {
    it("returns no effect when effectiveness is 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 0, effectiveness: 0, isCritical: false } as any);
      cacheTestMove("earthquake", { type: { name: "ground" }, damage_class: { name: "physical" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["earthquake", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("no effect"))).toBe(true);
    });
  });

  describe("Protect", () => {
    it("blocks damaging moves when defender is protected", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState(undefined, { isProtected: true });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("protected itself"))).toBe(true);
    });
  });

  describe("ability immunity", () => {
    it("blocks damage when modifyIncomingDamage returns multiplier 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(getAbilityHooks).mockReturnValue({
        modifyIncomingDamage: () => ({ multiplier: 0, message: "It had no effect due to Motor Drive!" }),
      } as any);
      cacheTestMove("thunderbolt", { type: { name: "electric" }, damage_class: { name: "special" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["thunderbolt", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("Motor Drive"))).toBe(true);
      expect(result.player2.pokemon[0].currentHp).toBe(300);
    });

    it("heals defender when ability has healInstead", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(getAbilityHooks).mockReturnValue({
        modifyIncomingDamage: () => ({ multiplier: 0, message: "Absorbed by Water Absorb!", healInstead: true }),
      } as any);
      cacheTestMove("surf", { type: { name: "water" }, damage_class: { name: "special" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["surf", "flamethrower", "air-slash", "dragon-pulse"];
      const p2Slot = createMockTeamSlot(mockBlastoise);
      const state = createMockBattleState({
        p1Overrides: { slot },
        p2Overrides: { currentHp: 200, slot: p2Slot },
      });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      // heals 1/4 maxHp = 75 → 200 + 75 = 275
      expect(result.player2.pokemon[0].currentHp).toBe(275);
    });
  });

  describe("multi-hit moves", () => {
    it("hits fixed number of times when min_hits === max_hits", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 30, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("triple-axel", {
        type: { name: "ice" },
        damage_class: { name: "physical" },
        meta: { min_hits: 3, max_hits: 3 },
      });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["triple-axel", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("Hit 3 time(s)"))).toBe(true);
    });

    it("hits variable times with weighted RNG", () => {
      // roll < 0.35 → 2 hits
      let callCount = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callCount++;
        // 1st call = crit check, 2nd call = accuracy, 3rd call = multi-hit roll
        if (callCount === 3) return 0.1; // < 0.35 → 2 hits
        return 0.5;
      });
      vi.mocked(calculateDamage).mockReturnValue({ max: 25, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("bullet-seed", {
        type: { name: "grass" },
        damage_class: { name: "physical" },
        meta: { min_hits: 2, max_hits: 5 },
      });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["bullet-seed", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("Hit 2 time(s)"))).toBe(true);
    });
  });

  describe("Focus Sash", () => {
    it("survives at 1 HP from full HP", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const p2Slot = createMockTeamSlot(mockBlastoise);
      p2Slot.heldItem = "focus-sash";
      const state = createMockBattleState({ p2Overrides: { slot: p2Slot, currentHp: 300, maxHp: 300 } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].currentHp).toBe(1);
      expect(result.player2.pokemon[0].isFainted).toBe(false);
      expect(log.some((l) => l.message.includes("Focus Sash"))).toBe(true);
    });
  });

  describe("Sturdy (modifySurvival)", () => {
    it("prevents KO from full HP", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      vi.mocked(getAbilityHooks).mockReturnValue({
        modifySurvival: () => ({ surviveWithHp: 1, message: "Sturdy held on!" }),
      } as any);
      cacheTestMove("earthquake", { type: { name: "ground" }, damage_class: { name: "physical" } });
      const state = buildState();
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].currentHp).toBe(1);
      expect(log.some((l) => l.message.includes("Sturdy"))).toBe(true);
    });
  });

  describe("KO triggers (onAfterKO)", () => {
    it("Moxie boosts attack after KO", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      vi.mocked(getAbilityHooks).mockImplementation((ability) => {
        if (!ability) return null;
        return {
          onAfterKO: () => ({ stat: "attack", stages: 1, message: "Moxie raised its Attack!" }),
        } as any;
      });
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].isFainted).toBe(true);
      expect(result.player1.pokemon[0].statStages.attack).toBe(1);
      expect(log.some((l) => l.message.includes("Moxie"))).toBe(true);
    });
  });

  describe("Life Orb recoil", () => {
    it("deals 1/10 maxHp recoil after dealing damage", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const p1Slot = createMockTeamSlot(mockCharizard);
      p1Slot.heldItem = "life-orb";
      const state = createMockBattleState({ p1Overrides: { slot: p1Slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      const recoil = Math.max(1, Math.floor(300 / 10));
      expect(result.player1.pokemon[0].currentHp).toBe(300 - recoil);
      expect(log.some((l) => l.message.includes("Life Orb"))).toBe(true);
    });
  });

  describe("recoil moves", () => {
    it("brave-bird deals 1/3 of damage dealt as recoil", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 120, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("brave-bird", { type: { name: "flying" }, damage_class: { name: "physical" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["brave-bird", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      // totalDamage ~ floor(120 * (0.85 + 0.5*0.15)) = floor(120 * 0.925) = 111
      // recoil = max(1, floor(totalDamage * 1/3))
      expect(log.some((l) => l.message.includes("recoil"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeLessThan(300);
    });

    it("head-smash deals 1/2 of damage dealt as recoil", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 150, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("head-smash", { type: { name: "rock" }, damage_class: { name: "physical" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["head-smash", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("recoil"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeLessThan(300);
    });
  });

  describe("drain moves", () => {
    it("giga-drain heals 50% of damage dealt", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 80, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("giga-drain", { type: { name: "grass" }, damage_class: { name: "special" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["giga-drain", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot, currentHp: 200 } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("restored HP"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeGreaterThan(200);
    });

    it("draining-kiss heals 75% of damage dealt", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 60, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("draining-kiss", { type: { name: "fairy" }, damage_class: { name: "special" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["draining-kiss", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot, currentHp: 200 } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(log.some((l) => l.message.includes("restored HP"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeGreaterThan(200);
    });
  });

  describe("flinch", () => {
    it("fake-out always flinches on first turn", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 40, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("fake-out", { type: { name: "normal" }, damage_class: { name: "physical" }, priority: 3 });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["fake-out", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot, turnsOnField: 0 } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].isFlinched).toBe(true);
    });

    it("iron-head has 30% flinch chance", () => {
      // Math.random calls in order: crit(1), accuracy(2), hitRandom(3), flinch(4)
      let callIdx = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callIdx++;
        if (callIdx === 4) return 0.001; // flinch roll: 0.001 * 100 = 0.1 < 30
        return 0.5;
      });
      vi.mocked(calculateDamage).mockReturnValue({ max: 80, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("iron-head", { type: { name: "steel" }, damage_class: { name: "physical" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["iron-head", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].isFlinched).toBe(true);
    });
  });

  describe("pivot moves", () => {
    it("u-turn sets pendingPivotSwitch when team has available switch", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 70, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("u-turn", { type: { name: "bug" }, damage_class: { name: "physical" } });
      const slot1 = createMockTeamSlot(mockCharizard);
      slot1.selectedMoves = ["u-turn", "flamethrower", "air-slash", "dragon-pulse"];
      const slot2 = createMockTeamSlot(mockBlastoise, 1);
      const bp1 = createMockBattlePokemon(slot1);
      const bp2 = createMockBattlePokemon(slot2, { isActive: false });
      const state: BattleState = {
        ...createMockBattleState(),
        player1: { pokemon: [bp1, bp2], activePokemonIndex: 0, selectedMechanic: null },
      };
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.pendingPivotSwitch).toBe("player1");
    });
  });

  describe("choice lock", () => {
    it("choice-band locks the move used", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const slot = createMockTeamSlot(mockCharizard);
      slot.heldItem = "choice-band";
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].choiceLockedMove).toBe("flamethrower");
    });
  });

  describe("status move effects", () => {
    afterEach(() => {
      // Clean up any added effects
      for (const key of Object.keys(STATUS_MOVE_EFFECTS)) {
        delete (STATUS_MOVE_EFFECTS as any)[key];
      }
    });

    it("protect sets isProtected on the user", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // > successChance check (will succeed since consecutive=0 → chance=1)
      (STATUS_MOVE_EFFECTS as any)["protect"] = { protect: true };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["protect", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].isProtected).toBe(true);
      expect(log.some((l) => l.message.includes("protected itself"))).toBe(true);
    });

    it("self stat changes apply correctly", () => {
      (STATUS_MOVE_EFFECTS as any)["dragon-dance"] = { selfStatChanges: { attack: 1, speed: 1 } };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["dragon-dance", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].statStages.attack).toBe(1);
      expect(result.player1.pokemon[0].statStages.speed).toBe(1);
    });

    it("belly drum costs 50% HP and maxes attack", () => {
      (STATUS_MOVE_EFFECTS as any)["belly-drum"] = { selfStatChanges: { attack: 6 } };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["belly-drum", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].statStages.attack).toBe(6);
      expect(result.player1.pokemon[0].currentHp).toBe(300 - Math.floor(300 / 2));
    });

    it("target stat drops apply to defender", () => {
      (STATUS_MOVE_EFFECTS as any)["charm"] = { targetStatChanges: { attack: -2 } };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["charm", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].statStages.attack).toBe(-2);
    });

    it("status infliction applies to defender", () => {
      (STATUS_MOVE_EFFECTS as any)["will-o-wisp"] = { targetStatus: "burn" };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["will-o-wisp", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player2.pokemon[0].status).toBe("burn");
    });

    it("hazard setup adds stealth rock to opponent side", () => {
      (STATUS_MOVE_EFFECTS as any)["stealth-rock"] = { hazard: "stealth-rock" };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["stealth-rock", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.field.player2Side.stealthRock).toBe(true);
    });

    it("rapid-spin clears own side hazards", () => {
      (STATUS_MOVE_EFFECTS as any)["rapid-spin"] = { clearHazards: "rapid-spin" };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["rapid-spin", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      state.field.player1Side.stealthRock = true;
      state.field.player1Side.spikesLayers = 2;
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.field.player1Side.stealthRock).toBe(false);
      expect(result.field.player1Side.spikesLayers).toBe(0);
      expect(log.some((l) => l.message.includes("blew away"))).toBe(true);
    });

    it("defog clears all hazards from both sides", () => {
      (STATUS_MOVE_EFFECTS as any)["defog"] = { clearHazards: "defog" };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["defog", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      state.field.player1Side.stealthRock = true;
      state.field.player2Side.spikesLayers = 3;
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.field.player1Side.stealthRock).toBe(false);
      expect(result.field.player2Side.spikesLayers).toBe(0);
    });

    it("reflect sets reflect on own side", () => {
      (STATUS_MOVE_EFFECTS as any)["reflect"] = { reflect: true };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["reflect", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.field.player1Side.reflect).toBe(5);
    });

    it("light-screen sets light screen on own side", () => {
      (STATUS_MOVE_EFFECTS as any)["light-screen"] = { lightScreen: true };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["light-screen", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.field.player1Side.lightScreen).toBe(5);
    });

    it("healing moves restore HP", () => {
      (STATUS_MOVE_EFFECTS as any)["recover"] = { healPercent: 50 };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["recover", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot, currentHp: 100 } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].currentHp).toBe(100 + Math.floor(300 * 50 / 100));
    });

    it("rest fully heals and puts user to sleep", () => {
      (STATUS_MOVE_EFFECTS as any)["rest"] = { healPercent: 100, targetStatus: "sleep" };
      const slot = createMockTeamSlot(mockCharizard);
      slot.selectedMoves = ["rest", "flamethrower", "air-slash", "dragon-pulse"];
      const state = createMockBattleState({ p1Overrides: { slot, currentHp: 50 } });
      const log: BattleLogEntry[] = [];
      const result = executeMove(state, "player1", 0, log);
      expect(result.player1.pokemon[0].currentHp).toBe(300);
      expect(result.player1.pokemon[0].status).toBe("sleep");
      expect(result.player1.pokemon[0].sleepTurns).toBe(2);
    });
  });
});
