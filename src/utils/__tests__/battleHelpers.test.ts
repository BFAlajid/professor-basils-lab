import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  BattlePokemon,
  BattleLogEntry,
  BattleMoveData,
  BattleTurnAction,
  Move,
} from "@/types";
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
  initStatStages,
  getActivePokemon,
  getStatStageMultiplier,
  getEffectiveSpeed,
  getEffectiveTypes,
  getOriginalTypes,
  initSideConditions,
  getMoveIndexFromAction,
  cacheBattleMove,
  getCachedMoves,
  getBattleMove,
  getMovePriority,
  getRelevantAtkStage,
  getRelevantDefStage,
  updatePokemon,
  getStatusText,
  triggerOnStatDrop,
  applyFieldEffect,
} from "../battleHelpers";
import { getHeldItem } from "@/data/heldItems";
import { getAbilityHooks } from "@/data/abilities";

afterEach(() => {
  vi.restoreAllMocks();
  // Clear the move cache between tests
  getCachedMoves().clear();
});

// --- initStatStages ---

describe("initStatStages", () => {
  it("returns all stat stages at zero", () => {
    const stages = initStatStages();
    expect(stages).toEqual({
      attack: 0,
      defense: 0,
      spAtk: 0,
      spDef: 0,
      speed: 0,
      accuracy: 0,
      evasion: 0,
    });
  });

  it("returns a fresh object each call", () => {
    const a = initStatStages();
    const b = initStatStages();
    expect(a).not.toBe(b);
    a.attack = 3;
    expect(b.attack).toBe(0);
  });
});

// --- getActivePokemon ---

describe("getActivePokemon", () => {
  it("returns the pokemon at activePokemonIndex", () => {
    const state = createMockBattleState();
    const active = getActivePokemon(state.player1);
    expect(active).toBe(state.player1.pokemon[0]);
  });

  it("clamps negative index to 0", () => {
    const state = createMockBattleState();
    state.player1.activePokemonIndex = -5;
    const active = getActivePokemon(state.player1);
    expect(active).toBe(state.player1.pokemon[0]);
  });

  it("clamps index beyond team length", () => {
    const state = createMockBattleState();
    state.player1.activePokemonIndex = 99;
    const active = getActivePokemon(state.player1);
    expect(active).toBe(state.player1.pokemon[state.player1.pokemon.length - 1]);
  });

  it("works with multi-pokemon team", () => {
    const slot1 = createMockTeamSlot(mockCharizard, 0);
    const slot2 = createMockTeamSlot(mockBlastoise, 1);
    const bp1 = createMockBattlePokemon(slot1);
    const bp2 = createMockBattlePokemon(slot2);
    const team = { pokemon: [bp1, bp2], activePokemonIndex: 1, selectedMechanic: null as any };
    expect(getActivePokemon(team)).toBe(bp2);
  });
});

// --- getStatStageMultiplier ---

describe("getStatStageMultiplier", () => {
  it("returns 1 at stage 0", () => {
    expect(getStatStageMultiplier(0)).toBe(1);
  });

  it("returns correct positive multipliers", () => {
    expect(getStatStageMultiplier(1)).toBeCloseTo(3 / 2);
    expect(getStatStageMultiplier(2)).toBeCloseTo(4 / 2);
    expect(getStatStageMultiplier(6)).toBeCloseTo(8 / 2);
  });

  it("returns correct negative multipliers", () => {
    expect(getStatStageMultiplier(-1)).toBeCloseTo(2 / 3);
    expect(getStatStageMultiplier(-2)).toBeCloseTo(2 / 4);
    expect(getStatStageMultiplier(-6)).toBeCloseTo(2 / 8);
  });

  it("clamps above +6", () => {
    expect(getStatStageMultiplier(10)).toBe(getStatStageMultiplier(6));
  });

  it("clamps below -6", () => {
    expect(getStatStageMultiplier(-10)).toBe(getStatStageMultiplier(-6));
  });
});

// --- getEffectiveSpeed ---

describe("getEffectiveSpeed", () => {
  it("calculates base speed from stats", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    const speed = getEffectiveSpeed(bp);
    expect(speed).toBeGreaterThan(0);
  });

  it("applies paralysis halving", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const healthy = createMockBattlePokemon(slot);
    const paralyzed = createMockBattlePokemon(slot, { status: "paralyze" });
    const healthySpeed = getEffectiveSpeed(healthy);
    const paraSpeed = getEffectiveSpeed(paralyzed);
    expect(paraSpeed).toBe(Math.floor(healthySpeed * 0.5));
  });

  it("applies speed_boost from held item", () => {
    vi.mocked(getHeldItem).mockReturnValue({
      name: "choice-scarf",
      displayName: "Choice Scarf",
      effect: "1.5x Speed",
      battleModifier: { type: "speed_boost", value: 1.5 },
    });
    const slot = createMockTeamSlot(mockCharizard);
    slot.heldItem = "choice-scarf";
    const bp = createMockBattlePokemon(slot);
    const boosted = getEffectiveSpeed(bp);

    // Compare to unboosted
    vi.mocked(getHeldItem).mockReturnValue(undefined);
    const slotNoItem = createMockTeamSlot(mockCharizard);
    slotNoItem.heldItem = null;
    const bpNoItem = createMockBattlePokemon(slotNoItem);
    const base = getEffectiveSpeed(bpNoItem);

    expect(boosted).toBe(Math.floor(base * 1.5));
  });

  it("applies speed stage multiplier", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const base = createMockBattlePokemon(slot);
    const raised = createMockBattlePokemon(slot, {
      statStages: { ...base.statStages, speed: 2 },
    });
    const baseSpeed = getEffectiveSpeed(base);
    const raisedSpeed = getEffectiveSpeed(raised);
    expect(raisedSpeed).toBe(Math.floor(baseSpeed * getStatStageMultiplier(2)));
  });

  it("skips item boost when heldItem is null", () => {
    const slot = createMockTeamSlot(mockCharizard);
    slot.heldItem = null;
    const bp = createMockBattlePokemon(slot);
    // Should not throw
    const speed = getEffectiveSpeed(bp);
    expect(speed).toBeGreaterThan(0);
  });
});

// --- getEffectiveTypes ---

describe("getEffectiveTypes", () => {
  it("returns base types by default", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    expect(getEffectiveTypes(bp)).toEqual(["fire", "flying"]);
  });

  it("returns tera type when terastallized", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot, {
      isTerastallized: true,
      teraType: "steel",
    });
    expect(getEffectiveTypes(bp)).toEqual(["steel"]);
  });

  it("returns mega forme types when mega evolved", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot, {
      isMegaEvolved: true,
      megaFormeData: {
        name: "charizard-mega-x",
        types: [
          { slot: 1, type: { name: "fire" } },
          { slot: 2, type: { name: "dragon" } },
        ],
        stats: [],
        ability: "tough-claws",
        spriteUrl: null,
      },
    });
    expect(getEffectiveTypes(bp)).toEqual(["fire", "dragon"]);
  });

  it("tera overrides mega if both set", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot, {
      isTerastallized: true,
      teraType: "fairy",
      isMegaEvolved: true,
      megaFormeData: {
        name: "charizard-mega-x",
        types: [
          { slot: 1, type: { name: "fire" } },
          { slot: 2, type: { name: "dragon" } },
        ],
        stats: [],
        ability: "tough-claws",
        spriteUrl: null,
      },
    });
    expect(getEffectiveTypes(bp)).toEqual(["fairy"]);
  });

  it("returns single type for mono-type pokemon", () => {
    const slot = createMockTeamSlot(mockBlastoise);
    const bp = createMockBattlePokemon(slot);
    expect(getEffectiveTypes(bp)).toEqual(["water"]);
  });
});

// --- getOriginalTypes ---

describe("getOriginalTypes", () => {
  it("returns base types regardless of tera/mega", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot, {
      isTerastallized: true,
      teraType: "steel",
      isMegaEvolved: true,
      megaFormeData: {
        name: "mega-charizard-x",
        types: [
          { slot: 1, type: { name: "fire" } },
          { slot: 2, type: { name: "dragon" } },
        ],
        stats: [],
        ability: "tough-claws",
        spriteUrl: null,
      },
    });
    expect(getOriginalTypes(bp)).toEqual(["fire", "flying"]);
  });
});

// --- initSideConditions ---

describe("initSideConditions", () => {
  it("returns default side conditions", () => {
    expect(initSideConditions()).toEqual({
      stealthRock: false,
      spikesLayers: 0,
      toxicSpikesLayers: 0,
      stickyWeb: false,
      reflect: 0,
      lightScreen: 0,
    });
  });

  it("returns a new object each call", () => {
    const a = initSideConditions();
    const b = initSideConditions();
    expect(a).not.toBe(b);
  });
});

// --- getMoveIndexFromAction ---

describe("getMoveIndexFromAction", () => {
  it("returns moveIndex for MOVE action", () => {
    expect(getMoveIndexFromAction({ type: "MOVE", moveIndex: 2 })).toBe(2);
  });

  it("returns moveIndex for MEGA_EVOLVE action", () => {
    expect(getMoveIndexFromAction({ type: "MEGA_EVOLVE", moveIndex: 1 })).toBe(1);
  });

  it("returns moveIndex for TERASTALLIZE action", () => {
    expect(getMoveIndexFromAction({ type: "TERASTALLIZE", moveIndex: 3 })).toBe(3);
  });

  it("returns moveIndex for DYNAMAX action", () => {
    expect(getMoveIndexFromAction({ type: "DYNAMAX", moveIndex: 0 })).toBe(0);
  });

  it("returns null for SWITCH action", () => {
    expect(getMoveIndexFromAction({ type: "SWITCH", pokemonIndex: 1 })).toBeNull();
  });
});

// --- cacheBattleMove / getCachedMoves ---

describe("cacheBattleMove / getCachedMoves", () => {
  it("stores and retrieves move data", () => {
    const data: BattleMoveData = {
      name: "flamethrower",
      power: 90,
      accuracy: 100,
      pp: 15,
      type: { name: "fire" },
      damage_class: { name: "special" },
      priority: 0,
    };
    cacheBattleMove("flamethrower", data);
    expect(getCachedMoves().get("flamethrower")).toBe(data);
  });

  it("overwrites existing entries", () => {
    const v1: BattleMoveData = {
      name: "tackle",
      power: 40,
      accuracy: 100,
      pp: 35,
      type: { name: "normal" },
      damage_class: { name: "physical" },
    };
    const v2: BattleMoveData = { ...v1, power: 50 };
    cacheBattleMove("tackle", v1);
    cacheBattleMove("tackle", v2);
    expect(getCachedMoves().get("tackle")?.power).toBe(50);
  });
});

// --- getBattleMove ---

describe("getBattleMove", () => {
  it("returns cached move data as Move", () => {
    cacheBattleMove("flamethrower", {
      name: "flamethrower",
      power: 90,
      accuracy: 100,
      pp: 15,
      type: { name: "fire" },
      damage_class: { name: "special" },
      priority: 0,
      meta: { drain: 0 },
    });
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    const move = getBattleMove(bp, 0); // "flamethrower" is at index 0
    expect(move.name).toBe("flamethrower");
    expect(move.power).toBe(90);
    expect(move.type.name).toBe("fire");
    expect(move.damage_class.name).toBe("special");
    expect(move.priority).toBe(0);
  });

  it("returns fallback 80-power move when not cached", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    const move = getBattleMove(bp, 0);
    expect(move.power).toBe(80);
    expect(move.accuracy).toBe(100);
    expect(move.damage_class.name).toBe("physical");
    expect(move.type.name).toBe("fire"); // first type of charizard
  });

  it("uses normal type for fallback when pokemon has no types", () => {
    const noTypePokemon = {
      ...mockCharizard,
      types: [],
    };
    const slot = createMockTeamSlot(noTypePokemon);
    const bp = createMockBattlePokemon(slot);
    const move = getBattleMove(bp, 0);
    expect(move.type.name).toBe("normal");
  });

  it("handles out-of-range move index gracefully", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    const move = getBattleMove(bp, 99);
    expect(move.power).toBe(80); // fallback
  });
});

// --- getMovePriority ---

describe("getMovePriority", () => {
  it("returns priority from cached move", () => {
    cacheBattleMove("flamethrower", {
      name: "flamethrower",
      power: 90,
      accuracy: 100,
      pp: 15,
      type: { name: "fire" },
      damage_class: { name: "special" },
      priority: 0,
    });
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    expect(getMovePriority(bp, { type: "MOVE", moveIndex: 0 })).toBe(0);
  });

  it("returns positive priority for priority moves", () => {
    cacheBattleMove("quick-attack", {
      name: "quick-attack",
      power: 40,
      accuracy: 100,
      pp: 30,
      type: { name: "normal" },
      damage_class: { name: "physical" },
      priority: 1,
    });
    const slot = createMockTeamSlot(mockCharizard);
    slot.selectedMoves = ["quick-attack"];
    const bp = createMockBattlePokemon(slot);
    expect(getMovePriority(bp, { type: "MOVE", moveIndex: 0 })).toBe(1);
  });

  it("returns 0 for SWITCH actions", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot);
    expect(getMovePriority(bp, { type: "SWITCH", pokemonIndex: 1 })).toBe(0);
  });
});

// --- getRelevantAtkStage / getRelevantDefStage ---

describe("getRelevantAtkStage", () => {
  it("returns attack stage for physical moves", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot, {
      statStages: { attack: 3, defense: 0, spAtk: -1, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
    });
    const physicalMove: Move = {
      id: 0, name: "earthquake", power: 100, accuracy: 100, pp: 10, priority: 0,
      type: { name: "ground" }, damage_class: { name: "physical" },
    };
    expect(getRelevantAtkStage(bp, physicalMove)).toBe(3);
  });

  it("returns spAtk stage for special moves", () => {
    const slot = createMockTeamSlot(mockCharizard);
    const bp = createMockBattlePokemon(slot, {
      statStages: { attack: 0, defense: 0, spAtk: 2, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
    });
    const specialMove: Move = {
      id: 0, name: "flamethrower", power: 90, accuracy: 100, pp: 15, priority: 0,
      type: { name: "fire" }, damage_class: { name: "special" },
    };
    expect(getRelevantAtkStage(bp, specialMove)).toBe(2);
  });
});

describe("getRelevantDefStage", () => {
  it("returns defense stage for physical moves", () => {
    const slot = createMockTeamSlot(mockBlastoise);
    const bp = createMockBattlePokemon(slot, {
      statStages: { attack: 0, defense: 4, spAtk: 0, spDef: -2, speed: 0, accuracy: 0, evasion: 0 },
    });
    const physicalMove: Move = {
      id: 0, name: "earthquake", power: 100, accuracy: 100, pp: 10, priority: 0,
      type: { name: "ground" }, damage_class: { name: "physical" },
    };
    expect(getRelevantDefStage(bp, physicalMove)).toBe(4);
  });

  it("returns spDef stage for special moves", () => {
    const slot = createMockTeamSlot(mockBlastoise);
    const bp = createMockBattlePokemon(slot, {
      statStages: { attack: 0, defense: 4, spAtk: 0, spDef: -2, speed: 0, accuracy: 0, evasion: 0 },
    });
    const specialMove: Move = {
      id: 0, name: "thunderbolt", power: 90, accuracy: 100, pp: 15, priority: 0,
      type: { name: "electric" }, damage_class: { name: "special" },
    };
    expect(getRelevantDefStage(bp, specialMove)).toBe(-2);
  });
});

// --- updatePokemon ---

describe("updatePokemon", () => {
  it("returns new state with updated pokemon at index", () => {
    const state = createMockBattleState();
    const active = state.player1.pokemon[0];
    const updated = { ...active, currentHp: 50 };
    const newState = updatePokemon(state, "player1", 0, updated);
    expect(newState.player1.pokemon[0].currentHp).toBe(50);
    expect(newState).not.toBe(state);
  });

  it("does not mutate original state", () => {
    const state = createMockBattleState();
    const original = state.player1.pokemon[0];
    const updated = { ...original, currentHp: 1 };
    updatePokemon(state, "player1", 0, updated);
    expect(state.player1.pokemon[0].currentHp).toBe(original.currentHp);
  });

  it("works with player2", () => {
    const state = createMockBattleState();
    const active = state.player2.pokemon[0];
    const updated = { ...active, status: "burn" as const };
    const newState = updatePokemon(state, "player2", 0, updated);
    expect(newState.player2.pokemon[0].status).toBe("burn");
    expect(newState.player1.pokemon[0].status).toBeNull();
  });
});

// --- getStatusText ---

describe("getStatusText", () => {
  it("maps burn", () => expect(getStatusText("burn")).toBe("burned"));
  it("maps paralyze", () => expect(getStatusText("paralyze")).toBe("paralyzed"));
  it("maps poison", () => expect(getStatusText("poison")).toBe("poisoned"));
  it("maps toxic", () => expect(getStatusText("toxic")).toBe("badly poisoned"));
  it("maps sleep", () => expect(getStatusText("sleep")).toBe("put to sleep"));
  it("maps freeze", () => expect(getStatusText("freeze")).toBe("frozen solid"));
  it("returns empty string for null", () => expect(getStatusText(null)).toBe(""));
});

// --- triggerOnStatDrop ---

describe("triggerOnStatDrop", () => {
  it("returns state unchanged when pokemon is fainted", () => {
    const state = createMockBattleState({ p1Overrides: { isFainted: true } });
    const log: BattleLogEntry[] = [];
    const result = triggerOnStatDrop(state, "player1", "attack", -1, log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("returns state unchanged when ability has no onStatDrop", () => {
    vi.mocked(getAbilityHooks).mockReturnValue(null);
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = triggerOnStatDrop(state, "player1", "attack", -1, log);
    expect(result).toBe(state);
  });

  it("boosts attack +2 for Defiant", () => {
    vi.mocked(getAbilityHooks).mockReturnValue({
      onStatDrop: ({ pokemon }) => ({
        stat: "attack",
        stages: 2,
        message: `${pokemon.slot.pokemon.name}'s Defiant sharply raised its Attack!`,
      }),
    });
    const state = createMockBattleState();
    state.player1.pokemon[0].slot.ability = "defiant";
    const log: BattleLogEntry[] = [];
    const result = triggerOnStatDrop(state, "player1", "defense", -1, log);
    expect(result.player1.pokemon[0].statStages.attack).toBe(2);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("Defiant");
  });

  it("boosts spAtk +2 for Competitive", () => {
    vi.mocked(getAbilityHooks).mockReturnValue({
      onStatDrop: ({ pokemon }) => ({
        stat: "spAtk",
        stages: 2,
        message: `${pokemon.slot.pokemon.name}'s Competitive sharply raised its Sp. Atk!`,
      }),
    });
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = triggerOnStatDrop(state, "player1", "speed", -1, log);
    expect(result.player1.pokemon[0].statStages.spAtk).toBe(2);
    expect(log[0].message).toContain("Competitive");
  });

  it("clamps stat boost to +6", () => {
    vi.mocked(getAbilityHooks).mockReturnValue({
      onStatDrop: () => ({
        stat: "attack",
        stages: 2,
        message: "Defiant boost!",
      }),
    });
    const state = createMockBattleState({
      p1Overrides: {
        statStages: { attack: 5, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
      },
    });
    const log: BattleLogEntry[] = [];
    const result = triggerOnStatDrop(state, "player1", "speed", -1, log);
    expect(result.player1.pokemon[0].statStages.attack).toBe(6);
  });

  it("does not log when stage is already at max", () => {
    vi.mocked(getAbilityHooks).mockReturnValue({
      onStatDrop: () => ({
        stat: "attack",
        stages: 2,
        message: "Defiant boost!",
      }),
    });
    const state = createMockBattleState({
      p1Overrides: {
        statStages: { attack: 6, defense: 0, spAtk: 0, spDef: 0, speed: 0, accuracy: 0, evasion: 0 },
      },
    });
    const log: BattleLogEntry[] = [];
    triggerOnStatDrop(state, "player1", "speed", -1, log);
    expect(log).toHaveLength(0);
  });
});

// --- applyFieldEffect ---

describe("applyFieldEffect", () => {
  it("returns state unchanged when effect is null", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, null, log);
    expect(result).toBe(state);
    expect(log).toHaveLength(0);
  });

  it("applies sun weather", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "weather", weather: "sun" }, log);
    expect(result.field.weather).toBe("sun");
    expect(result.field.weatherTurnsLeft).toBe(5);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("harsh sunlight");
    expect(log[0].kind).toBe("weather");
  });

  it("applies rain weather", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "weather", weather: "rain" }, log);
    expect(result.field.weather).toBe("rain");
    expect(log[0].message).toContain("rain");
  });

  it("applies sandstorm weather", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "weather", weather: "sandstorm" }, log);
    expect(result.field.weather).toBe("sandstorm");
    expect(log[0].message).toContain("sandstorm");
  });

  it("applies hail weather", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "weather", weather: "hail" }, log);
    expect(result.field.weather).toBe("hail");
    expect(log[0].message).toContain("hail");
  });

  it("applies electric terrain", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "terrain", terrain: "electric" }, log);
    expect(result.field.terrain).toBe("electric");
    expect(result.field.terrainTurnsLeft).toBe(5);
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain("Electric Terrain");
    expect(log[0].kind).toBe("terrain");
  });

  it("applies grassy terrain", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "terrain", terrain: "grassy" }, log);
    expect(result.field.terrain).toBe("grassy");
    expect(log[0].message).toContain("Grassy Terrain");
  });

  it("applies misty terrain", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "terrain", terrain: "misty" }, log);
    expect(result.field.terrain).toBe("misty");
    expect(log[0].message).toContain("Misty Terrain");
  });

  it("applies psychic terrain", () => {
    const state = createMockBattleState();
    const log: BattleLogEntry[] = [];
    const result = applyFieldEffect(state, { type: "terrain", terrain: "psychic" }, log);
    expect(result.field.terrain).toBe("psychic");
    expect(log[0].message).toContain("Psychic Terrain");
  });

  it("does not mutate original field state", () => {
    const state = createMockBattleState();
    const originalWeather = state.field.weather;
    const log: BattleLogEntry[] = [];
    applyFieldEffect(state, { type: "weather", weather: "sun" }, log);
    expect(state.field.weather).toBe(originalWeather);
  });
});
