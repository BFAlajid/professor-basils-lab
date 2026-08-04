import { renderHook, act } from "@testing-library/react";
import { useDailyChallenge } from "../useDailyChallenge";
import { STORAGE_KEYS } from "@/utils/persistence";
import {
  generateChallenge,
  getUtcDateString,
  scorePlay,
  ballsUsed,
  DAILY_SLOT_COUNT,
  DAILY_MAX_BALLS_PER_SLOT,
  DAILY_BALL_BUDGET,
} from "@/utils/dailyChallenge";
import type { DailyLastRecord } from "@/types/daily";

// A real in-memory localStorage so writes round-trip (the global setup.ts
// stub has no backing store) — same pattern as trainerIdentity.test.ts.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) } as Response;
}

/** Drives the hook to completion via a round-robin ball spread across every
 * slot — mirrors the exhaustive-play strategy in dailyChallenge.test.ts. */
function playToCompletion(result: { current: ReturnType<typeof useDailyChallenge> }) {
  act(() => {
    for (let round = 0; round < DAILY_MAX_BALLS_PER_SLOT; round++) {
      for (let slot = 0; slot < DAILY_SLOT_COUNT; slot++) {
        result.current.throwBall(slot);
      }
    }
  });
}

describe("useDailyChallenge", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createMemoryStorage(),
      writable: true,
      configurable: true,
    });
    vi.mocked(global.fetch).mockReset();
    // Default: any GET degrades gracefully with no leaderboard entries.
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({
        date: getUtcDateString(),
        seed: 0,
        type: "encounter-gauntlet",
        params: { ballBudget: DAILY_BALL_BUDGET, slotCount: DAILY_SLOT_COUNT, maxBallsPerSlot: DAILY_MAX_BALLS_PER_SLOT },
        leaderboard: { entries: [], playerRank: null },
      })
    );
  });

  it("generates today's challenge deterministically via utils/dailyChallenge", () => {
    const { result, unmount } = renderHook(() => useDailyChallenge());
    const today = getUtcDateString();

    expect(result.current.today).toBe(today);
    expect(result.current.challenge).toEqual(generateChallenge(today));
    expect(result.current.record.status).toBe("idle");

    unmount();
  });

  it("moves to playing on the first throw and completes within the ball budget", () => {
    const { result, unmount } = renderHook(() => useDailyChallenge());

    playToCompletion(result);

    expect(result.current.complete).toBe(true);
    expect(result.current.record.status).toBe("complete");
    expect(ballsUsed(result.current.challenge, result.current.record.playLog)).toBeLessThanOrEqual(
      DAILY_BALL_BUDGET
    );

    unmount();
  });

  it("keeps the running score in sync with utils/dailyChallenge.scorePlay", () => {
    const { result, unmount } = renderHook(() => useDailyChallenge());

    playToCompletion(result);

    const expectedScore = scorePlay(result.current.challenge, result.current.record.playLog);
    expect(result.current.record.score).toBe(expectedScore);

    unmount();
  });

  it("ignores further throws once the challenge is already complete", () => {
    const { result, unmount } = renderHook(() => useDailyChallenge());

    playToCompletion(result);
    const throwsAtCompletion = result.current.record.playLog.throws.length;

    act(() => {
      result.current.throwBall(0);
      result.current.throwBall(1);
    });

    expect(result.current.record.playLog.throws.length).toBe(throwsAtCompletion);

    unmount();
  });

  it("persists the play record to localStorage under STORAGE_KEYS.dailyLast", () => {
    const { result, unmount } = renderHook(() => useDailyChallenge());

    act(() => {
      result.current.throwBall(0);
    });

    const raw = window.localStorage.getItem(STORAGE_KEYS.dailyLast);
    expect(raw).toBeTruthy();
    const persisted: DailyLastRecord = JSON.parse(raw!);
    expect(persisted.date).toBe(getUtcDateString());
    expect(persisted.playLog.throws).toHaveLength(1);

    unmount();
  });

  it("rolls over to a fresh record when the persisted one is from a previous UTC day", () => {
    window.localStorage.setItem(
      STORAGE_KEYS.dailyLast,
      JSON.stringify({
        date: "2000-01-01",
        status: "complete",
        playLog: { throws: [{ slot: 0, attemptIndex: 0 }] },
        score: 999,
        submitted: true,
      })
    );

    const { result, unmount } = renderHook(() => useDailyChallenge());

    expect(result.current.record.date).toBe(getUtcDateString());
    expect(result.current.record.status).toBe("idle");
    expect(result.current.record.playLog.throws).toHaveLength(0);
    expect(result.current.record.score).toBe(0);

    unmount();
  });

  it("submit is a no-op while the challenge is still in progress", async () => {
    const { result, unmount } = renderHook(() => useDailyChallenge());

    let rank: number | null = null;
    await act(async () => {
      rank = await result.current.submit();
    });

    expect(rank).toBeNull();
    const postCall = vi.mocked(global.fetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall).toBeUndefined();

    unmount();
  });

  it("submits the score once complete and marks the record submitted", async () => {
    const today = getUtcDateString();
    vi.mocked(global.fetch).mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse({ rank: 3 }));
      }
      return Promise.resolve(
        jsonResponse({
          date: today,
          seed: 0,
          type: "encounter-gauntlet",
          params: { ballBudget: DAILY_BALL_BUDGET, slotCount: DAILY_SLOT_COUNT, maxBallsPerSlot: DAILY_MAX_BALLS_PER_SLOT },
          leaderboard: { entries: [], playerRank: null },
        })
      );
    });

    const { result, unmount } = renderHook(() => useDailyChallenge());
    playToCompletion(result);
    const finalScore = result.current.record.score;

    let rank: number | null = null;
    await act(async () => {
      rank = await result.current.submit();
    });

    expect(rank).toBe(3);
    expect(result.current.record.submitted).toBe(true);

    const postCall = vi.mocked(global.fetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.date).toBe(today);
    expect(body.score).toBe(finalScore);
    expect(typeof body.deviceKey).toBe("string");
    expect(typeof body.trainerId).toBe("string");

    unmount();
  });

  // Regression (Wave 7 re-review MINOR #3): a 403 (this device's trainerId is
  // already claimed by a different device) used to be a terminal error here —
  // useLeaderboard.submitScore already recovers from the same collision by
  // regenerating the id and retrying once; submit() must do the same instead
  // of leaving the daily challenge permanently unsubmittable.
  it("retries once with a regenerated trainerId when the server returns 403", async () => {
    const today = getUtcDateString();
    let postCount = 0;
    vi.mocked(global.fetch).mockImplementation((_input, init) => {
      if (init?.method === "POST") {
        postCount++;
        if (postCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () => Promise.resolve({ error: "owned by a different device" }),
          } as Response);
        }
        return Promise.resolve(jsonResponse({ rank: 4 }));
      }
      return Promise.resolve(
        jsonResponse({
          date: today,
          seed: 0,
          type: "encounter-gauntlet",
          params: { ballBudget: DAILY_BALL_BUDGET, slotCount: DAILY_SLOT_COUNT, maxBallsPerSlot: DAILY_MAX_BALLS_PER_SLOT },
          leaderboard: { entries: [], playerRank: null },
        })
      );
    });

    const { result, unmount } = renderHook(() => useDailyChallenge());
    playToCompletion(result);

    let rank: number | null = null;
    await act(async () => {
      rank = await result.current.submit();
    });

    expect(rank).toBe(4);
    expect(result.current.record.submitted).toBe(true);
    expect(postCount).toBe(2);

    const postCalls = vi.mocked(global.fetch).mock.calls.filter(([, init]) => init?.method === "POST");
    const firstTrainerId = JSON.parse(postCalls[0][1]!.body as string).trainerId;
    const retryTrainerId = JSON.parse(postCalls[1][1]!.body as string).trainerId;
    expect(retryTrainerId).not.toBe(firstTrainerId);

    unmount();
  });

  it("does not resubmit once the record is already marked submitted", async () => {
    const today = getUtcDateString();
    vi.mocked(global.fetch).mockImplementation((_input, init) => {
      if (init?.method === "POST") return Promise.resolve(jsonResponse({ rank: 1 }));
      return Promise.resolve(
        jsonResponse({
          date: today,
          seed: 0,
          type: "encounter-gauntlet",
          params: { ballBudget: DAILY_BALL_BUDGET, slotCount: DAILY_SLOT_COUNT, maxBallsPerSlot: DAILY_MAX_BALLS_PER_SLOT },
          leaderboard: { entries: [], playerRank: null },
        })
      );
    });

    const { result, unmount } = renderHook(() => useDailyChallenge());
    playToCompletion(result);

    await act(async () => {
      await result.current.submit();
    });
    const postCallsAfterFirst = vi
      .mocked(global.fetch)
      .mock.calls.filter(([, init]) => init?.method === "POST").length;
    expect(postCallsAfterFirst).toBe(1);

    let secondRank: number | null = 42;
    await act(async () => {
      secondRank = await result.current.submit();
    });
    const postCallsAfterSecond = vi
      .mocked(global.fetch)
      .mock.calls.filter(([, init]) => init?.method === "POST").length;

    expect(secondRank).toBeNull();
    expect(postCallsAfterSecond).toBe(postCallsAfterFirst);

    unmount();
  });
});
