import { vi } from "vitest";
import {
  mockCharizard,
  mockBlastoise,
  mockVenusaur,
  createMockTeamSlot,
  createMockBattlePokemon,
  createMockBattleState,
} from "@/test/mocks/pokemon";
import type { TeamSlot, BattleState, AltFormeData } from "@/types";

// Mock dependencies before importing the module under test
vi.mock("@/utils/battleExecution", () => ({
  executeMove: vi.fn((state: BattleState) => state),
}));

vi.mock("@/utils/battleEffects", () => ({
  applyEndOfTurnEffects: vi.fn((state: BattleState) => state),
  applyHazardsOnSwitchIn: vi.fn((state: BattleState) => state),
}));

vi.mock("@/utils/battleMechanics", () => ({
  applyMegaEvolution: vi.fn((state: BattleState) => state),
  applyTerastallization: vi.fn((state: BattleState) => state),
  applyDynamax: vi.fn((state: BattleState) => state),
  endDynamax: vi.fn((state: BattleState) => state),
}));

vi.mock("@/data/abilities", () => ({
  getAbilityHooks: vi.fn(() => null),
}));

vi.mock("@/data/megaStones", () => ({
  isMegaStone: vi.fn(() => false),
}));

vi.mock("@/data/heldItems", () => ({
  getHeldItem: vi.fn(() => null),
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
  initBattlePokemon,
  initBattleTeam,
  initialBattleState,
  battleReducer,
} from "../battleReducer";
import { isMegaStone } from "@/data/megaStones";
import { getAbilityHooks } from "@/data/abilities";
import { applyHazardsOnSwitchIn } from "@/utils/battleEffects";

const mockedApplyHazards = vi.mocked(applyHazardsOnSwitchIn);

// --- initBattlePokemon ---

describe("initBattlePokemon", () => {
  it("creates BattlePokemon with correct HP from stats calculation", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.currentHp).toBe(bp.maxHp);
    expect(bp.maxHp).toBeGreaterThan(0);
  });

  it("initializes all battle tracking fields to defaults", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.status).toBeNull();
    expect(bp.statStages.attack).toBe(0);
    expect(bp.statStages.defense).toBe(0);
    expect(bp.statStages.spAtk).toBe(0);
    expect(bp.statStages.spDef).toBe(0);
    expect(bp.statStages.speed).toBe(0);
    expect(bp.statStages.accuracy).toBe(0);
    expect(bp.statStages.evasion).toBe(0);
    expect(bp.isFainted).toBe(false);
    expect(bp.isActive).toBe(false);
    expect(bp.toxicCounter).toBe(0);
    expect(bp.sleepTurns).toBe(0);
    expect(bp.turnsOnField).toBe(0);
    expect(bp.isProtected).toBe(false);
    expect(bp.lastMoveUsed).toBeNull();
    expect(bp.consecutiveProtects).toBe(0);
    expect(bp.isFlinched).toBe(false);
    expect(bp.choiceLockedMove).toBeNull();
    expect(bp.isMegaEvolved).toBe(false);
    expect(bp.isTerastallized).toBe(false);
    expect(bp.isDynamaxed).toBe(false);
    expect(bp.dynamaxTurnsLeft).toBe(0);
    expect(bp.hasMegaEvolved).toBe(false);
    expect(bp.hasTerastallized).toBe(false);
    expect(bp.hasDynamaxed).toBe(false);
  });

  it("teraType comes from slot.teraConfig.teraType", () => {
    const slot = createMockTeamSlot(mockCharizard);
    slot.teraConfig = { teraType: "dragon" };
    const bp = initBattlePokemon(slot);

    expect(bp.teraType).toBe("dragon");
  });

  it("teraType is null when no teraConfig", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.teraType).toBeNull();
  });

  it("resolves megaFormeData from cache when item is mega stone", () => {
    vi.mocked(isMegaStone).mockReturnValue(true);

    const slot = createMockTeamSlot(mockCharizard);
    slot.heldItem = "charizardite-x";

    const formeData: AltFormeData = {
      name: "charizard-mega-x",
      types: [
        { slot: 1, type: { name: "fire" } },
        { slot: 2, type: { name: "dragon" } },
      ],
      stats: mockCharizard.stats,
      ability: "tough-claws",
      spriteUrl: null,
    };

    const cache = new Map<string, AltFormeData>();
    cache.set("charizard", formeData);

    const bp = initBattlePokemon(slot, cache);
    expect(bp.megaFormeData).toBe(formeData);

    vi.mocked(isMegaStone).mockReturnValue(false);
  });

  it("megaFormeData is null without mega stone", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = initBattlePokemon(slot);

    expect(bp.megaFormeData).toBeNull();
  });
});

// --- initBattleTeam ---

describe("initBattleTeam", () => {
  it("first Pokemon has isActive=true", () => {
    const slots = [createMockTeamSlot(mockCharizard, 0), createMockTeamSlot(mockBlastoise, 1)];
    const team = initBattleTeam(slots);

    expect(team.pokemon[0].isActive).toBe(true);
    expect(team.pokemon[1].isActive).toBe(false);
  });

  it("selectedMechanic set correctly", () => {
    const slots = [createMockTeamSlot(mockCharizard, 0)];
    const team = initBattleTeam(slots, "mega");

    expect(team.selectedMechanic).toBe("mega");
  });

  it("all team members created", () => {
    const slots = [
      createMockTeamSlot(mockCharizard, 0),
      createMockTeamSlot(mockBlastoise, 1),
      createMockTeamSlot(mockVenusaur, 2),
    ];
    const team = initBattleTeam(slots);

    expect(team.pokemon).toHaveLength(3);
    expect(team.pokemon[0].slot.pokemon.name).toBe("charizard");
    expect(team.pokemon[1].slot.pokemon.name).toBe("blastoise");
    expect(team.pokemon[2].slot.pokemon.name).toBe("venusaur");
  });

  it("defaults mechanic to null", () => {
    const slots = [createMockTeamSlot(mockCharizard, 0)];
    const team = initBattleTeam(slots);

    expect(team.selectedMechanic).toBeNull();
  });
});

// --- battleReducer ---

describe("battleReducer", () => {
  describe("START_BATTLE", () => {
    it("sets phase to action_select, turn to 1, creates log", () => {
      const p1 = [createMockTeamSlot(mockCharizard, 0)];
      const p2 = [createMockTeamSlot(mockBlastoise, 0)];

      const result = battleReducer(initialBattleState, {
        type: "START_BATTLE",
        player1Team: p1,
        player2Team: p2,
        mode: "ai",
      });

      expect(result.phase).toBe("action_select");
      expect(result.turn).toBe(1);
      expect(result.player1.pokemon).toHaveLength(1);
      expect(result.player2.pokemon).toHaveLength(1);
      expect(result.player1.pokemon[0].isActive).toBe(true);
      expect(result.player2.pokemon[0].isActive).toBe(true);
    });

    it("log contains battle start and switch messages", () => {
      const p1 = [createMockTeamSlot(mockCharizard, 0)];
      const p2 = [createMockTeamSlot(mockBlastoise, 0)];

      const result = battleReducer(initialBattleState, {
        type: "START_BATTLE",
        player1Team: p1,
        player2Team: p2,
        mode: "ai",
      });

      expect(result.log).toHaveLength(3);
      expect(result.log[0].message).toBe("Battle start!");
      expect(result.log[0].kind).toBe("info");
      expect(result.log[1].message).toContain("charizard");
      expect(result.log[1].kind).toBe("switch");
      expect(result.log[2].message).toContain("blastoise");
      expect(result.log[2].kind).toBe("switch");
    });

    it("resets winner and field state", () => {
      const p1 = [createMockTeamSlot(mockCharizard, 0)];
      const p2 = [createMockTeamSlot(mockBlastoise, 0)];

      const result = battleReducer(initialBattleState, {
        type: "START_BATTLE",
        player1Team: p1,
        player2Team: p2,
        mode: "ai",
      });

      expect(result.winner).toBeNull();
      expect(result.field.weather).toBeNull();
      expect(result.field.terrain).toBeNull();
    });
  });

  describe("FORCE_SWITCH", () => {
    it("deactivates old Pokemon and activates new one", () => {
      const p1Slot1 = createMockTeamSlot(mockCharizard, 0);
      const p1Slot2 = createMockTeamSlot(mockVenusaur, 1);
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);

      const state = createMockBattleState();
      state.player1 = {
        pokemon: [
          createMockBattlePokemon(p1Slot1, { isActive: true }),
          createMockBattlePokemon(p1Slot2, { isActive: false }),
        ],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };
      state.player2 = {
        pokemon: [createMockBattlePokemon(p2Slot)],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };
      state.waitingForSwitch = "player1";

      const result = battleReducer(state, {
        type: "FORCE_SWITCH",
        player: "player1",
        pokemonIndex: 1,
      });

      expect(result.player1.pokemon[0].isActive).toBe(false);
      expect(result.player1.pokemon[1].isActive).toBe(true);
      expect(result.player1.activePokemonIndex).toBe(1);
    });

    it("adds switch log message", () => {
      const p1Slot1 = createMockTeamSlot(mockCharizard, 0);
      const p1Slot2 = createMockTeamSlot(mockVenusaur, 1);
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);

      const state = createMockBattleState();
      state.player1 = {
        pokemon: [
          createMockBattlePokemon(p1Slot1, { isActive: true }),
          createMockBattlePokemon(p1Slot2, { isActive: false }),
        ],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };
      state.player2 = {
        pokemon: [createMockBattlePokemon(p2Slot)],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };

      const result = battleReducer(state, {
        type: "FORCE_SWITCH",
        player: "player1",
        pokemonIndex: 1,
      });

      const switchLog = result.log.find((l) => l.kind === "switch");
      expect(switchLog).toBeDefined();
      expect(switchLog!.message).toContain("venusaur");
    });

    it("calls applyHazardsOnSwitchIn", () => {
      const p1Slot1 = createMockTeamSlot(mockCharizard, 0);
      const p1Slot2 = createMockTeamSlot(mockVenusaur, 1);
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);

      const state = createMockBattleState();
      state.player1 = {
        pokemon: [
          createMockBattlePokemon(p1Slot1, { isActive: true }),
          createMockBattlePokemon(p1Slot2, { isActive: false }),
        ],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };
      state.player2 = {
        pokemon: [createMockBattlePokemon(p2Slot)],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };

      vi.mocked(applyHazardsOnSwitchIn).mockClear();

      battleReducer(state, {
        type: "FORCE_SWITCH",
        player: "player1",
        pokemonIndex: 1,
      });

      expect(applyHazardsOnSwitchIn).toHaveBeenCalledWith(
        expect.any(Object),
        "player1",
        expect.any(Array)
      );
    });

    it("clears waitingForSwitch and sets phase to action_select", () => {
      const p1Slot1 = createMockTeamSlot(mockCharizard, 0);
      const p1Slot2 = createMockTeamSlot(mockVenusaur, 1);
      const p2Slot = createMockTeamSlot(mockBlastoise, 0);

      const state = createMockBattleState();
      state.player1 = {
        pokemon: [
          createMockBattlePokemon(p1Slot1, { isActive: true }),
          createMockBattlePokemon(p1Slot2, { isActive: false }),
        ],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };
      state.player2 = {
        pokemon: [createMockBattlePokemon(p2Slot)],
        activePokemonIndex: 0,
        selectedMechanic: null,
      };
      state.waitingForSwitch = "player1";

      const result = battleReducer(state, {
        type: "FORCE_SWITCH",
        player: "player1",
        pokemonIndex: 1,
      });

      expect(result.waitingForSwitch).toBeNull();
      expect(result.phase).toBe("action_select");
    });
  });

  describe("RESET_BATTLE", () => {
    it("returns initialBattleState", () => {
      const state = createMockBattleState();
      state.turn = 10;
      state.phase = "ended";

      const result = battleReducer(state, { type: "RESET_BATTLE" });

      expect(result).toEqual(initialBattleState);
    });
  });

  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const state = createMockBattleState();
      const result = battleReducer(state, { type: "UNKNOWN_ACTION" } as any);

      expect(result).toBe(state);
    });
  });
});
