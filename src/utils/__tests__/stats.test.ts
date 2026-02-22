import { describe, it, expect } from "vitest";
import { calculateHP, calculateStat, calculateAllStats, getTotalEVs, getRemainingEVs } from "../stats";

describe("calculateHP", () => {
  it("calculates HP correctly at level 50", () => {
    // Base 100 HP, 31 IVs, 252 EVs at level 50
    // = floor(((2*100 + 31 + floor(252/4)) * 50) / 100) + 50 + 10
    // = floor(((200 + 31 + 63) * 50) / 100) + 60
    // = floor(294 * 50 / 100) + 60
    // = floor(147) + 60 = 207
    const result = calculateHP(100, 31, 252);
    expect(result).toBe(207);
  });

  it("calculates HP with 0 EVs and IVs", () => {
    const result = calculateHP(100, 0, 0);
    // = floor(((200 + 0 + 0) * 50) / 100) + 60
    // = floor(100) + 60 = 160
    expect(result).toBe(160);
  });

  it("returns 1 HP for Shedinja (base 1)", () => {
    const result = calculateHP(1, 31, 252);
    expect(result).toBe(1);
  });
});

describe("calculateStat", () => {
  it("applies positive nature modifier (+10%)", () => {
    const base = calculateStat(100, 31, 252, null, "attack");
    const boosted = calculateStat(100, 31, 252, { name: "adamant", increased: "attack", decreased: "spAtk" }, "attack");
    expect(boosted).toBeGreaterThan(base);
    // Should be roughly 10% more
    expect(boosted).toBe(Math.floor(base * 1.1));
  });

  it("applies negative nature modifier (-10%)", () => {
    const base = calculateStat(100, 31, 252, null, "attack");
    const reduced = calculateStat(100, 31, 252, { name: "modest", increased: "spAtk", decreased: "attack" }, "attack");
    expect(reduced).toBeLessThan(base);
    expect(reduced).toBe(Math.floor(base * 0.9));
  });

  it("neutral nature has no effect", () => {
    const noNature = calculateStat(100, 31, 252, null, "attack");
    const neutral = calculateStat(100, 31, 252, { name: "hardy", increased: null, decreased: null }, "attack");
    expect(neutral).toBe(noNature);
  });
});

describe("calculateAllStats", () => {
  it("calculates all 6 stats", () => {
    const base = { hp: 78, attack: 84, defense: 78, spAtk: 109, spDef: 85, speed: 100 };
    const ivs = { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 };
    const evs = { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 };
    const nature = { name: "timid", increased: "speed" as const, decreased: "attack" as const };

    const result = calculateAllStats(base, ivs, evs, nature);

    expect(result.hp).toBeGreaterThan(0);
    expect(result.attack).toBeGreaterThan(0);
    expect(result.defense).toBeGreaterThan(0);
    expect(result.spAtk).toBeGreaterThan(0);
    expect(result.spDef).toBeGreaterThan(0);
    expect(result.speed).toBeGreaterThan(0);

    // Speed should be boosted by nature
    const neutralSpeed = calculateStat(100, 31, 252, null, "speed");
    expect(result.speed).toBeGreaterThan(neutralSpeed);
  });
});

describe("getTotalEVs / getRemainingEVs", () => {
  it("sums all EVs correctly", () => {
    const evs = { hp: 252, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 0 };
    expect(getTotalEVs(evs)).toBe(508);
    expect(getRemainingEVs(evs)).toBe(2);
  });

  it("returns 510 remaining for empty EVs", () => {
    const evs = { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 };
    expect(getTotalEVs(evs)).toBe(0);
    expect(getRemainingEVs(evs)).toBe(510);
  });
});
