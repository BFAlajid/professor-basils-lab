import { renderHook, act, waitFor } from "@testing-library/react";
import { useLeaderboard } from "../useLeaderboard";
import type { LeaderboardEntry } from "@/types/leaderboard";

vi.mock("@/utils/trainerIdentity", () => ({
  getDeviceKey: vi.fn(() => "device-key-1234567890"),
  regenerateTrainerId: vi.fn(() => "999999999"),
}));

import { regenerateTrainerId } from "@/utils/trainerIdentity";

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    trainerName: "Ash",
    trainerId: "12345",
    score: 100,
    teamPokemon: ["pikachu"],
    timestamp: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: Partial<Response> = {}) {
  return { ok: true, status: 200, json: async () => body, ...init } as Response;
}

// Regression: a colliding trainerId (~90k-value legacy id space) used to 403
// forever with no recovery — the player was permanently locked out of the
// leaderboard. submitScore must now regenerate the id and retry once.
describe("useLeaderboard submitScore — 403 collision retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries once with a regenerated trainerId when the server returns 403", async () => {
    const fetchMock = vi
      .fn()
      // Initial GET on mount (leaderboard load)
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerRank: null }))
      // First POST — collision
      .mockResolvedValueOnce(
        jsonResponse({ error: "owned by a different device" }, { ok: false, status: 403 })
      )
      // Retry POST — succeeds with the regenerated id
      .mockResolvedValueOnce(jsonResponse({ rank: 3 }, { status: 201 }))
      // Leaderboard refresh after a successful submit
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerRank: 3 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useLeaderboard("battle-tower"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rank: number | null = null;
    await act(async () => {
      rank = await result.current.submitScore(makeEntry({ trainerId: "12345" }));
    });

    expect(rank).toBe(3);
    expect(regenerateTrainerId).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // The retry POST must carry the regenerated id, not the original.
    const retryCall = fetchMock.mock.calls[2];
    const retryBody = JSON.parse(retryCall[1].body as string);
    expect(retryBody.entry.trainerId).toBe("999999999");
  });

  it("does not regenerate or retry when the first submission succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerRank: null }))
      .mockResolvedValueOnce(jsonResponse({ rank: 1 }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerRank: 1 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useLeaderboard("battle-tower"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rank: number | null = null;
    await act(async () => {
      rank = await result.current.submitScore(makeEntry());
    });

    expect(rank).toBe(1);
    expect(regenerateTrainerId).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("surfaces an error and does not retry when the retry attempt also fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ entries: [], playerRank: null }))
      .mockResolvedValueOnce(
        jsonResponse({ error: "owned by a different device" }, { ok: false, status: 403 })
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: "owned by a different device" }, { ok: false, status: 403 })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useLeaderboard("battle-tower"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rank: number | null = 999;
    await act(async () => {
      rank = await result.current.submitScore(makeEntry());
    });

    expect(rank).toBeNull();
    expect(regenerateTrainerId).toHaveBeenCalledTimes(1);
    // Only one retry — no second regeneration/POST loop.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
