import { describe, it, expect } from "vitest";
import { makeRng, int, choice, shuffle } from "../seededRandom";

describe("makeRng", () => {
  it("produces floats in [0, 1)", () => {
    const rng = makeRng(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic: same seed produces the same sequence", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds produce different sequences", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("each call to makeRng starts an independent stream", () => {
    const rng = makeRng(7);
    const firstRun = Array.from({ length: 5 }, () => rng());
    const secondRng = makeRng(7);
    const secondRun = Array.from({ length: 5 }, () => secondRng());
    expect(firstRun).toEqual(secondRun);
  });
});

describe("int", () => {
  it("returns integers within [min, max] inclusive", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 200; i++) {
      const v = int(rng, 3, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = int(makeRng(5), 0, 100);
    const b = int(makeRng(5), 0, 100);
    expect(a).toBe(b);
  });

  it("handles min === max", () => {
    const rng = makeRng(1);
    expect(int(rng, 4, 4)).toBe(4);
  });
});

describe("choice", () => {
  it("returns an element from the array", () => {
    const rng = makeRng(11);
    const arr = ["a", "b", "c", "d"];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(choice(rng, arr));
    }
  });

  it("is deterministic for a given seed", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(choice(makeRng(3), arr)).toBe(choice(makeRng(3), arr));
  });
});

describe("shuffle", () => {
  it("returns a new array with the same elements", () => {
    const rng = makeRng(21);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(rng, arr);
    expect(shuffled).not.toBe(arr);
    expect([...shuffled].sort()).toEqual([...arr].sort());
  });

  it("does not mutate the input array", () => {
    const rng = makeRng(21);
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(rng, arr);
    expect(arr).toEqual(original);
  });

  it("is deterministic for a given seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(makeRng(55), arr)).toEqual(shuffle(makeRng(55), arr));
  });
});
