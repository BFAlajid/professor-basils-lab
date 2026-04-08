import { describe, it, expect } from "vitest";

// Test the speed calculation formula used by SpeedOptimizer
// floor(floor((2*base + iv + floor(ev/4)) * level/100 + 5) * natureMult)

function calcSpeed(baseSpe: number, iv: number, ev: number, natureMult: number, level: number = 50): number {
  return Math.floor(
    Math.floor((2 * baseSpe + iv + Math.floor(ev / 4)) * level / 100 + 5) * natureMult
  );
}

function findMinEvs(baseSpe: number, iv: number, natureMult: number, targetSpeed: number): number | null {
  for (let ev = 0; ev <= 252; ev += 4) {
    if (calcSpeed(baseSpe, iv, ev, natureMult) >= targetSpeed) return ev;
  }
  return null;
}

describe("speed calculation", () => {
  it("calculates max speed for base 100 with +Spe nature", () => {
    // Volcarona: base 100, 31 IVs, 252 EVs, Jolly (1.1x), level 50
    // floor(floor((200 + 31 + 63) * 50/100 + 5) * 1.1)
    // = floor(floor(294 * 0.5 + 5) * 1.1) = floor(floor(152) * 1.1) = floor(152 * 1.1) = floor(167.2) = 167
    const result = calcSpeed(100, 31, 252, 1.1);
    expect(result).toBe(167);
  });

  it("calculates max speed for base 130 with +Spe nature", () => {
    // Jolteon: base 130, 31 IVs, 252 EVs, Timid (1.1x), level 50
    // floor(floor((260 + 31 + 63) * 50/100 + 5) * 1.1)
    // = floor(floor(354 * 0.5 + 5) * 1.1) = floor(floor(182) * 1.1) = floor(200.2) = 200
    const result = calcSpeed(130, 31, 252, 1.1);
    expect(result).toBe(200);
  });

  it("calculates speed with 0 EVs", () => {
    // Base 100, 31 IVs, 0 EVs, neutral, level 50
    // floor(floor((200 + 31 + 0) * 50/100 + 5) * 1.0) = floor(120.5) = floor(120) * 1.0 = 120
    const result = calcSpeed(100, 31, 0, 1.0);
    expect(result).toBe(120);
  });

  it("calculates speed with negative nature", () => {
    // Base 100, 31 IVs, 252 EVs, -Spe nature, level 50
    // floor(floor((200 + 31 + 63) * 50/100 + 5) * 0.9) = floor(152 * 0.9) = floor(136.8) = 136
    const result = calcSpeed(100, 31, 252, 0.9);
    expect(result).toBe(136);
  });

  it("handles base 142 Dragapult max speed", () => {
    // Dragapult: base 142, 31 IVs, 252 EVs, +Spe
    // floor(floor((284 + 31 + 63) * 50/100 + 5) * 1.1)
    // = floor(floor(378 * 0.5 + 5) * 1.1) = floor(floor(194) * 1.1) = floor(213.4) = 213
    const result = calcSpeed(142, 31, 252, 1.1);
    expect(result).toBe(213);
  });

  it("scarf Dragapult speed", () => {
    // Max speed Dragapult with scarf: 213 * 1.5 = 319.5 -> floor = 319
    const maxSpeed = calcSpeed(142, 31, 252, 1.1);
    const scarfSpeed = Math.floor(maxSpeed * 1.5);
    expect(scarfSpeed).toBe(319);
  });
});

describe("findMinEvs", () => {
  it("finds minimum EVs to outspeed a target", () => {
    // Need to outspeed max speed Volcarona (167) with Garchomp (base 102)
    // With +Spe nature, how many EVs to hit 168?
    const evs = findMinEvs(102, 31, 1.1, 168);
    expect(evs).not.toBeNull();
    expect(evs!).toBeLessThanOrEqual(252);
    // Verify the speed is actually >= 168
    expect(calcSpeed(102, 31, evs!, 1.1)).toBeGreaterThanOrEqual(168);
    // And one step lower is not enough
    if (evs! > 0) {
      expect(calcSpeed(102, 31, evs! - 4, 1.1)).toBeLessThan(168);
    }
  });

  it("returns 0 EVs when base speed already outspeeds", () => {
    // Dragapult (base 142) outspeeding something slow with +Spe nature
    const evs = findMinEvs(142, 31, 1.1, 100);
    expect(evs).toBe(0);
  });

  it("returns null when target is unreachable", () => {
    // Ferrothorn (base 20) trying to outspeed max Dragapult + scarf (319) with neutral nature
    const evs = findMinEvs(20, 31, 1.0, 320);
    expect(evs).toBeNull();
  });

  it("returns exact EVs needed for neutral nature outspeed", () => {
    // Garchomp base 102, neutral, outspeed base 80 max neutral (Dragonite)
    // Max Dragonite neutral: calcSpeed(80, 31, 252, 1.0)
    const dragoniteMax = calcSpeed(80, 31, 252, 1.0);
    const evs = findMinEvs(102, 31, 1.0, dragoniteMax + 1);
    expect(evs).not.toBeNull();
    expect(calcSpeed(102, 31, evs!, 1.0)).toBeGreaterThanOrEqual(dragoniteMax + 1);
  });

  it("EVs are always multiples of 4", () => {
    const evs = findMinEvs(80, 31, 1.1, 150);
    if (evs !== null) {
      expect(evs % 4).toBe(0);
    }
  });
});
