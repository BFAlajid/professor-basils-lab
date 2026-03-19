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
  extractBaseStats: vi.fn(() => ({ hp: 78, attack: 84, defense: 78, spAtk: 109, spDef: 85, speed: 100 })),
}));

vi.mock("../stats", () => ({
  calculateAllStats: vi.fn(() => ({ hp: 300, attack: 200, defense: 180, spAtk: 220, spDef: 190, speed: 210 })),
  DEFAULT_EVS: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
  DEFAULT_IVS: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
}));

vi.mock("@/data/statusMoves", () => ({
  STATUS_MOVE_EFFECTS: {
    "confuse-ray": { targetConfusion: true },
    "swagger": { targetConfusion: true, targetStatChanges: { attack: 2 } },
  } as Record<string, any>,
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
import { applyStatusMoveEffect } from "../battleExecutionStatus";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { cacheBattleMove } from "../battleHelpers";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Default mock slot has selectedMoves: ["flamethrower", "air-slash", "dragon-pulse", "solar-beam"]
// Use moveIndex 0 => "flamethrower"
const DEFAULT_MOVE = "flamethrower";

function buildState(
  p1Overrides?: Partial<BattlePokemon>,
  p2Overrides?: Partial<BattlePokemon>,
): BattleState {
  return createMockBattleState({ p1Overrides, p2Overrides });
}

function cacheTestMove(name: string, overrides?: Record<string, any>) {
  cacheBattleMove(name, {
    name,
    power: 80,
    accuracy: 100,
    pp: 15,
    type: { name: "fire" },
    damage_class: { name: "special" },
    priority: 0,
    ...overrides,
  });
}

describe("confusion mechanic", () => {
  describe("confusion pre-move check", () => {
    it("snaps out of confusion when turns reach 0", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const state = buildState({ confusionTurns: 1 });
      const log: BattleLogEntry[] = [];

      executeMove(state, "player1", 0, log);

      const snapMsg = log.find((l) => l.message.includes("snapped out of confusion"));
      expect(snapMsg).toBeDefined();
      const usedMsg = log.find((l) => l.message.includes("used flamethrower"));
      expect(usedMsg).toBeDefined();
    });

    it("logs confused message when still confused", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const state = buildState({ confusionTurns: 3 });
      const log: BattleLogEntry[] = [];

      executeMove(state, "player1", 0, log);

      const confusedMsg = log.find((l) => l.message.includes("is confused"));
      expect(confusedMsg).toBeDefined();
    });

    it("decrements confusion turns each attempt", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const state = buildState({ confusionTurns: 3 });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);
      const p1Active = result.player1.pokemon[result.player1.activePokemonIndex];
      expect(p1Active.confusionTurns).toBe(2);
    });

    it("hits itself in confusion (1/3 chance)", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.1);

      const state = buildState({ confusionTurns: 3, currentHp: 300, maxHp: 300 });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);

      const selfHitMsg = log.find((l) => l.message.includes("hurt itself in its confusion"));
      expect(selfHitMsg).toBeDefined();
      // Should NOT have used the move
      const usedMsg = log.find((l) => l.message.includes("used flamethrower"));
      expect(usedMsg).toBeUndefined();
      // Should have taken some damage
      const p1Active = result.player1.pokemon[result.player1.activePokemonIndex];
      expect(p1Active.currentHp).toBeLessThan(300);
    });

    it("confusion self-hit deals at least 1 damage", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.1);

      const state = buildState({ confusionTurns: 3, currentHp: 300, maxHp: 300 });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);
      const p1Active = result.player1.pokemon[result.player1.activePokemonIndex];
      expect(p1Active.currentHp).toBeLessThanOrEqual(299);
    });

    it("confusion self-hit can cause fainting", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.1);

      const state = buildState({ confusionTurns: 3, currentHp: 1, maxHp: 300 });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);
      const p1Active = result.player1.pokemon[result.player1.activePokemonIndex];
      expect(p1Active.isFainted).toBe(true);
      expect(p1Active.currentHp).toBe(0);
      const faintMsg = log.find((l) => l.kind === "faint");
      expect(faintMsg).toBeDefined();
    });

    it("continues to move normally when not hitting self (2/3 chance)", () => {
      cacheTestMove(DEFAULT_MOVE);
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const state = buildState({ confusionTurns: 3 });
      const log: BattleLogEntry[] = [];

      executeMove(state, "player1", 0, log);

      const selfHitMsg = log.find((l) => l.message.includes("hurt itself"));
      expect(selfHitMsg).toBeUndefined();
      const confusedMsg = log.find((l) => l.message.includes("is confused"));
      expect(confusedMsg).toBeDefined();
      const usedMsg = log.find((l) => l.message.includes("used flamethrower"));
      expect(usedMsg).toBeDefined();
    });
  });

  describe("confusion infliction via status moves", () => {
    it("confuse-ray sets confusion turns on target", () => {
      const state = buildState();
      const log: BattleLogEntry[] = [];
      const effect = STATUS_MOVE_EFFECTS["confuse-ray"];

      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "confuse-ray", log);

      const p2Active = result.player2.pokemon[result.player2.activePokemonIndex];
      expect(p2Active.confusionTurns).toBeGreaterThanOrEqual(2);
      expect(p2Active.confusionTurns).toBeLessThanOrEqual(5);
      const confusedMsg = log.find((l) => l.message.includes("became confused"));
      expect(confusedMsg).toBeDefined();
    });

    it("does not apply confusion if already confused", () => {
      const state = buildState(undefined, { confusionTurns: 3 });
      const log: BattleLogEntry[] = [];
      const effect = STATUS_MOVE_EFFECTS["confuse-ray"];

      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "confuse-ray", log);

      const p2Active = result.player2.pokemon[result.player2.activePokemonIndex];
      expect(p2Active.confusionTurns).toBe(3);
      const alreadyMsg = log.find((l) => l.message.includes("already confused"));
      expect(alreadyMsg).toBeDefined();
    });
  });

  describe("confusion reset on switch", () => {
    it("initBattlePokemon sets confusionTurns to 0", () => {
      const pokemon = createMockBattlePokemon(createMockTeamSlot(mockCharizard));
      expect(pokemon.confusionTurns).toBe(0);
    });
  });
});
