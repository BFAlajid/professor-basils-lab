import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockCharizard,
  mockBlastoise,
} from "@/test/mocks/pokemon";
import { BattleLogEntry, BattlePokemon, BattleState } from "@/types";

vi.mock("../damage", () => ({
  calculateDamage: vi.fn(() => ({ max: 100, effectiveness: 1, isCritical: false })),
}));

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn(() => null),
  getHighestStat: vi.fn(() => "attack"),
  hasAbility: vi.fn(() => false),
}));

vi.mock("@/data/maxMoves", () => ({
  convertToMaxMove: vi.fn(),
  getMaxMoveEffect: vi.fn(() => null),
}));

vi.mock("@/data/typeChart", () => ({
  getDefensiveMultiplier: vi.fn(() => 1),
}));

import { executeDamagingMove } from "../battleExecutionDamage";
import { calculateDamage } from "../damage";
import { getAbilityHooks, hasAbility } from "@/data/abilities";
import { cacheBattleMove } from "../battleHelpers";

beforeEach(() => {
  vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
  vi.mocked(getAbilityHooks).mockReturnValue(null);
  vi.mocked(hasAbility).mockReturnValue(false);
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
  return createMockBattleState({
    p1Overrides,
    p2Overrides,
    ...(fieldOverrides
      ? {
          field: {
            weather: null,
            weatherTurnsLeft: 0,
            terrain: null,
            terrainTurnsLeft: 0,
            trickRoom: 0,
            player1Side: {
              stealthRock: false,
              spikesLayers: 0,
              toxicSpikesLayers: 0,
              stickyWeb: false,
              reflect: 0,
              lightScreen: 0,
              tailwind: 0,
            },
            player2Side: {
              stealthRock: false,
              spikesLayers: 0,
              toxicSpikesLayers: 0,
              stickyWeb: false,
              reflect: 0,
              lightScreen: 0,
              tailwind: 0,
            },
            ...fieldOverrides,
          },
        }
      : {}),
  });
}

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

function exec(
  state: BattleState,
  moveIndex: number = 0,
  attackerPlayer: "player1" | "player2" = "player1",
  defenderPlayer: "player1" | "player2" = "player2",
): { state: BattleState; log: BattleLogEntry[] } {
  const moveName = state[attackerPlayer].pokemon[state[attackerPlayer].activePokemonIndex]
    .slot.selectedMoves?.[moveIndex] ?? "";
  const log: BattleLogEntry[] = [];
  const newState = executeDamagingMove(state, attackerPlayer, defenderPlayer, moveName, moveIndex, log);
  return { state: newState, log };
}

// ========== Basic Damage Application ==========

describe("executeDamagingMove", () => {
  describe("basic damage", () => {
    it("deals damage to defender", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
      expect(log.some((l) => l.kind === "damage")).toBe(true);
    });

    it("defender faints when HP reaches 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(0);
      expect(result.player2.pokemon[0].isFainted).toBe(true);
      expect(log.some((l) => l.kind === "faint")).toBe(true);
    });

    it("logs super effective hit", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 2, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const { log } = exec(state, 0);

      expect(log.some((l) => l.message.includes("super effective"))).toBe(true);
    });

    it("logs not very effective hit", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 0.5, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const { log } = exec(state, 0);

      expect(log.some((l) => l.message.includes("not very effective"))).toBe(true);
    });

    it("immune moves deal no damage", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 0, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(300);
      expect(log.some((l) => l.message.includes("no effect"))).toBe(true);
    });
  });

  // ========== Critical Hits ==========

  describe("critical hits", () => {
    it("logs critical hit message for single-hit moves", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.01); // below 1/16
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: true } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState();
      const { log } = exec(state, 0);

      expect(log.some((l) => l.message === "A critical hit!")).toBe(true);
    });
  });

  // ========== Multi-hit Moves ==========

  describe("multi-hit moves", () => {
    it("fixed hit count when min_hits equals max_hits", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 50, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", {
        type: { name: "fire" },
        damage_class: { name: "special" },
        meta: { min_hits: 3, max_hits: 3 },
      });
      const state = buildState();
      const { log } = exec(state, 0);

      expect(log.some((l) => l.message.includes("Hit 3 time(s)"))).toBe(true);
    });

    it("variable hit count resolves to 2 when roll < 0.35", () => {
      // Math.random calls: isCritical, accuracy, multi-hit roll, then per-hit random calls
      let callIndex = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return 0.5;  // not crit
        if (callIndex === 2) return 0.01; // hits (accuracy)
        if (callIndex === 3) return 0.1;  // multi-hit roll < 0.35 -> 2 hits
        return 0.5; // damage rolls + per-hit crit checks
      });
      vi.mocked(calculateDamage).mockReturnValue({ max: 30, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", {
        type: { name: "fire" },
        damage_class: { name: "special" },
        meta: { min_hits: 2, max_hits: 5 },
      });
      const state = buildState();
      const { log } = exec(state, 0);

      expect(log.some((l) => l.message.includes("Hit 2 time(s)"))).toBe(true);
    });

    it("variable hit count resolves to 5 when roll >= 0.85", () => {
      let callIndex = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return 0.5;  // not crit
        if (callIndex === 2) return 0.01; // hits
        if (callIndex === 3) return 0.9;  // multi-hit roll >= 0.85 -> 5 hits
        return 0.5;
      });
      vi.mocked(calculateDamage).mockReturnValue({ max: 20, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", {
        type: { name: "fire" },
        damage_class: { name: "special" },
        meta: { min_hits: 2, max_hits: 5 },
      });
      const state = buildState();
      const { log } = exec(state, 0);

      expect(log.some((l) => l.message.includes("Hit 5 time(s)"))).toBe(true);
    });

    it("stops hitting when defender faints mid-multi-hit", () => {
      let callIndex = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return 0.5;
        if (callIndex === 2) return 0.01;
        return 0.5;
      });
      // High damage kills in one hit, so multi-hit should stop
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", {
        type: { name: "fire" },
        damage_class: { name: "special" },
        meta: { min_hits: 3, max_hits: 3 },
      });
      const state = buildState();
      const { state: result } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(0);
      expect(result.player2.pokemon[0].isFainted).toBe(true);
    });
  });

  // ========== Recoil Mechanics ==========

  describe("recoil mechanics", () => {
    it("brave-bird deals 1/3 recoil damage to attacker", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 120, effectiveness: 1, isCritical: false } as any);
      // brave-bird needs to be in selectedMoves at index 0
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["brave-bird", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("brave-bird", { type: { name: "flying" }, damage_class: { name: "physical" }, power: 120 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "brave-bird", 0, log);

      expect(log.some((l) => l.message.includes("hurt by recoil"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeLessThan(300);
    });

    it("life orb deals 10% max HP recoil", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.heldItem = "life-orb";
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "flamethrower", 0, log);

      // Life Orb: max(1, floor(300/10)) = 30 recoil
      expect(log.some((l) => l.message.includes("Life Orb"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeLessThan(300);
    });

    it("attacker faints from recoil", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 200, effectiveness: 1, isCritical: false } as any);
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["brave-bird", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot, { currentHp: 30, maxHp: 300 })],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("brave-bird", { type: { name: "flying" }, damage_class: { name: "physical" }, power: 120 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "brave-bird", 0, log);

      expect(result.player1.pokemon[0].currentHp).toBe(0);
      expect(result.player1.pokemon[0].isFainted).toBe(true);
      expect(log.some((l) => l.message.includes("hurt by recoil"))).toBe(true);
    });
  });

  // ========== Drain Moves ==========

  describe("drain moves", () => {
    it("giga-drain heals attacker for 50% of damage dealt", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["giga-drain", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot, { currentHp: 100, maxHp: 300 })],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("giga-drain", { type: { name: "grass" }, damage_class: { name: "special" }, power: 75 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "giga-drain", 0, log);

      expect(log.some((l) => l.message.includes("restored HP"))).toBe(true);
      expect(result.player1.pokemon[0].currentHp).toBeGreaterThan(100);
    });

    it("drain does not heal above max HP", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["giga-drain", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot, { currentHp: 300, maxHp: 300 })],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("giga-drain", { type: { name: "grass" }, damage_class: { name: "special" }, power: 75 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "giga-drain", 0, log);

      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });
  });

  // ========== Protect Block ==========

  describe("protect interaction", () => {
    it("protected defender takes no damage", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState(undefined, { isProtected: true });
      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(300);
      expect(log.some((l) => l.message.includes("protected itself"))).toBe(true);
    });
  });

  // ========== Fake Out ==========

  describe("fake out", () => {
    it.todo("fails after first turn on field", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["fake-out", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot, { turnsOnField: 1 })],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("fake-out", { type: { name: "normal" }, damage_class: { name: "physical" }, power: 40 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "fake-out", 0, log);

      expect(result.player2.pokemon[0].currentHp).toBe(300);
      expect(log.some((l) => l.message.includes("Fake Out failed"))).toBe(true);
    });

    it("succeeds and flinches on first turn (turnsOnField = 0)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 40, effectiveness: 1, isCritical: false } as any);
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["fake-out", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot, { turnsOnField: 0 })],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("fake-out", { type: { name: "normal" }, damage_class: { name: "physical" }, power: 40 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "fake-out", 0, log);

      expect(result.player2.pokemon[0].isFlinched).toBe(true);
      expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
    });
  });

  // ========== Focus Sash ==========

  describe("focus sash", () => {
    it("survives lethal hit at full HP with 1 HP", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);
      p2Slot.heldItem = "focus-sash";
      const state = createMockBattleState({
        p2Overrides: {
          slot: p2Slot,
          currentHp: 300,
          maxHp: 300,
        },
      });

      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(1);
      expect(result.player2.pokemon[0].isFainted).toBe(false);
      expect(log.some((l) => l.message.includes("Focus Sash"))).toBe(true);
    });

    it("does not trigger when not at full HP", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 500, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);
      p2Slot.heldItem = "focus-sash";
      const state = createMockBattleState({
        p2Overrides: {
          slot: p2Slot,
          currentHp: 299,
          maxHp: 300,
        },
      });

      const { state: result } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(0);
      expect(result.player2.pokemon[0].isFainted).toBe(true);
    });
  });

  // ========== Accuracy ==========

  describe("accuracy", () => {
    it("move misses when random exceeds accuracy threshold", () => {
      // random calls: crit check, then accuracy check
      let callIndex = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return 0.5; // crit check - no crit
        return 0.99; // accuracy check - miss (99 >= 80 * 1.0)
      });
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" }, accuracy: 80 });
      const state = buildState();
      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBe(300);
      expect(log.some((l) => l.message.includes("missed"))).toBe(true);
    });
  });

  // ========== Pivot Moves ==========

  describe("pivot moves", () => {
    it("u-turn sets pendingPivotSwitch when attacker has teammates", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 50, effectiveness: 1, isCritical: false } as any);

      const p1Slot0 = createMockTeamSlot(mockCharizard, 0);
      p1Slot0.selectedMoves = ["u-turn", "air-slash", "dragon-pulse", "solar-beam"];
      const p1Slot1 = createMockTeamSlot(mockBlastoise, 1);

      const state = createMockBattleState({
        player1: {
          pokemon: [
            createMockBattlePokemon(p1Slot0),
            createMockBattlePokemon(p1Slot1, { isActive: false }),
          ],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("u-turn", { type: { name: "bug" }, damage_class: { name: "physical" }, power: 70 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "u-turn", 0, log);

      expect(result.pendingPivotSwitch).toBe("player1");
    });
  });

  // ========== Choice Lock ==========

  describe("choice items", () => {
    it("choice band locks attacker to the used move", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.heldItem = "choice-band";
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "flamethrower", 0, log);

      expect(result.player1.pokemon[0].choiceLockedMove).toBe("flamethrower");
    });
  });

  // ========== Ability: Absorb-type Immunity ==========

  describe("absorb ability immunity", () => {
    it("ability can block and heal from incoming move", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
      vi.mocked(getAbilityHooks).mockReturnValue({
        modifyIncomingDamage: () => ({
          multiplier: 0,
          message: "It had no effect due to ability!",
          healInstead: true,
        }),
      } as any);
      cacheTestMove("flamethrower", { type: { name: "fire" }, damage_class: { name: "special" } });
      const state = buildState(undefined, { currentHp: 200, maxHp: 300 });
      const { state: result, log } = exec(state, 0);

      expect(result.player2.pokemon[0].currentHp).toBeGreaterThan(200);
      expect(log.some((l) => l.message.includes("no effect due to ability"))).toBe(true);
    });
  });

  // ========== Flinch from Damaging Moves ==========

  describe("flinch chance", () => {
    it("iron-head has 30% flinch chance", () => {
      // random calls: crit, accuracy, damage roll, flinch check
      let callIndex = 0;
      vi.spyOn(Math, "random").mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return 0.5; // not crit
        if (callIndex === 2) return 0.01; // accuracy hits
        if (callIndex === 3) return 0.5; // damage roll
        return 0.1; // flinch check: 0.1 * 100 = 10 < 30 -> flinch
      });
      vi.mocked(calculateDamage).mockReturnValue({ max: 80, effectiveness: 1, isCritical: false } as any);
      const p1Slot = createMockTeamSlot(mockCharizard, 0);
      p1Slot.selectedMoves = ["iron-head", "air-slash", "dragon-pulse", "solar-beam"];
      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      cacheTestMove("iron-head", { type: { name: "steel" }, damage_class: { name: "physical" }, power: 80 });

      const log: BattleLogEntry[] = [];
      const result = executeDamagingMove(state, "player1", "player2", "iron-head", 0, log);

      expect(result.player2.pokemon[0].isFlinched).toBe(true);
    });
  });
});
