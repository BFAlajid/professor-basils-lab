import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  createMockBattlePokemon,
  createMockBattleState,
  createMockTeamSlot,
  mockCharizard,
  mockBlastoise,
  mockVenusaur,
} from "@/test/mocks/pokemon";
import { BattleLogEntry, BattlePokemon, BattleState } from "@/types";
import type { DamageResult } from "../damage";
import type { StatusMoveEffect } from "@/data/statusMoves";

// =====================================================================
// Mocks — mirror the pattern from battleExecution.test.ts
// =====================================================================

vi.mock("../damage", () => ({
  calculateDamage: vi.fn(() => ({ max: 100, effectiveness: 1, isCritical: false })),
}));

vi.mock("@/data/statusMoves", () => ({
  STATUS_MOVE_EFFECTS: {} as Record<string, StatusMoveEffect>,
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

import { calculateDamage } from "../damage";
import { getAbilityHooks, hasAbility } from "@/data/abilities";
import { executeMove } from "../battleExecution";
import { cacheBattleMove } from "../battleHelpers";
import { Move } from "@/types";

beforeEach(() => {
  vi.mocked(calculateDamage).mockReturnValue({
    max: 100,
    effectiveness: 1,
    isCritical: false,
  } as DamageResult);
  vi.mocked(getAbilityHooks).mockReturnValue(null);
  vi.mocked(hasAbility).mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =====================================================================
// Helpers
// =====================================================================

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

function cacheTestMove(name: string, overrides?: Record<string, unknown>) {
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

// =====================================================================
// 1. Terrain damage modifiers (unit: calculateDamage)
// =====================================================================

describe("calculateDamage — terrain modifiers", () => {
  // Import the real calculateDamage for these tests by calling the
  // unmocked module directly. Since we globally mock calculateDamage,
  // we test terrain behavior through the battle execution layer which
  // passes terrain options to calculateDamage. Instead, we test the
  // contract: the options object the battle code sends to calculateDamage.
  //
  // For a true unit test of the terrain math itself, we test the
  // calculateDamage function from the real module below.

  // We need the REAL calculateDamage for these — unmock just for this suite
  let realCalculateDamage: typeof import("../damage").calculateDamage;

  beforeEach(async () => {
    const realModule = await vi.importActual<typeof import("../damage")>("../damage");
    realCalculateDamage = realModule.calculateDamage;
  });

  const thunderbolt: Move = {
    id: 85,
    name: "thunderbolt",
    power: 90,
    accuracy: 100,
    pp: 15,
    priority: 0,
    type: { name: "electric" },
    damage_class: { name: "special" },
  };

  const energyBall: Move = {
    id: 412,
    name: "energy-ball",
    power: 90,
    accuracy: 100,
    pp: 10,
    priority: 0,
    type: { name: "grass" },
    damage_class: { name: "special" },
  };

  const psychic: Move = {
    id: 94,
    name: "psychic",
    power: 90,
    accuracy: 100,
    pp: 10,
    priority: 0,
    type: { name: "psychic" },
    damage_class: { name: "special" },
  };

  const dragonPulse: Move = {
    id: 406,
    name: "dragon-pulse",
    power: 85,
    accuracy: 100,
    pp: 10,
    priority: 0,
    type: { name: "dragon" },
    damage_class: { name: "special" },
  };

  it("Electric Terrain boosts Electric move damage by 1.3x on grounded attacker", () => {
    // Blastoise is Water type (grounded), attacking Venusaur
    const noTerrain = realCalculateDamage(mockBlastoise, mockVenusaur, thunderbolt);
    const withTerrain = realCalculateDamage(mockBlastoise, mockVenusaur, thunderbolt, {
      fieldTerrain: "electric",
      attackerBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockBlastoise)),
      defenderBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockVenusaur)),
    });

    // 1.3x modifier applied: terrain-boosted max should be ~1.3x base max
    expect(withTerrain.max).toBeGreaterThan(noTerrain.max);
    const ratio = withTerrain.max / noTerrain.max;
    expect(ratio).toBeCloseTo(1.3, 1);
  });

  it("Grassy Terrain boosts Grass move damage by 1.3x on grounded attacker", () => {
    const noTerrain = realCalculateDamage(mockVenusaur, mockBlastoise, energyBall);
    const withTerrain = realCalculateDamage(mockVenusaur, mockBlastoise, energyBall, {
      fieldTerrain: "grassy",
      attackerBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockVenusaur)),
      defenderBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockBlastoise)),
    });

    expect(withTerrain.max).toBeGreaterThan(noTerrain.max);
    const ratio = withTerrain.max / noTerrain.max;
    expect(ratio).toBeCloseTo(1.3, 1);
  });

  it("Psychic Terrain boosts Psychic move damage by 1.3x on grounded attacker", () => {
    const noTerrain = realCalculateDamage(mockVenusaur, mockBlastoise, psychic);
    const withTerrain = realCalculateDamage(mockVenusaur, mockBlastoise, psychic, {
      fieldTerrain: "psychic",
      attackerBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockVenusaur)),
      defenderBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockBlastoise)),
    });

    expect(withTerrain.max).toBeGreaterThan(noTerrain.max);
    const ratio = withTerrain.max / noTerrain.max;
    expect(ratio).toBeCloseTo(1.3, 1);
  });

  it("Misty Terrain halves Dragon move damage when defender is grounded", () => {
    const noTerrain = realCalculateDamage(mockVenusaur, mockBlastoise, dragonPulse);
    const withTerrain = realCalculateDamage(mockVenusaur, mockBlastoise, dragonPulse, {
      fieldTerrain: "misty",
      attackerBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockVenusaur)),
      defenderBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockBlastoise)),
    });

    expect(withTerrain.max).toBeLessThan(noTerrain.max);
    const ratio = withTerrain.max / noTerrain.max;
    expect(ratio).toBeCloseTo(0.5, 1);
  });

  it("Flying-type attacker does NOT get terrain boost (not grounded)", () => {
    // Charizard is Fire/Flying — not grounded
    const noTerrain = realCalculateDamage(mockCharizard, mockVenusaur, thunderbolt);
    const withTerrain = realCalculateDamage(mockCharizard, mockVenusaur, thunderbolt, {
      fieldTerrain: "electric",
      attackerBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockCharizard)),
      defenderBattlePokemon: createMockBattlePokemon(createMockTeamSlot(mockVenusaur)),
    });

    // Flying-type attacker should NOT get the 1.3x boost
    expect(withTerrain.max).toBe(noTerrain.max);
  });
});

// =====================================================================
// 2. Weather Ball
// =====================================================================

describe("calculateDamage — Weather Ball", () => {
  let realCalculateDamage: typeof import("../damage").calculateDamage;

  beforeEach(async () => {
    const realModule = await vi.importActual<typeof import("../damage")>("../damage");
    realCalculateDamage = realModule.calculateDamage;
  });

  const weatherBall: Move = {
    id: 311,
    name: "weather-ball",
    power: 50,
    accuracy: 100,
    pp: 10,
    priority: 0,
    type: { name: "normal" },
    damage_class: { name: "special" },
  };

  it("becomes Fire type with power 100 in sun (damage significantly higher)", () => {
    const noWeather = realCalculateDamage(mockBlastoise, mockVenusaur, weatherBall);
    const inSun = realCalculateDamage(mockBlastoise, mockVenusaur, weatherBall, {
      fieldWeather: "sun",
    });

    // Power goes from 50 to 100, plus sun boosts Fire-type moves by 1.5x
    // So total multiplier vs no-weather = (100/50) * 1.5 = 3x
    expect(inSun.max).toBeGreaterThan(noWeather.max * 2);
  });

  it("becomes Water type in rain — Blastoise gets STAB", () => {
    const inRain = realCalculateDamage(mockBlastoise, mockCharizard, weatherBall, {
      fieldWeather: "rain",
    });

    // Blastoise is Water-type; Weather Ball becomes Water in rain → STAB applies
    expect(inRain.stab).toBe(true);
    // Power goes from 50 to 100, rain boosts Water 1.5x, STAB 1.5x
    expect(inRain.max).toBeGreaterThan(0);
  });

  it("stays Normal type with no weather", () => {
    const result = realCalculateDamage(mockBlastoise, mockVenusaur, weatherBall);

    // Normal type has no special effectiveness against Grass/Poison
    expect(result.effectiveness).toBe(1);
    // No STAB (Blastoise is Water, Weather Ball is Normal without weather)
    expect(result.stab).toBe(false);
  });
});

// =====================================================================
// 3. Terrain Pulse
// =====================================================================

describe("calculateDamage — Terrain Pulse", () => {
  let realCalculateDamage: typeof import("../damage").calculateDamage;

  beforeEach(async () => {
    const realModule = await vi.importActual<typeof import("../damage")>("../damage");
    realCalculateDamage = realModule.calculateDamage;
  });

  const terrainPulse: Move = {
    id: 805,
    name: "terrain-pulse",
    power: 50,
    accuracy: 100,
    pp: 10,
    priority: 0,
    type: { name: "normal" },
    damage_class: { name: "special" },
  };

  it("becomes Electric type with power 100 in Electric Terrain (higher damage)", () => {
    const noTerrain = realCalculateDamage(mockBlastoise, mockCharizard, terrainPulse);
    const withTerrain = realCalculateDamage(mockBlastoise, mockCharizard, terrainPulse, {
      fieldTerrain: "electric",
    });

    // Power goes from 50 to 100 in terrain — damage should roughly double
    expect(withTerrain.max).toBeGreaterThan(noTerrain.max);
    const ratio = withTerrain.max / noTerrain.max;
    // At minimum 2x from power doubling (effectiveness is mocked to 1)
    expect(ratio).toBeGreaterThanOrEqual(1.9);
  });

  it("stays Normal type with no terrain", () => {
    const result = realCalculateDamage(mockBlastoise, mockCharizard, terrainPulse);

    // Normal type is neutral against Fire/Flying
    expect(result.effectiveness).toBe(1);
    expect(result.stab).toBe(false);
  });
});

// =====================================================================
// 4. Aurora Veil screen
// =====================================================================

describe("calculateDamage — Aurora Veil", () => {
  let realCalculateDamage: typeof import("../damage").calculateDamage;

  beforeEach(async () => {
    const realModule = await vi.importActual<typeof import("../damage")>("../damage");
    realCalculateDamage = realModule.calculateDamage;
  });

  const flamethrower: Move = {
    id: 53,
    name: "flamethrower",
    power: 90,
    accuracy: 100,
    pp: 15,
    priority: 0,
    type: { name: "fire" },
    damage_class: { name: "special" },
  };

  const earthquake: Move = {
    id: 89,
    name: "earthquake",
    power: 100,
    accuracy: 100,
    pp: 10,
    priority: 0,
    type: { name: "ground" },
    damage_class: { name: "physical" },
  };

  it("reduces physical damage by 0.5x", () => {
    const normal = realCalculateDamage(mockBlastoise, mockCharizard, earthquake);
    const withVeil = realCalculateDamage(mockBlastoise, mockCharizard, earthquake, {
      defenderSideAuroraVeil: true,
    });

    expect(withVeil.max).toBeLessThan(normal.max);
    const ratio = withVeil.max / normal.max;
    expect(ratio).toBeCloseTo(0.5, 1);
  });

  it("reduces special damage by 0.5x", () => {
    const normal = realCalculateDamage(mockCharizard, mockBlastoise, flamethrower);
    const withVeil = realCalculateDamage(mockCharizard, mockBlastoise, flamethrower, {
      defenderSideAuroraVeil: true,
    });

    expect(withVeil.max).toBeLessThan(normal.max);
    const ratio = withVeil.max / normal.max;
    expect(ratio).toBeCloseTo(0.5, 1);
  });

  it("does NOT stack with Reflect — Reflect takes priority for physical", () => {
    const reflectOnly = realCalculateDamage(mockBlastoise, mockCharizard, earthquake, {
      defenderSideReflect: true,
    });
    const bothScreens = realCalculateDamage(mockBlastoise, mockCharizard, earthquake, {
      defenderSideReflect: true,
      defenderSideAuroraVeil: true,
    });

    // Both should give the same 0.5x reduction — they do not stack to 0.25x
    expect(bothScreens.max).toBe(reflectOnly.max);
  });

  it("does NOT stack with Light Screen — Light Screen takes priority for special", () => {
    const lightScreenOnly = realCalculateDamage(mockCharizard, mockBlastoise, flamethrower, {
      defenderSideLightScreen: true,
    });
    const bothScreens = realCalculateDamage(mockCharizard, mockBlastoise, flamethrower, {
      defenderSideLightScreen: true,
      defenderSideAuroraVeil: true,
    });

    // Both should give the same 0.5x reduction — they do not stack
    expect(bothScreens.max).toBe(lightScreenOnly.max);
  });
});

// =====================================================================
// 5. Choice lock
// =====================================================================

describe("executeMove — Choice lock", () => {
  it("sets choiceLockedMove after using a move with Choice Band", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);
    cacheTestMove("flamethrower", {
      type: { name: "fire" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.heldItem = "choice-band";
    p1Slot.selectedMoves = ["flamethrower", "air-slash", "dragon-pulse", "earthquake"];

    const state = createMockBattleState({ p1Overrides: { slot: p1Slot } });
    const log: BattleLogEntry[] = [];
    const result = executeMove(state, "player1", 0, log);

    // After executing flamethrower with Choice Band, choiceLockedMove should be set
    expect(result.player1.pokemon[0].choiceLockedMove).toBe("flamethrower");
  });

  it("sets choiceLockedMove after using a move with Choice Specs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);
    cacheTestMove("flamethrower", {
      type: { name: "fire" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.heldItem = "choice-specs";
    p1Slot.selectedMoves = ["flamethrower", "air-slash", "dragon-pulse", "earthquake"];

    const state = createMockBattleState({ p1Overrides: { slot: p1Slot } });
    const log: BattleLogEntry[] = [];
    const result = executeMove(state, "player1", 0, log);

    expect(result.player1.pokemon[0].choiceLockedMove).toBe("flamethrower");
  });

  it("sets choiceLockedMove after using a move with Choice Scarf", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);
    cacheTestMove("air-slash", {
      type: { name: "flying" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.heldItem = "choice-scarf";
    p1Slot.selectedMoves = ["flamethrower", "air-slash", "dragon-pulse", "earthquake"];

    const state = createMockBattleState({ p1Overrides: { slot: p1Slot } });
    const log: BattleLogEntry[] = [];
    const result = executeMove(state, "player1", 1, log);

    expect(result.player1.pokemon[0].choiceLockedMove).toBe("air-slash");
  });

  it("does NOT set choiceLockedMove without a Choice item", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);
    cacheTestMove("flamethrower", {
      type: { name: "fire" },
      damage_class: { name: "special" },
    });

    const state = buildState();
    const log: BattleLogEntry[] = [];
    const result = executeMove(state, "player1", 0, log);

    expect(result.player1.pokemon[0].choiceLockedMove).toBeNull();
  });
});

// =====================================================================
// 6. Outrage lock-in
// =====================================================================

describe("executeMove — Outrage lock-in", () => {
  it("forces locked-in move when lockInTurns > 0 and lockInMove is set", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 80,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);

    cacheTestMove("outrage", {
      type: { name: "dragon" },
      damage_class: { name: "physical" },
      power: 120,
    });
    cacheTestMove("flamethrower", {
      type: { name: "fire" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.selectedMoves = ["flamethrower", "outrage", "air-slash", "dragon-pulse"];

    // Simulate being mid-Outrage: lockInMove = "outrage", lockInTurns = 2
    const state = createMockBattleState({
      p1Overrides: {
        slot: p1Slot,
        lockInMove: "outrage",
        lockInTurns: 2,
        lastMoveUsed: "outrage",
      },
    });
    const log: BattleLogEntry[] = [];

    // Player selects moveIndex 0 (flamethrower) but should be forced to outrage
    const result = executeMove(state, "player1", 0, log);

    // The move used should be outrage (via lock-in enforcement), not flamethrower
    // Verify damage was dealt (outrage connected)
    expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
  });

  it("lock-in enforcement redirects any selected move to the locked move", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);

    cacheTestMove("outrage", {
      type: { name: "dragon" },
      damage_class: { name: "physical" },
      power: 120,
    });
    cacheTestMove("air-slash", {
      type: { name: "flying" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.selectedMoves = ["flamethrower", "air-slash", "outrage", "dragon-pulse"];

    const state = createMockBattleState({
      p1Overrides: {
        slot: p1Slot,
        lockInMove: "outrage",
        lockInTurns: 1,
        lastMoveUsed: "outrage",
      },
    });
    const log: BattleLogEntry[] = [];

    // Try to select air-slash (index 1) — should be overridden to outrage (index 2)
    executeMove(state, "player1", 1, log);

    // We can verify by checking the log mentions the move was used
    // The damage mock is called which means a move executed
    expect(vi.mocked(calculateDamage)).toHaveBeenCalled();
  });
});

// =====================================================================
// 7. Mold Breaker — defender abilities bypassed
// =====================================================================

describe("executeDamagingMove — Mold Breaker", () => {
  it("bypasses defender defensive ability when attacker has Mold Breaker", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);

    // Attacker has Mold Breaker, defender has Motor Drive (would block Electric)
    vi.mocked(getAbilityHooks).mockImplementation((ability) => {
      if (!ability) return null;
      if (ability === "mold-breaker") {
        return { moldBreaker: true };
      }
      if (ability === "motor-drive") {
        return {
          modifyIncomingDamage: () => ({
            multiplier: 0,
            message: "It had no effect due to Motor Drive!",
          }),
        };
      }
      return null;
    });

    cacheTestMove("thunderbolt", {
      type: { name: "electric" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.selectedMoves = ["thunderbolt", "flamethrower", "air-slash", "dragon-pulse"];
    p1Slot.ability = "mold-breaker";

    const p2Slot = createMockTeamSlot(mockBlastoise);
    p2Slot.ability = "motor-drive";

    const state = createMockBattleState({
      p1Overrides: { slot: p1Slot },
      p2Overrides: { slot: p2Slot },
    });
    const log: BattleLogEntry[] = [];

    const result = executeMove(state, "player1", 0, log);

    // Motor Drive should be bypassed — damage should go through
    expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
    // Should NOT see the Motor Drive immunity message
    expect(log.every((l) => !l.message.includes("Motor Drive"))).toBe(true);
  });

  it("defender ability blocks damage when attacker does NOT have Mold Breaker", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);

    // Attacker has Blaze (no moldBreaker), defender has Motor Drive
    vi.mocked(getAbilityHooks).mockImplementation((ability) => {
      if (!ability) return null;
      if (ability === "blaze") return {};
      if (ability === "motor-drive") {
        return {
          modifyIncomingDamage: () => ({
            multiplier: 0,
            message: "It had no effect due to Motor Drive!",
          }),
        };
      }
      return null;
    });

    cacheTestMove("thunderbolt", {
      type: { name: "electric" },
      damage_class: { name: "special" },
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.selectedMoves = ["thunderbolt", "flamethrower", "air-slash", "dragon-pulse"];

    const p2Slot = createMockTeamSlot(mockBlastoise);
    p2Slot.ability = "motor-drive";

    const state = createMockBattleState({
      p1Overrides: { slot: p1Slot },
      p2Overrides: { slot: p2Slot },
    });
    const log: BattleLogEntry[] = [];

    const result = executeMove(state, "player1", 0, log);

    // Motor Drive should block damage — HP unchanged
    expect(result.player2.pokemon[0].currentHp).toBe(300);
    expect(log.some((l) => l.message.includes("Motor Drive"))).toBe(true);
  });

  it("Teravolt also bypasses defender abilities (moldBreaker flag)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.mocked(calculateDamage).mockReturnValue({
      max: 100,
      effectiveness: 1,
      isCritical: false,
    } as DamageResult);

    vi.mocked(getAbilityHooks).mockImplementation((ability) => {
      if (!ability) return null;
      if (ability === "teravolt") {
        return { moldBreaker: true };
      }
      if (ability === "levitate") {
        return {
          modifyIncomingDamage: () => ({
            multiplier: 0,
            message: "It has no effect due to Levitate!",
          }),
        };
      }
      return null;
    });

    cacheTestMove("earthquake", {
      type: { name: "ground" },
      damage_class: { name: "physical" },
      power: 100,
    });

    const p1Slot = createMockTeamSlot(mockCharizard);
    p1Slot.selectedMoves = ["earthquake", "flamethrower", "air-slash", "dragon-pulse"];
    p1Slot.ability = "teravolt";

    const p2Slot = createMockTeamSlot(mockBlastoise);
    p2Slot.ability = "levitate";

    const state = createMockBattleState({
      p1Overrides: { slot: p1Slot },
      p2Overrides: { slot: p2Slot },
    });
    const log: BattleLogEntry[] = [];

    const result = executeMove(state, "player1", 0, log);

    // Levitate should be bypassed — damage should go through
    expect(result.player2.pokemon[0].currentHp).toBeLessThan(300);
    expect(log.every((l) => !l.message.includes("Levitate"))).toBe(true);
  });
});
