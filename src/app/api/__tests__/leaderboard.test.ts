import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSubmitScore,
  mockGetLeaderboard,
  mockGetPlayerRank,
  mockCheckRateLimit,
  MockLeaderboardOwnershipError,
} = vi.hoisted(() => ({
  mockSubmitScore: vi.fn(),
  mockGetLeaderboard: vi.fn(),
  mockGetPlayerRank: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  MockLeaderboardOwnershipError: class extends Error {},
}));

vi.mock("@/lib/kv", () => ({
  submitScore: mockSubmitScore,
  getLeaderboard: mockGetLeaderboard,
  getPlayerRank: mockGetPlayerRank,
  LeaderboardOwnershipError: MockLeaderboardOwnershipError,
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/data/constants", () => ({
  LEADERBOARD_MAX_NAME_LENGTH: 20,
  LEADERBOARD_MAX_ELO: 9999,
  LEADERBOARD_MAX_STREAK: 999,
  LEADERBOARD_RATE_LIMIT_PER_HOUR: 5,
}));

import { GET, POST } from "../leaderboard/route";

const DEVICE_KEY = "a".repeat(64);

function makePostRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/leaderboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/leaderboard");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

function validEntry(overrides: Record<string, unknown> = {}) {
  return {
    trainerName: "Ash",
    trainerId: "12345",
    score: 42,
    teamPokemon: ["pikachu", "charizard"],
    timestamp: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSubmitBody(overrides: Record<string, unknown> = {}) {
  return {
    type: "battle-tower",
    entry: validEntry(),
    deviceKey: DEVICE_KEY,
    ...overrides,
  };
}

describe("POST /api/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(true);
    mockSubmitScore.mockResolvedValue({ rank: 1 });
  });

  it("rejects invalid JSON body with 400", async () => {
    const request = new Request("http://localhost:3000/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects invalid leaderboard type with 400", async () => {
    const response = await POST(
      makePostRequest(makeSubmitBody({ type: "invalid-type" }))
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid leaderboard type");
  });

  it("sanitizes trainerName to allowlisted characters", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ trainerName: "<b>Ash</b>" }) })
      )
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.trainerName).toBe("bAshb");
  });

  it("rejects trainerId shorter than the 5-10 digit format", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ trainerId: "1234" }) })
      )
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("5-10 digits");
  });

  it("accepts a wider trainerId within the 5-10 digit format", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ trainerId: "123456789" }) })
      )
    );

    expect(response.status).toBe(201);
  });

  it("rejects alphabetic trainerId", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ trainerId: "abcde" }) })
      )
    );

    expect(response.status).toBe(400);
  });

  it("rejects negative scores", async () => {
    const response = await POST(
      makePostRequest(makeSubmitBody({ entry: validEntry({ score: -1 }) }))
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("non-negative");
  });

  it("clamps scores above max for battle-tower", async () => {
    const response = await POST(
      makePostRequest(makeSubmitBody({ entry: validEntry({ score: 5000 }) }))
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.score).toBe(999);
  });

  it("clamps scores above max for elo-rating", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ type: "elo-rating", entry: validEntry({ score: 99999 }) })
      )
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.score).toBe(9999);
  });

  it("rejects teamPokemon with more than 6 entries", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({
          entry: validEntry({
            teamPokemon: ["a", "b", "c", "d", "e", "f", "g"],
          }),
        })
      )
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("at most 6");
  });

  it("sanitizes teamPokemon entries to allowlisted characters", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({
          entry: validEntry({ teamPokemon: ["<b>pikachu</b>", "charizard"] }),
        })
      )
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.teamPokemon[0]).toBe("bpikachub");
  });

  it("rejects non-string teamPokemon entries", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ teamPokemon: [123, "pikachu"] }) })
      )
    );

    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(makePostRequest(makeSubmitBody()));

    expect(response.status).toBe(429);
  });

  it("returns 503 when KV unavailable (fail closed)", async () => {
    mockCheckRateLimit.mockRejectedValue(new Error("KV unavailable"));

    const response = await POST(makePostRequest(makeSubmitBody()));

    expect(response.status).toBe(503);
  });

  it("returns 500 when submitScore throws", async () => {
    mockSubmitScore.mockRejectedValue(new Error("KV write failed"));

    const response = await POST(makePostRequest(makeSubmitBody()));

    expect(response.status).toBe(500);
  });

  it("returns 201 with rank on success", async () => {
    mockSubmitScore.mockResolvedValue({ rank: 5 });

    const response = await POST(makePostRequest(makeSubmitBody()));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.rank).toBe(5);
  });

  it("rejects missing trainerName", async () => {
    const entry = validEntry();
    delete (entry as Record<string, unknown>).trainerName;

    const response = await POST(makePostRequest(makeSubmitBody({ entry })));

    expect(response.status).toBe(400);
  });

  it("rejects empty trainerName after sanitization", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ trainerName: "!@#$%^&*()" }) })
      )
    );

    expect(response.status).toBe(400);
  });

  it("rejects trainerName exceeding max length", async () => {
    const response = await POST(
      makePostRequest(
        makeSubmitBody({ entry: validEntry({ trainerName: "A".repeat(21) }) })
      )
    );

    expect(response.status).toBe(400);
  });

  it("floors decimal scores", async () => {
    const response = await POST(
      makePostRequest(makeSubmitBody({ entry: validEntry({ score: 42.9 }) }))
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.score).toBe(42);
  });

  // --- deviceKey / ownership binding ---

  it("rejects a request missing deviceKey with 400", async () => {
    const body = makeSubmitBody();
    delete (body as Record<string, unknown>).deviceKey;

    const response = await POST(makePostRequest(body));

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toContain("device key");
    expect(mockSubmitScore).not.toHaveBeenCalled();
  });

  it("rejects a deviceKey that is too short", async () => {
    const response = await POST(
      makePostRequest(makeSubmitBody({ deviceKey: "short" }))
    );

    expect(response.status).toBe(400);
  });

  it("rejects a non-string deviceKey", async () => {
    const response = await POST(
      makePostRequest(makeSubmitBody({ deviceKey: 12345 }))
    );

    expect(response.status).toBe(400);
  });

  it("passes deviceKey through to submitScore", async () => {
    await POST(makePostRequest(makeSubmitBody({ deviceKey: DEVICE_KEY })));

    expect(mockSubmitScore).toHaveBeenCalledWith(
      "battle-tower",
      expect.any(Object),
      DEVICE_KEY
    );
  });

  it("returns 403 when submitScore rejects an ownership mismatch", async () => {
    mockSubmitScore.mockRejectedValue(new MockLeaderboardOwnershipError());

    const response = await POST(makePostRequest(makeSubmitBody()));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLeaderboard.mockResolvedValue([]);
    mockGetPlayerRank.mockResolvedValue(null);
  });

  it("returns entries for valid type", async () => {
    const entries = [
      {
        trainerName: "Ash",
        trainerId: "12345",
        score: 100,
        teamPokemon: ["pikachu"],
        timestamp: "2025-01-01T00:00:00.000Z",
      },
    ];
    mockGetLeaderboard.mockResolvedValue(entries);

    const response = await GET(makeGetRequest({ type: "battle-tower" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entries).toEqual(entries);
  });

  it("rejects invalid type with 400", async () => {
    const response = await GET(makeGetRequest({ type: "invalid" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid leaderboard type");
  });

  it("rejects missing type with 400", async () => {
    const response = await GET(makeGetRequest({}));

    expect(response.status).toBe(400);
  });

  it("includes playerRank when trainerId provided", async () => {
    mockGetLeaderboard.mockResolvedValue([]);
    mockGetPlayerRank.mockResolvedValue(3);

    const response = await GET(
      makeGetRequest({ type: "elo-rating", trainerId: "12345" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.playerRank).toBe(3);
  });

  it("returns null playerRank when trainerId not provided", async () => {
    mockGetLeaderboard.mockResolvedValue([]);

    const response = await GET(makeGetRequest({ type: "battle-tower" }));

    const body = await response.json();
    expect(body.playerRank).toBeNull();
  });

  it("does not look up rank for invalid trainerId format", async () => {
    mockGetLeaderboard.mockResolvedValue([]);

    const response = await GET(
      makeGetRequest({ type: "battle-tower", trainerId: "abc" })
    );

    expect(response.status).toBe(200);
    expect(mockGetPlayerRank).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.playerRank).toBeNull();
  });

  it("returns 500 when getLeaderboard throws", async () => {
    mockGetLeaderboard.mockRejectedValue(new Error("KV read failed"));

    const response = await GET(makeGetRequest({ type: "battle-tower" }));

    expect(response.status).toBe(500);
  });

  it("sets public cache headers for the anonymous variant", async () => {
    mockGetLeaderboard.mockResolvedValue([]);

    const response = await GET(makeGetRequest({ type: "battle-tower" }));

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("s-maxage=60");
    expect(cacheControl).toContain("stale-while-revalidate=30");
  });

  it("sets private, no-store cache headers for the trainerId-scoped variant", async () => {
    mockGetLeaderboard.mockResolvedValue([]);
    mockGetPlayerRank.mockResolvedValue(1);

    const response = await GET(
      makeGetRequest({ type: "battle-tower", trainerId: "12345" })
    );

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).not.toContain("s-maxage");
  });
});

describe("POST /api/leaderboard rate limiting uses trusted IP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(true);
    mockSubmitScore.mockResolvedValue({ rank: 1 });
  });

  it("ignores a spoofed leftmost x-forwarded-for entry when computing the rate-limit key", async () => {
    // Attacker sets a fake leftmost IP; Vercel appends the real client IP last.
    await POST(
      makePostRequest(makeSubmitBody(), {
        "x-forwarded-for": "1.2.3.4, 203.0.113.9",
      })
    );

    expect(mockCheckRateLimit).toHaveBeenCalledWith("203.0.113.9", 5);
    expect(mockCheckRateLimit).not.toHaveBeenCalledWith("1.2.3.4", 5);
  });

  it("prefers x-real-ip over x-forwarded-for", async () => {
    await POST(
      makePostRequest(makeSubmitBody(), {
        "x-real-ip": "203.0.113.9",
        "x-forwarded-for": "1.2.3.4",
      })
    );

    expect(mockCheckRateLimit).toHaveBeenCalledWith("203.0.113.9", 5);
  });
});
