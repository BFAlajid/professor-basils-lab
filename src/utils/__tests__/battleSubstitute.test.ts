import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockBattleState,
  createMockTeamSlot,
  createMockBattlePokemon,
  mockCharizard,
  mockBlastoise,
  mockVenusaur,
} from "@/test/mocks/pokemon";
import { applyStatusMoveEffect } from "../battleExecutionStatus";
import { executeDamagingMove } from "../battleExecutionDamage";
import { battleReducer } from "../battleReducer";
import { STATUS_MOVE_EFFECTS } from "@/data/statusMoves";
import { BattleLogEntry, BattleState } from "@/types";

describe("Substitute mechanic", () => {
  let state: BattleState;
  let log: BattleLogEntry[];

  beforeEach(() => {
    state = createMockBattleState();
    log = [];
  });

  describe("using Substitute", () => {
    it("costs 25% of max HP and creates a substitute", () => {
      const effect = STATUS_MOVE_EFFECTS["substitute"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "substitute", log);

      const p1 = result.player1.pokemon[0];
      expect(p1.substituteHp).toBe(Math.floor(300 / 4)); // 75
      expect(p1.currentHp).toBe(300 - 75); // 225
      expect(log.some((l) => l.message.includes("made a substitute"))).toBe(true);
    });

    it("fails if user has HP <= 25% of max", () => {
      state = createMockBattleState({ p1Overrides: { currentHp: 75 } });
      const effect = STATUS_MOVE_EFFECTS["substitute"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "substitute", log);

      const p1 = result.player1.pokemon[0];
      expect(p1.substituteHp).toBe(0);
      expect(p1.currentHp).toBe(75);
      expect(log.some((l) => l.message.includes("doesn't have enough HP"))).toBe(true);
    });

    it("fails if user already has a substitute", () => {
      state = createMockBattleState({ p1Overrides: { substituteHp: 75 } });
      const effect = STATUS_MOVE_EFFECTS["substitute"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "substitute", log);

      const p1 = result.player1.pokemon[0];
      expect(p1.substituteHp).toBe(75);
      expect(log.some((l) => l.message.includes("already has a substitute"))).toBe(true);
    });
  });

  describe("substitute blocking damage", () => {
    beforeEach(() => {
      state = createMockBattleState({ p2Overrides: { substituteHp: 75 } });
    });

    it("redirects damage to the substitute, not the Pokemon", () => {
      // Seed random to get predictable results
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const result = executeDamagingMove(state, "player1", "player2", "flamethrower", 0, log);

      const p2 = result.player2.pokemon[0];
      // Substitute took the hit, real HP untouched
      expect(p2.currentHp).toBe(300);

      vi.restoreAllMocks();
    });

    it("breaks substitute when damage exceeds substitute HP", () => {
      // Set substitute HP very low
      state = createMockBattleState({ p2Overrides: { substituteHp: 1 } });
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const result = executeDamagingMove(state, "player1", "player2", "flamethrower", 0, log);

      const p2 = result.player2.pokemon[0];
      expect(p2.substituteHp).toBe(0);
      expect(p2.currentHp).toBe(300); // excess does not carry through
      expect(log.some((l) => l.message.includes("substitute broke"))).toBe(true);

      vi.restoreAllMocks();
    });

    it("excess damage does not carry through to the real Pokemon", () => {
      state = createMockBattleState({ p2Overrides: { substituteHp: 1 } });
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      const result = executeDamagingMove(state, "player1", "player2", "flamethrower", 0, log);

      const p2 = result.player2.pokemon[0];
      expect(p2.currentHp).toBe(300);
      expect(p2.isFainted).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe("substitute blocking status moves", () => {
    beforeEach(() => {
      state = createMockBattleState({ p2Overrides: { substituteHp: 75 } });
    });

    it("blocks Thunder Wave when target has a substitute", () => {
      const effect = STATUS_MOVE_EFFECTS["thunder-wave"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "thunder-wave", log);

      const p2 = result.player2.pokemon[0];
      expect(p2.status).toBeNull();
      expect(log.some((l) => l.message.includes("protected by its substitute"))).toBe(true);
    });

    it("blocks Growl (stat-dropping move) when target has a substitute", () => {
      const effect = STATUS_MOVE_EFFECTS["growl"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "growl", log);

      const p2 = result.player2.pokemon[0];
      expect(p2.statStages.attack).toBe(0);
      expect(log.some((l) => l.message.includes("protected by its substitute"))).toBe(true);
    });

    it("blocks Toxic when target has a substitute", () => {
      const effect = STATUS_MOVE_EFFECTS["toxic"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "toxic", log);

      const p2 = result.player2.pokemon[0];
      expect(p2.status).toBeNull();
      expect(log.some((l) => l.message.includes("protected by its substitute"))).toBe(true);
    });

    it("blocks Confuse Ray when target has a substitute", () => {
      const effect = STATUS_MOVE_EFFECTS["confuse-ray"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "confuse-ray", log);

      const p2 = result.player2.pokemon[0];
      expect(p2.confusionTurns).toBe(0);
      expect(log.some((l) => l.message.includes("protected by its substitute"))).toBe(true);
    });
  });

  describe("self-targeting moves work through own substitute", () => {
    it("Swords Dance still works when user has a substitute", () => {
      state = createMockBattleState({ p1Overrides: { substituteHp: 75 } });
      const effect = STATUS_MOVE_EFFECTS["swords-dance"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "swords-dance", log);

      const p1 = result.player1.pokemon[0];
      expect(p1.statStages.attack).toBe(2);
      expect(p1.substituteHp).toBe(75);
    });

    it("Calm Mind still works when user has a substitute", () => {
      state = createMockBattleState({ p1Overrides: { substituteHp: 75 } });
      const effect = STATUS_MOVE_EFFECTS["calm-mind"];
      const result = applyStatusMoveEffect(state, "player1", "player2", effect, "calm-mind", log);

      const p1 = result.player1.pokemon[0];
      expect(p1.statStages.spAtk).toBe(1);
      expect(p1.statStages.spDef).toBe(1);
    });
  });

  describe("substitute removed on switch", () => {
    it("resets substituteHp to 0 when Pokemon switches out", () => {
      // Create state with 2 pokemon on player1's team
      const slot1 = createMockTeamSlot(mockCharizard, 0);
      const slot2 = createMockTeamSlot(mockVenusaur, 1);
      const p1Active = createMockBattlePokemon(slot1, { substituteHp: 75 });
      const p1Bench = createMockBattlePokemon(slot2, { isActive: false });
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);

      state = {
        ...state,
        player1: {
          pokemon: [p1Active, p1Bench],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
        player2: {
          pokemon: [createMockBattlePokemon(p2Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      };

      const result = battleReducer(state, {
        type: "EXECUTE_TURN",
        player1Action: { type: "SWITCH", pokemonIndex: 1 },
        player2Action: { type: "MOVE", moveIndex: 0 },
      });

      // The switched-out Pokemon should have substituteHp reset
      expect(result.player1.pokemon[0].substituteHp).toBe(0);
    });
  });
});
