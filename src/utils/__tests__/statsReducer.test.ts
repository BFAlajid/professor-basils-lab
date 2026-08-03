import { describe, it, expect } from "vitest";
import { statsReducer, DEFAULT_STATS, type PlayerStats } from "../statsReducer";

function makeState(overrides?: Partial<PlayerStats>): PlayerStats {
  return { ...DEFAULT_STATS, ...overrides };
}

describe("statsReducer", () => {
  describe("ADD_MONEY", () => {
    it("adds a positive amount to money and totalMoneyEarned", () => {
      const state = makeState({ money: 100, totalMoneyEarned: 50 });
      const result = statsReducer(state, { type: "ADD_MONEY", amount: 25 });
      expect(result.money).toBe(125);
      expect(result.totalMoneyEarned).toBe(75);
    });

    it("rejects a negative amount and returns the same state", () => {
      const state = makeState({ money: 100, totalMoneyEarned: 50 });
      const result = statsReducer(state, { type: "ADD_MONEY", amount: -25 });
      expect(result).toBe(state);
      expect(result.money).toBe(100);
      expect(result.totalMoneyEarned).toBe(50);
    });

    it("rejects NaN and returns the same state", () => {
      const state = makeState({ money: 100 });
      const result = statsReducer(state, { type: "ADD_MONEY", amount: NaN });
      expect(result).toBe(state);
    });

    it("rejects Infinity and returns the same state", () => {
      const state = makeState({ money: 100 });
      const result = statsReducer(state, { type: "ADD_MONEY", amount: Infinity });
      expect(result).toBe(state);
    });

    it("allows a zero amount", () => {
      const state = makeState({ money: 100, totalMoneyEarned: 50 });
      const result = statsReducer(state, { type: "ADD_MONEY", amount: 0 });
      expect(result.money).toBe(100);
      expect(result.totalMoneyEarned).toBe(50);
    });
  });

  describe("SPEND_MONEY", () => {
    it("subtracts a positive amount from money and adds to totalMoneySpent", () => {
      const state = makeState({ money: 100, totalMoneySpent: 10 });
      const result = statsReducer(state, { type: "SPEND_MONEY", amount: 40 });
      expect(result.money).toBe(60);
      expect(result.totalMoneySpent).toBe(50);
    });

    it("rejects a negative amount and returns the same state", () => {
      const state = makeState({ money: 100, totalMoneySpent: 10 });
      const result = statsReducer(state, { type: "SPEND_MONEY", amount: -40 });
      expect(result).toBe(state);
      expect(result.money).toBe(100);
      expect(result.totalMoneySpent).toBe(10);
    });

    it("rejects NaN and returns the same state", () => {
      const state = makeState({ money: 100 });
      const result = statsReducer(state, { type: "SPEND_MONEY", amount: NaN });
      expect(result).toBe(state);
    });

    it("rejects Infinity and returns the same state", () => {
      const state = makeState({ money: 100 });
      const result = statsReducer(state, { type: "SPEND_MONEY", amount: Infinity });
      expect(result).toBe(state);
    });

    it("still rejects spending more money than available (pre-existing guard)", () => {
      const state = makeState({ money: 10 });
      const result = statsReducer(state, { type: "SPEND_MONEY", amount: 40 });
      expect(result).toBe(state);
    });

    it("allows a zero amount", () => {
      const state = makeState({ money: 100, totalMoneySpent: 10 });
      const result = statsReducer(state, { type: "SPEND_MONEY", amount: 0 });
      expect(result.money).toBe(100);
      expect(result.totalMoneySpent).toBe(10);
    });
  });

  describe("other actions (sanity, unaffected by this change)", () => {
    it("INCREMENT bumps a numeric key", () => {
      const state = makeState({ totalCaught: 3 });
      const result = statsReducer(state, { type: "INCREMENT", key: "totalCaught", amount: 2 });
      expect(result.totalCaught).toBe(5);
    });

    it("default case returns the same state for unknown action", () => {
      const state = makeState();
      // @ts-expect-error -- deliberately invalid action type for the exhaustiveness fallback
      const result = statsReducer(state, { type: "NOT_A_REAL_ACTION" });
      expect(result).toBe(state);
    });
  });
});
