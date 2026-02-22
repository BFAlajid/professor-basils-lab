import { describe, it, expect, vi } from "vitest";
import { selectAIAction } from "../ai";
import { BattleState, BattlePokemon, BattleTurnAction, BattleTeam, TeamSlot } from "@/types";
import { mockCharizard, mockBlastoise, createMockTeamSlot } from "@/test/mocks/pokemon";
import { initBattlePokemon, initStatStages, cacheBattleMove } from "../battle";

// Cache some moves for AI to reference
function setupMoveCache() {
  cacheBattleMove("flamethrower", {
    name: "flamethrower",
    power: 90,
    accuracy: 100,
    pp: 15,
    type: { name: "fire" },
    damage_class: { name: "special" },
    priority: 0,
  });
  cacheBattleMove("hydro-pump", {
    name: "hydro-pump",
    power: 110,
    accuracy: 80,
    pp: 5,
    type: { name: "water" },
    damage_class: { name: "special" },
    priority: 0,
  });
  cacheBattleMove("air-slash", {
    name: "air-slash",
    power: 75,
    accuracy: 95,
    pp: 15,
    type: { name: "flying" },
    damage_class: { name: "special" },
    priority: 0,
  });
  cacheBattleMove("ice-beam", {
    name: "ice-beam",
    power: 90,
    accuracy: 100,
    pp: 10,
    type: { name: "ice" },
    damage_class: { name: "special" },
    priority: 0,
  });
}

function createMockBattleState(): BattleState {
  const slot1 = createMockTeamSlot(mockCharizard);
  const slot2 = createMockTeamSlot(mockBlastoise);

  const bp1 = initBattlePokemon(slot1);
  bp1.isActive = true;

  const bp2 = initBattlePokemon(slot2);
  bp2.isActive = true;

  return {
    phase: "action_select",
    mode: "ai",
    difficulty: "normal",
    turn: 1,
    player1: {
      pokemon: [bp1],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    player2: {
      pokemon: [bp2],
      activePokemonIndex: 0,
      selectedMechanic: null,
    },
    log: [],
    winner: null,
    waitingForSwitch: null,
    currentTurnPlayer: "player1",
    field: { weather: null, weatherTurnsLeft: 0, terrain: null, terrainTurnsLeft: 0 },
    pendingPivotSwitch: null,
  };
}

describe("selectAIAction", () => {
  beforeAll(() => {
    setupMoveCache();
  });

  it("returns a valid action object", () => {
    const state = createMockBattleState();
    const action = selectAIAction(state);
    expect(action).toBeDefined();
    expect(action.type).toBeDefined();
    expect(["MOVE", "SWITCH"].includes(action.type)).toBe(true);
  });

  it("selects a move when only one Pokemon is alive", () => {
    const state = createMockBattleState();
    const action = selectAIAction(state);
    // With only 1 Pokemon, switching is not possible
    expect(action.type).toBe("MOVE");
  });

  it("returns valid move index", () => {
    const state = createMockBattleState();
    const action = selectAIAction(state);
    if (action.type === "MOVE") {
      expect(action.moveIndex).toBeGreaterThanOrEqual(0);
      expect(action.moveIndex).toBeLessThan(4);
    }
  });
});
