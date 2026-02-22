import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStatusModifier, calculateCatchProbability, shouldWildFlee } from "../catchRate";

// Mock getBallModifier
vi.mock("@/data/pokeBalls", () => ({
  getBallModifier: vi.fn((ball: string) => {
    const mods: Record<string, number> = {
      "poke-ball": 1,
      "great-ball": 1.5,
      "ultra-ball": 2,
      "master-ball": 255,
    };
    return mods[ball] ?? 1;
  }),
}));

describe("getStatusModifier", () => {
  it("returns 2.5 for sleep", () => {
    expect(getStatusModifier("sleep")).toBe(2.5);
  });

  it("returns 2.5 for freeze", () => {
    expect(getStatusModifier("freeze")).toBe(2.5);
  });

  it("returns 1.5 for paralyze", () => {
    expect(getStatusModifier("paralyze")).toBe(1.5);
  });

  it("returns 1.5 for poison", () => {
    expect(getStatusModifier("poison")).toBe(1.5);
  });

  it("returns 1.5 for burn", () => {
    expect(getStatusModifier("burn")).toBe(1.5);
  });

  it("returns 1 for no status", () => {
    expect(getStatusModifier(null)).toBe(1);
  });
});

describe("calculateCatchProbability", () => {
  const baseContext = {
    turn: 1,
    isNight: false,
    isCave: false,
    isWater: false,
    wildPokemonTypes: ["normal" as const],
    wildPokemonLevel: 30,
    playerPokemonLevel: 50,
    wildHpPercent: 0.5,
    wildStatus: null as const,
    isRepeatCatch: false,
  };

  it("Master Ball always catches", () => {
    const result = calculateCatchProbability(3, 100, 100, null, "master-ball", baseContext);
    expect(result.isCaught).toBe(true);
    expect(result.shakeChecks).toEqual([true, true, true, true]);
  });

  it("higher HP means lower catch rate", () => {
    // Running catch probability many times to check statistical tendency
    // With low HP, catch probability should be higher
    let lowHpCatches = 0;
    let fullHpCatches = 0;

    for (let i = 0; i < 100; i++) {
      const lowHp = calculateCatchProbability(100, 1, 100, null, "ultra-ball", baseContext);
      const fullHp = calculateCatchProbability(100, 100, 100, null, "ultra-ball", baseContext);
      if (lowHp.isCaught) lowHpCatches++;
      if (fullHp.isCaught) fullHpCatches++;
    }

    // Low HP should statistically have more catches
    expect(lowHpCatches).toBeGreaterThanOrEqual(fullHpCatches);
  });

  it("status conditions increase catch rate", () => {
    // Sleep should help more than no status
    let sleepCatches = 0;
    let noStatusCatches = 0;

    for (let i = 0; i < 200; i++) {
      const withSleep = calculateCatchProbability(45, 50, 100, "sleep", "poke-ball", baseContext);
      const noStatus = calculateCatchProbability(45, 50, 100, null, "poke-ball", baseContext);
      if (withSleep.isCaught) sleepCatches++;
      if (noStatus.isCaught) noStatusCatches++;
    }

    expect(sleepCatches).toBeGreaterThanOrEqual(noStatusCatches);
  });

  it("returns shake checks array", () => {
    const result = calculateCatchProbability(45, 50, 100, null, "poke-ball", baseContext);
    expect(result.shakeChecks.length).toBeGreaterThanOrEqual(1);
    expect(result.shakeChecks.length).toBeLessThanOrEqual(4);
  });
});

describe("shouldWildFlee", () => {
  it("returns a boolean", () => {
    const result = shouldWildFlee(45, 1);
    expect(typeof result).toBe("boolean");
  });

  it("high capture rate means less fleeing", () => {
    // Run many iterations
    let highRateFlee = 0;
    let lowRateFlee = 0;

    for (let i = 0; i < 500; i++) {
      if (shouldWildFlee(255, 1)) highRateFlee++;
      if (shouldWildFlee(3, 1)) lowRateFlee++;
    }

    expect(lowRateFlee).toBeGreaterThan(highRateFlee);
  });
});
