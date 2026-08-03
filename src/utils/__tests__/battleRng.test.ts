import { describe, it, expect, afterEach, vi } from "vitest";
import { battleRandom, seedBattleRng, clearBattleRng, deriveTurnSeed } from "../battleRng";

describe("battleRandom", () => {
  afterEach(() => {
    clearBattleRng();
    vi.restoreAllMocks();
  });

  it("defaults to Math.random() when unseeded", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    expect(battleRandom()).toBe(0.42);
    expect(spy).toHaveBeenCalled();
  });

  it("still delegates to Math.random() dynamically (picks up mocks applied after import)", () => {
    // Regression: an earlier implementation captured a reference to Math.random at
    // module-load time, so vi.spyOn(Math, "random") had no effect on battleRandom().
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(battleRandom()).toBe(0.99);
    spy.mockReturnValue(0.01);
    expect(battleRandom()).toBe(0.01);
  });

  it("uses a seeded deterministic stream once seeded", () => {
    seedBattleRng(123);
    const a = battleRandom();
    seedBattleRng(123);
    const b = battleRandom();
    expect(a).toBe(b);
  });

  it("produces values in [0, 1) while seeded", () => {
    seedBattleRng(456);
    for (let i = 0; i < 50; i++) {
      const v = battleRandom();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("clearBattleRng() restores Math.random() as the source", () => {
    seedBattleRng(1);
    battleRandom(); // consume from the seeded stream
    clearBattleRng();
    vi.spyOn(Math, "random").mockReturnValue(0.77);
    expect(battleRandom()).toBe(0.77);
  });
});

describe("deriveTurnSeed", () => {
  it("is deterministic: same inputs produce the same output", () => {
    expect(deriveTurnSeed(1000, 5)).toBe(deriveTurnSeed(1000, 5));
  });

  it("produces different seeds for different turn numbers", () => {
    expect(deriveTurnSeed(1000, 1)).not.toBe(deriveTurnSeed(1000, 2));
  });

  it("produces different seeds for different base seeds", () => {
    expect(deriveTurnSeed(1, 1)).not.toBe(deriveTurnSeed(2, 1));
  });

  it("returns a non-negative 32-bit unsigned integer", () => {
    const seed = deriveTurnSeed(4294967295, 999);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
