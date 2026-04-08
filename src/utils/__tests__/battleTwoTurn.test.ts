import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockCharizard,
  mockBlastoise,
} from "@/test/mocks/pokemon";
import { BattleLogEntry, BattlePokemon, BattleState, Pokemon } from "@/types";

vi.mock("../damage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../damage")>();
  return {
    ...actual,
    calculateDamage: vi.fn(() => ({ max: 100, effectiveness: 1, isCritical: false })),
  };
});

vi.mock("@/data/statusMoves", () => ({
  STATUS_MOVE_EFFECTS: {} as Record<string, any>,
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

import { executeMove } from "../battleExecution";
import { battleReducer } from "../battleReducer";
import { calculateDamage } from "../damage";
import { getAbilityHooks } from "@/data/abilities";
import { cacheBattleMove } from "../battleHelpers";

beforeEach(() => {
  vi.mocked(calculateDamage).mockReturnValue({ max: 100, effectiveness: 1, isCritical: false } as any);
  vi.mocked(getAbilityHooks).mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

function buildFlyUser(): BattleState {
  const flyMon = { ...mockCharizard, moves: [{ move: { name: "fly", url: "" } }, ...mockCharizard.moves.slice(1)] };
  const p1Slot = createMockTeamSlot(flyMon, 0);
  p1Slot.selectedMoves = ["fly", "air-slash", "dragon-pulse", "solar-beam"];
  const p2Slot = createMockTeamSlot(mockBlastoise, 0);
  return createMockBattleState({
    player1: {
      pokemon: [createMockBattlePokemon(p1Slot)],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    player2: {
      pokemon: [createMockBattlePokemon(p2Slot)],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
  });
}

function buildMoveUser(moveName: string, moveOverrides?: Record<string, any>): BattleState {
  const mon = { ...mockCharizard, moves: [{ move: { name: moveName, url: "" } }, ...mockCharizard.moves.slice(1)] };
  const p1Slot = createMockTeamSlot(mon, 0);
  p1Slot.selectedMoves = [moveName, "air-slash", "dragon-pulse", "solar-beam"];
  const p2Slot = createMockTeamSlot(mockBlastoise, 0);
  cacheTestMove(moveName, moveOverrides);
  return createMockBattleState({
    player1: {
      pokemon: [createMockBattlePokemon(p1Slot)],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    player2: {
      pokemon: [createMockBattlePokemon(p2Slot)],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
  });
}

describe("Two-turn moves", () => {
  describe("Fly", () => {
    it("charges on turn 1 without dealing damage", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("fly", { type: { name: "flying" }, power: 90, accuracy: 95 });
      const state = buildFlyUser();
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);

      // Should set charging state
      expect(result.player1.pokemon[0].chargingMove).toBe("fly");
      expect(result.player1.pokemon[0].semiInvulnerable).toBe("fly");
      // Should log the charge message
      expect(log.some(l => l.message.includes("flew up high"))).toBe(true);
      // Should NOT deal damage (defender HP unchanged)
      expect(result.player2.pokemon[0].currentHp).toBe(300);
    });

    it("hits on turn 2 and clears charging state", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("fly", { type: { name: "flying" }, power: 90, accuracy: 95 });
      const state = buildFlyUser();
      // Simulate that the attacker is already charging
      const chargingState: BattleState = {
        ...state,
        player1: {
          ...state.player1,
          pokemon: [{ ...state.player1.pokemon[0], chargingMove: "fly", semiInvulnerable: "fly" }],
        },
      };
      const log: BattleLogEntry[] = [];

      const result = executeMove(chargingState, "player1", 0, log);

      // Charging state should be cleared
      expect(result.player1.pokemon[0].chargingMove).toBeNull();
      expect(result.player1.pokemon[0].semiInvulnerable).toBeNull();
      // Should deal damage
      expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
    });
  });

  describe("Semi-invulnerable dodging", () => {
    it("normal moves miss a flying target", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("hydro-pump", { type: { name: "water" }, power: 110, damage_class: { name: "special" } });
      // Set up: p2 uses hydro-pump on p1 who is semi-invulnerable (fly)
      const state = buildFlyUser();
      const flyingState: BattleState = {
        ...state,
        player1: {
          ...state.player1,
          pokemon: [{ ...state.player1.pokemon[0], semiInvulnerable: "fly", chargingMove: "fly" }],
        },
      };
      // p2 attacks p1
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);
      p2Slot.selectedMoves = ["hydro-pump", "ice-beam", "dark-pulse", "rapid-spin"];
      const stateWithMoves: BattleState = {
        ...flyingState,
        player2: {
          ...flyingState.player2,
          pokemon: [createMockBattlePokemon(p2Slot)],
        },
      };
      const log: BattleLogEntry[] = [];

      // p2 (blastoise) attacks p1 (charizard in fly)
      const result = executeMove(stateWithMoves, "player2", 0, log);

      // Should miss
      expect(log.some(l => l.message.includes("missed"))).toBe(true);
      // p1 HP unchanged
      expect(result.player1.pokemon[0].currentHp).toBe(300);
    });

    it("Thunder hits a flying target", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("thunder", { type: { name: "electric" }, power: 110, accuracy: 70, damage_class: { name: "special" } });
      const state = buildFlyUser();

      const p2Mon = { ...mockBlastoise, moves: [{ move: { name: "thunder", url: "" } }, ...mockBlastoise.moves.slice(1)] };
      const p2Slot = createMockTeamSlot(p2Mon, 0);
      p2Slot.selectedMoves = ["thunder", "ice-beam", "dark-pulse", "rapid-spin"];

      const flyingState: BattleState = {
        ...state,
        player1: {
          ...state.player1,
          pokemon: [{ ...state.player1.pokemon[0], semiInvulnerable: "fly", chargingMove: "fly" }],
        },
        player2: {
          ...state.player2,
          pokemon: [createMockBattlePokemon(p2Slot)],
        },
      };
      const log: BattleLogEntry[] = [];

      const result = executeMove(flyingState, "player2", 0, log);

      // Should NOT miss due to semi-invulnerable (accuracy may still miss normally)
      // With random=0.5 and accuracy=70, 0.5*100=50 < 70 so it hits
      expect(log.some(l => l.message.includes("missed"))).toBe(false);
      expect(result.player1.pokemon[0].currentHp).toBeLessThan(300);
    });

    it("Earthquake hits a digging target", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("earthquake", { type: { name: "ground" }, power: 100 });
      cacheTestMove("dig", { type: { name: "ground" }, power: 80 });

      const digMon = { ...mockCharizard, moves: [{ move: { name: "dig", url: "" } }, ...mockCharizard.moves.slice(1)] };
      const p1Slot = createMockTeamSlot(digMon, 0);
      p1Slot.selectedMoves = ["dig", "air-slash", "dragon-pulse", "solar-beam"];

      const p2Mon = { ...mockBlastoise, moves: [{ move: { name: "earthquake", url: "" } }, ...mockBlastoise.moves.slice(1)] };
      const p2Slot = createMockTeamSlot(p2Mon, 0);
      p2Slot.selectedMoves = ["earthquake", "ice-beam", "dark-pulse", "rapid-spin"];

      const state = createMockBattleState({
        player1: {
          pokemon: [createMockBattlePokemon(p1Slot, { semiInvulnerable: "dig", chargingMove: "dig" })],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
        player2: {
          pokemon: [createMockBattlePokemon(p2Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player2", 0, log);

      expect(log.some(l => l.message.includes("missed"))).toBe(false);
      expect(result.player1.pokemon[0].currentHp).toBeLessThan(300);
    });
  });

  describe("Solar Beam", () => {
    it("charges in non-sun weather", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("solar-beam", { type: { name: "grass" }, power: 120, damage_class: { name: "special" } });

      const state = buildMoveUser("solar-beam", { type: { name: "grass" }, power: 120, damage_class: { name: "special" } });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);

      expect(result.player1.pokemon[0].chargingMove).toBe("solar-beam");
      expect(log.some(l => l.message.includes("absorbing light"))).toBe(true);
      expect(result.player2.pokemon[0].currentHp).toBe(300);
    });

    it("skips charge turn in sun weather", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("solar-beam", { type: { name: "grass" }, power: 120, damage_class: { name: "special" } });

      const state = buildMoveUser("solar-beam", { type: { name: "grass" }, power: 120, damage_class: { name: "special" } });
      const sunState: BattleState = {
        ...state,
        field: { ...state.field, weather: "sun", weatherTurnsLeft: 5 },
      };
      const log: BattleLogEntry[] = [];

      const result = executeMove(sunState, "player1", 0, log);

      // Should NOT charge — should attack immediately
      expect(result.player1.pokemon[0].chargingMove).toBeNull();
      expect(log.some(l => l.message.includes("absorbing light"))).toBe(false);
      // Should deal damage
      expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
    });
  });

  describe("Skull Bash", () => {
    it("grants +1 Def on charge turn", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("skull-bash", { type: { name: "normal" }, power: 130 });

      const state = buildMoveUser("skull-bash", { type: { name: "normal" }, power: 130 });
      const log: BattleLogEntry[] = [];

      const result = executeMove(state, "player1", 0, log);

      expect(result.player1.pokemon[0].chargingMove).toBe("skull-bash");
      expect(result.player1.pokemon[0].statStages.defense).toBe(1);
      expect(log.some(l => l.message.includes("Defense rose"))).toBe(true);
      expect(result.player2.pokemon[0].currentHp).toBe(300);
    });
  });

  describe("Phantom Force", () => {
    it("bypasses Protect on release turn", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      cacheTestMove("phantom-force", { type: { name: "ghost" }, power: 90 });

      const state = buildMoveUser("phantom-force", { type: { name: "ghost" }, power: 90 });
      // Set attacker as charging, defender as protected
      const chargeState: BattleState = {
        ...state,
        player1: {
          ...state.player1,
          pokemon: [{ ...state.player1.pokemon[0], chargingMove: "phantom-force", semiInvulnerable: "dive" }],
        },
        player2: {
          ...state.player2,
          pokemon: [{ ...state.player2.pokemon[0], isProtected: true }],
        },
      };
      const log: BattleLogEntry[] = [];

      const result = executeMove(chargeState, "player1", 0, log);

      // Should NOT be blocked by Protect
      expect(log.some(l => l.message.includes("protected itself"))).toBe(false);
      expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
    });
  });

  describe("Switch clears charging state", () => {
    it("switching out resets chargingMove and semiInvulnerable", () => {
      const flyMon = { ...mockCharizard, moves: [{ move: { name: "fly", url: "" } }, ...mockCharizard.moves.slice(1)] };
      const p1Slot1 = createMockTeamSlot(flyMon, 0);
      p1Slot1.selectedMoves = ["fly", "air-slash", "dragon-pulse", "solar-beam"];
      const p1Slot2 = createMockTeamSlot(mockCharizard, 1);

      const p2Slot = createMockTeamSlot(mockBlastoise, 0);

      const state: BattleState = createMockBattleState({
        player1: {
          pokemon: [
            createMockBattlePokemon(p1Slot1, { chargingMove: "fly", semiInvulnerable: "fly" }),
            createMockBattlePokemon(p1Slot2, { isActive: false }),
          ],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
        player2: {
          pokemon: [createMockBattlePokemon(p2Slot)],
          activePokemonIndex: 0,
          selectedMechanic: null,
        },
      });

      // Test performSwitch indirectly via EXECUTE_TURN with a SWITCH action
      const newState = battleReducer(state, {
        type: "EXECUTE_TURN",
        player1Action: { type: "SWITCH", pokemonIndex: 1 },
        player2Action: { type: "MOVE", moveIndex: 0 },
      });

      // The switched-out Pokemon should have charging state cleared
      expect(newState.player1.pokemon[0].chargingMove).toBeNull();
      expect(newState.player1.pokemon[0].semiInvulnerable).toBeNull();
    });
  });
});
