import { describe, it, expect } from "vitest";
import {
  seedForDate,
  generateChallenge,
  getUtcDateString,
  msUntilNextUtcReset,
  catchChanceForAttempt,
  resolveThrow,
  scorePlay,
  ballsUsed,
  isChallengeComplete,
  getSlotProgress,
  maxPossibleScore,
  DAILY_SLOT_COUNT,
  DAILY_BALL_BUDGET,
  DAILY_MAX_BALLS_PER_SLOT,
} from "../dailyChallenge";
import type { DailyChallenge, DailyPlayLog } from "@/types/daily";

describe("seedForDate", () => {
  // Pinned values — if this hash algorithm ever changes, every previously
  // generated daily challenge changes with it, so these are a deliberate
  // stability guard, not an incidental snapshot.
  it("is stable for known dates", () => {
    expect(seedForDate("2026-08-02")).toBe(1124177359);
    expect(seedForDate("2026-08-03")).toBe(1107399740);
    expect(seedForDate("2025-01-01")).toBe(2389166374);
  });

  it("returns an unsigned 32-bit integer", () => {
    const seed = seedForDate("2026-08-02");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });

  it("differs for different dates", () => {
    expect(seedForDate("2026-08-02")).not.toBe(seedForDate("2026-08-03"));
  });
});

describe("generateChallenge determinism", () => {
  it("produces a byte-identical challenge for the same date, called twice", () => {
    const a = generateChallenge("2026-08-02");
    const b = generateChallenge("2026-08-02");
    expect(a).toEqual(b);
  });

  it("produces a different challenge for a different date", () => {
    const a = generateChallenge("2026-08-02");
    const b = generateChallenge("2026-08-03");
    expect(a).not.toEqual(b);
    expect(a.seed).not.toBe(b.seed);
  });

  it("always returns the configured slot count with unique species", () => {
    const challenge = generateChallenge("2026-08-02");
    expect(challenge.encounters).toHaveLength(DAILY_SLOT_COUNT);
    const ids = challenge.encounters.map((e) => e.pokemonId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns sequential slot indices starting at 0", () => {
    const challenge = generateChallenge("2026-08-02");
    expect(challenge.encounters.map((e) => e.slot)).toEqual(
      Array.from({ length: DAILY_SLOT_COUNT }, (_, i) => i)
    );
  });

  it("precomputes exactly maxBallsPerSlot rolls per encounter, all in [0,1)", () => {
    const challenge = generateChallenge("2026-08-02");
    for (const e of challenge.encounters) {
      expect(e.rolls).toHaveLength(DAILY_MAX_BALLS_PER_SLOT);
      for (const r of e.rolls) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(1);
      }
    }
  });

  it("sets params to the documented gauntlet configuration", () => {
    const challenge = generateChallenge("2026-08-02");
    expect(challenge.params).toEqual({
      ballBudget: DAILY_BALL_BUDGET,
      slotCount: DAILY_SLOT_COUNT,
      maxBallsPerSlot: DAILY_MAX_BALLS_PER_SLOT,
    });
  });

  it("never uses Math.random (deterministic across many sampled dates)", () => {
    // If Math.random leaked in anywhere, two calls for the same date would
    // eventually diverge; sample a spread of dates to be confident.
    const dates = ["2020-01-01", "2023-06-15", "2026-08-02", "2030-12-31", "1999-09-09"];
    for (const date of dates) {
      expect(generateChallenge(date)).toEqual(generateChallenge(date));
    }
  });
});

describe("getUtcDateString / msUntilNextUtcReset", () => {
  it("formats as YYYY-MM-DD", () => {
    const date = new Date(Date.UTC(2026, 7, 2, 15, 30, 0));
    expect(getUtcDateString(date)).toBe("2026-08-02");
  });

  it("computes ms until the next UTC midnight", () => {
    const date = new Date(Date.UTC(2026, 7, 2, 23, 59, 0));
    expect(msUntilNextUtcReset(date)).toBe(60 * 1000);
  });

  it("returns close to 24h when called right after midnight", () => {
    const date = new Date(Date.UTC(2026, 7, 2, 0, 0, 1));
    expect(msUntilNextUtcReset(date)).toBe(23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
  });
});

describe("catchChanceForAttempt", () => {
  it("increases with successive attempts", () => {
    expect(catchChanceForAttempt(0.3, 1)).toBeGreaterThan(catchChanceForAttempt(0.3, 0));
    expect(catchChanceForAttempt(0.3, 2)).toBeGreaterThan(catchChanceForAttempt(0.3, 1));
  });

  it("caps below certainty", () => {
    expect(catchChanceForAttempt(0.9, 5)).toBeLessThan(1);
    expect(catchChanceForAttempt(0.9, 5)).toBeLessThanOrEqual(0.95);
  });
});

describe("resolveThrow", () => {
  const challenge = generateChallenge("2026-08-02");

  it("is deterministic for the same slot/attempt", () => {
    const a = resolveThrow(challenge, 0, 0);
    const b = resolveThrow(challenge, 0, 0);
    expect(a).toBe(b);
  });

  it("returns false for an out-of-range attempt index", () => {
    expect(resolveThrow(challenge, 0, 99)).toBe(false);
    expect(resolveThrow(challenge, 0, -1)).toBe(false);
  });

  it("returns false for a nonexistent slot", () => {
    expect(resolveThrow(challenge, 999, 0)).toBe(false);
  });
});

describe("scorePlay / ballsUsed / isChallengeComplete / getSlotProgress", () => {
  const challenge = generateChallenge("2026-08-02");

  it("awards 0 for an empty play log", () => {
    const log: DailyPlayLog = { throws: [] };
    expect(scorePlay(challenge, log)).toBe(0);
    expect(ballsUsed(challenge, log)).toBe(0);
    expect(isChallengeComplete(challenge, log)).toBe(false);
  });

  it("is deterministic given the same play inputs", () => {
    const log: DailyPlayLog = {
      throws: [
        { slot: 0, attemptIndex: 0 },
        { slot: 1, attemptIndex: 0 },
        { slot: 1, attemptIndex: 1 },
      ],
    };
    expect(scorePlay(challenge, log)).toBe(scorePlay(challenge, { throws: [...log.throws] }));
  });

  it("ignores out-of-order attempt indices rather than throwing", () => {
    const log: DailyPlayLog = { throws: [{ slot: 0, attemptIndex: 2 }] };
    expect(() => scorePlay(challenge, log)).not.toThrow();
    expect(ballsUsed(challenge, log)).toBe(0); // the skipped attemptIndex 2 is never consumed
  });

  it("ignores throws beyond the ball budget", () => {
    // Every possible (slot, attemptIndex) pair — far more than the budget
    // allows even accounting for skipped throws after an early catch.
    const throws = [];
    for (let s = 0; s < DAILY_SLOT_COUNT; s++) {
      for (let a = 0; a < DAILY_MAX_BALLS_PER_SLOT; a++) {
        throws.push({ slot: s, attemptIndex: a });
      }
    }
    const log: DailyPlayLog = { throws };
    expect(ballsUsed(challenge, log)).toBeLessThanOrEqual(DAILY_BALL_BUDGET);
  });

  it("marks the challenge complete once the ball budget is exhausted", () => {
    // Throw every ball at slot 0's max attempts repeatedly won't exceed
    // maxBallsPerSlot; spread across slots to actually exhaust the budget.
    const throws = [];
    let thrown = 0;
    let slot = 0;
    const attemptCounters: Record<number, number> = {};
    while (thrown < DAILY_BALL_BUDGET) {
      const attemptIndex = attemptCounters[slot] ?? 0;
      if (attemptIndex < DAILY_MAX_BALLS_PER_SLOT) {
        throws.push({ slot, attemptIndex });
        attemptCounters[slot] = attemptIndex + 1;
        thrown++;
      }
      slot = (slot + 1) % DAILY_SLOT_COUNT;
    }
    const log: DailyPlayLog = { throws };
    expect(ballsUsed(challenge, log)).toBe(DAILY_BALL_BUDGET);
    expect(isChallengeComplete(challenge, log)).toBe(true);
  });

  it("getSlotProgress reports caught/exhausted consistent with scorePlay", () => {
    const log: DailyPlayLog = {
      throws: [
        { slot: 0, attemptIndex: 0 },
        { slot: 0, attemptIndex: 1 },
        { slot: 0, attemptIndex: 2 },
      ],
    };
    const progress = getSlotProgress(challenge, log);
    const slot0 = progress.find((p) => p.slot === 0)!;
    expect(slot0.attemptsUsed).toBe(3);
    if (!slot0.caught) {
      expect(slot0.exhausted).toBe(true);
    }
    // If it was caught, at least one throw contributed to a positive score.
    if (slot0.caught) {
      expect(scorePlay(challenge, log)).toBeGreaterThan(0);
    }
  });

  it("never exceeds maxPossibleScore for any reachable play log", () => {
    // Exhaustively throw at every slot up to its max attempts (over budget
    // by design — scorePlay must still clip to the ball budget).
    const throws = [];
    for (let s = 0; s < DAILY_SLOT_COUNT; s++) {
      for (let a = 0; a < DAILY_MAX_BALLS_PER_SLOT; a++) {
        throws.push({ slot: s, attemptIndex: a });
      }
    }
    const log: DailyPlayLog = { throws };
    const score = scorePlay(challenge, log);
    expect(score).toBeLessThanOrEqual(maxPossibleScore(challenge));
  });
});

describe("maxPossibleScore", () => {
  it("is deterministic and positive for a generated challenge", () => {
    const challenge: DailyChallenge = generateChallenge("2026-08-02");
    const cap = maxPossibleScore(challenge);
    expect(cap).toBeGreaterThan(0);
    expect(maxPossibleScore(challenge)).toBe(cap);
  });
});
