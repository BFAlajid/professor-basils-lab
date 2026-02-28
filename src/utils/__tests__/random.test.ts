import { randomInt, randomChoice, shuffleArray, randomSeed } from "../random";

describe("randomInt", () => {
  it("returns integer in [min, max] over many iterations", () => {
    for (let i = 0; i < 50; i++) {
      const val = randomInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("returns min when min === max", () => {
    expect(randomInt(5, 5)).toBe(5);
  });
});

describe("randomChoice", () => {
  it("returns the only element from single-element array", () => {
    expect(randomChoice([42])).toBe(42);
  });

  it("throws on empty array", () => {
    expect(() => randomChoice([])).toThrow("randomChoice called on empty array");
  });

  it("returns an element from the array", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = randomChoice(arr);
    expect(arr).toContain(result);
  });
});

describe("shuffleArray", () => {
  it("preserves length and elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);

    expect(shuffled).toHaveLength(arr.length);
    for (const el of arr) {
      expect(shuffled).toContain(el);
    }
  });

  it("returns a new array (not the same reference)", () => {
    const arr = [1, 2, 3];
    const shuffled = shuffleArray(arr);

    expect(shuffled).not.toBe(arr);
  });

  it("does not modify the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleArray(arr);

    expect(arr).toEqual(copy);
  });
});

describe("randomSeed", () => {
  it("returns an unsigned 32-bit integer", () => {
    for (let i = 0; i < 20; i++) {
      const seed = randomSeed();
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xFFFFFFFF);
      expect(Number.isInteger(seed)).toBe(true);
    }
  });
});
