import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockZadd,
  mockZcard,
  mockZremrangebyrank,
  mockZrevrank,
  mockZrange,
  mockHset,
  mockHdel,
  mockHmget,
  mockIncr,
  mockExpire,
} = vi.hoisted(() => ({
  mockZadd: vi.fn(),
  mockZcard: vi.fn(),
  mockZremrangebyrank: vi.fn(),
  mockZrevrank: vi.fn(),
  mockZrange: vi.fn(),
  mockHset: vi.fn(),
  mockHdel: vi.fn(),
  mockHmget: vi.fn(),
  mockIncr: vi.fn(),
  mockExpire: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    zadd: mockZadd,
    zcard: mockZcard,
    zremrangebyrank: mockZremrangebyrank,
    zrevrank: mockZrevrank,
    zrange: mockZrange,
    hset: mockHset,
    hdel: mockHdel,
    hmget: mockHmget,
    incr: mockIncr,
    expire: mockExpire,
  },
}));

vi.mock("@/data/constants", () => ({
  LEADERBOARD_MAX_ENTRIES: 100,
}));

import { submitScore, getLeaderboard, getPlayerRank, checkRateLimit } from "../kv";
import type { LeaderboardEntry } from "@/types/leaderboard";

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    trainerName: "Ash",
    trainerId: "12345",
    score: 42,
    teamPokemon: ["pikachu"],
    timestamp: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("submitScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZcard.mockResolvedValue(1);
    mockZrevrank.mockResolvedValue(0);
    mockZrange.mockResolvedValue([]);
  });

  it("adds member via zadd with correct key and score", async () => {
    const entry = makeEntry({ score: 99 });
    await submitScore("battle-tower", entry);

    expect(mockZadd).toHaveBeenCalledWith(
      "leaderboard:battle-tower",
      { score: 99, member: "12345" }
    );
  });

  it("stores metadata in hash via hset", async () => {
    const entry = makeEntry();
    await submitScore("battle-tower", entry);

    expect(mockHset).toHaveBeenCalledWith(
      "leaderboard:battle-tower:data",
      {
        "12345": JSON.stringify({
          trainerName: "Ash",
          teamPokemon: ["pikachu"],
          timestamp: "2025-01-01T00:00:00.000Z",
        }),
      }
    );
  });

  it("trims when count exceeds LEADERBOARD_MAX_ENTRIES", async () => {
    mockZcard.mockResolvedValue(105);
    mockZrange.mockResolvedValue(["old1", "old2", "old3", "old4", "old5"]);

    await submitScore("elo-rating", makeEntry());

    expect(mockZremrangebyrank).toHaveBeenCalledWith(
      "leaderboard:elo-rating",
      0,
      4 // 105 - 100 - 1
    );
    expect(mockHdel).toHaveBeenCalledWith(
      "leaderboard:elo-rating:data",
      "old1", "old2", "old3", "old4", "old5"
    );
  });

  it("does not trim when count is within limit", async () => {
    mockZcard.mockResolvedValue(50);

    await submitScore("battle-tower", makeEntry());

    expect(mockZremrangebyrank).not.toHaveBeenCalled();
  });

  it("returns 1-indexed rank", async () => {
    mockZrevrank.mockResolvedValue(2);

    const result = await submitScore("battle-tower", makeEntry());

    expect(result).toEqual({ rank: 3 });
  });

  it("returns rank 1 when zrevrank returns null", async () => {
    mockZrevrank.mockResolvedValue(null);

    const result = await submitScore("hall-of-fame", makeEntry());

    expect(result).toEqual({ rank: 1 });
  });
});

describe("getLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correctly parsed entries", async () => {
    mockZrange.mockResolvedValue(["12345", 99]);
    mockHmget.mockResolvedValue({
      "12345": JSON.stringify({
        trainerName: "Ash",
        teamPokemon: ["pikachu"],
        timestamp: "2025-01-01T00:00:00.000Z",
      }),
    });

    const entries = await getLeaderboard("battle-tower", 50, 0);

    expect(entries).toEqual([
      {
        trainerId: "12345",
        trainerName: "Ash",
        teamPokemon: ["pikachu"],
        timestamp: "2025-01-01T00:00:00.000Z",
        score: 99,
      },
    ]);
  });

  it("passes correct range and options to zrange", async () => {
    mockZrange.mockResolvedValue([]);

    await getLeaderboard("elo-rating", 10, 5);

    expect(mockZrange).toHaveBeenCalledWith(
      "leaderboard:elo-rating",
      5,
      14,
      { rev: true, withScores: true }
    );
  });

  it("returns empty array when no entries", async () => {
    mockZrange.mockResolvedValue([]);

    const entries = await getLeaderboard("battle-tower");

    expect(entries).toEqual([]);
  });

  it("fetches metadata from hash for returned trainerIds", async () => {
    mockZrange.mockResolvedValue(["11111", 100, "22222", 80]);
    mockHmget.mockResolvedValue({
      "11111": JSON.stringify({
        trainerName: "Ash",
        teamPokemon: ["pikachu"],
        timestamp: "2025-01-01T00:00:00.000Z",
      }),
      "22222": JSON.stringify({
        trainerName: "Gary",
        teamPokemon: ["eevee"],
        timestamp: "2025-01-02T00:00:00.000Z",
      }),
    });

    const entries = await getLeaderboard("battle-tower");

    expect(entries).toHaveLength(2);
    expect(entries[0].trainerName).toBe("Ash");
    expect(entries[0].score).toBe(100);
    expect(entries[1].trainerName).toBe("Gary");
    expect(entries[1].score).toBe(80);
    expect(mockHmget).toHaveBeenCalledWith(
      "leaderboard:battle-tower:data",
      "11111",
      "22222"
    );
  });
});

describe("getPlayerRank", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses zrevrank for O(log N) lookup", async () => {
    mockZrevrank.mockResolvedValue(1);

    const rank = await getPlayerRank("battle-tower", "22222");

    expect(mockZrevrank).toHaveBeenCalledWith("leaderboard:battle-tower", "22222");
    expect(rank).toBe(2);
  });

  it("returns null when player is not found", async () => {
    mockZrevrank.mockResolvedValue(null);

    const rank = await getPlayerRank("battle-tower", "99999");

    expect(rank).toBeNull();
  });

  it("returns 1 for rank 0 (top player)", async () => {
    mockZrevrank.mockResolvedValue(0);

    const rank = await getPlayerRank("elo-rating", "12345");

    expect(rank).toBe(1);
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when under threshold", async () => {
    mockIncr.mockResolvedValue(3);

    const allowed = await checkRateLimit("1.2.3.4", 5);

    expect(allowed).toBe(true);
  });

  it("returns true when exactly at threshold", async () => {
    mockIncr.mockResolvedValue(5);

    const allowed = await checkRateLimit("1.2.3.4", 5);

    expect(allowed).toBe(true);
  });

  it("returns false when over threshold", async () => {
    mockIncr.mockResolvedValue(6);

    const allowed = await checkRateLimit("1.2.3.4", 5);

    expect(allowed).toBe(false);
  });

  it("sets TTL on first increment only", async () => {
    mockIncr.mockResolvedValue(1);

    await checkRateLimit("1.2.3.4", 10);

    expect(mockExpire).toHaveBeenCalledWith("rate:1.2.3.4:leaderboard", 3600);
  });

  it("sets TTL on every increment for atomicity safety", async () => {
    mockIncr.mockResolvedValue(2);

    await checkRateLimit("1.2.3.4", 10);

    expect(mockExpire).toHaveBeenCalledWith("rate:1.2.3.4:leaderboard", 3600);
  });

  it("uses correct rate limit key format", async () => {
    mockIncr.mockResolvedValue(1);

    await checkRateLimit("10.0.0.1", 5);

    expect(mockIncr).toHaveBeenCalledWith("rate:10.0.0.1:leaderboard");
  });
});
