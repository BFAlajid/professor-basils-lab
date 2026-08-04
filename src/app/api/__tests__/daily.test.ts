import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUtcDateString, generateChallenge, maxPossibleScore } from "@/utils/dailyChallenge";

const {
  mockSubmitDailyResult,
  mockGetDailyLeaderboard,
  mockGetDailyPlayerRank,
  mockCheckDailyRateLimit,
  MockDailyOwnershipError,
} = vi.hoisted(() => ({
  mockSubmitDailyResult: vi.fn(),
  mockGetDailyLeaderboard: vi.fn(),
  mockGetDailyPlayerRank: vi.fn(),
  mockCheckDailyRateLimit: vi.fn(),
  MockDailyOwnershipError: class extends Error {},
}));

vi.mock("@/lib/kv", () => ({
  submitDailyResult: mockSubmitDailyResult,
  getDailyLeaderboard: mockGetDailyLeaderboard,
  getDailyPlayerRank: mockGetDailyPlayerRank,
  checkDailyRateLimit: mockCheckDailyRateLimit,
  DailyOwnershipError: MockDailyOwnershipError,
}));

import { GET, POST } from "../daily/route";

const DEVICE_KEY = "a".repeat(64);
const TODAY = getUtcDateString();
const TODAY_CAP = maxPossibleScore(generateChallenge(TODAY));

function makePostRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/daily", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/daily");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    date: TODAY,
    trainerId: "12345",
    trainerName: "Ash",
    score: 50,
    completedAt: "2026-08-02T00:00:00.000Z",
    deviceKey: DEVICE_KEY,
    ...overrides,
  };
}

describe("GET /api/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDailyLeaderboard.mockResolvedValue([]);
    mockGetDailyPlayerRank.mockResolvedValue(null);
  });

  it("returns today's descriptor derived purely from the UTC date", async () => {
    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.date).toBe(TODAY);
    expect(body.type).toBe("encounter-gauntlet");
    expect(typeof body.seed).toBe("number");
    expect(body.params).toEqual({ ballBudget: 8, slotCount: 5, maxBallsPerSlot: 3 });
  });

  it("returns the same seed/params on repeated calls (deterministic)", async () => {
    const first = await (await GET(makeGetRequest())).json();
    const second = await (await GET(makeGetRequest())).json();

    expect(first.seed).toBe(second.seed);
    expect(first.params).toEqual(second.params);
  });

  it("includes today's leaderboard entries", async () => {
    mockGetDailyLeaderboard.mockResolvedValue([
      { trainerId: "12345", trainerName: "Ash", score: 100, completedAt: "2026-08-02T00:00:00.000Z" },
    ]);

    const response = await GET(makeGetRequest());

    const body = await response.json();
    expect(body.leaderboard.entries).toHaveLength(1);
    expect(mockGetDailyLeaderboard).toHaveBeenCalledWith(TODAY, 10);
  });

  it("includes playerRank when a valid trainerId is provided", async () => {
    mockGetDailyPlayerRank.mockResolvedValue(4);

    const response = await GET(makeGetRequest({ trainerId: "12345" }));

    const body = await response.json();
    expect(body.leaderboard.playerRank).toBe(4);
  });

  it("does not look up rank for an invalid trainerId format", async () => {
    const response = await GET(makeGetRequest({ trainerId: "abc" }));

    const body = await response.json();
    expect(mockGetDailyPlayerRank).not.toHaveBeenCalled();
    expect(body.leaderboard.playerRank).toBeNull();
  });

  it("degrades to an empty leaderboard (not a failure) when KV read throws", async () => {
    mockGetDailyLeaderboard.mockRejectedValue(new Error("KV unavailable"));

    const response = await GET(makeGetRequest());

    // Gameplay must not go down with the leaderboard — the challenge
    // descriptor is still returned with a 200 and a degraded leaderboard.
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.date).toBe(TODAY);
    expect(body.type).toBe("encounter-gauntlet");
    expect(body.leaderboard.entries).toEqual([]);
    expect(body.leaderboard.playerRank).toBeNull();
  });

  it("sets public cache headers for the anonymous variant", async () => {
    const response = await GET(makeGetRequest());
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("s-maxage=60");
  });

  it("sets private, no-store cache headers for the trainerId-scoped variant", async () => {
    const response = await GET(makeGetRequest({ trainerId: "12345" }));
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
  });
});

describe("POST /api/daily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckDailyRateLimit.mockResolvedValue(true);
    mockSubmitDailyResult.mockResolvedValue({ rank: 1 });
  });

  it("rejects invalid JSON body with 400", async () => {
    const request = new Request("http://localhost:3000/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects a malformed date", async () => {
    const response = await POST(makePostRequest(validBody({ date: "08/02/2026" })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("YYYY-MM-DD");
  });

  it("rejects a date far outside the allowed submission window", async () => {
    const response = await POST(makePostRequest(validBody({ date: "2000-01-01" })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("window");
  });

  it("rejects trainerId shorter than the 5-10 digit format", async () => {
    const response = await POST(makePostRequest(validBody({ trainerId: "1234" })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("5-10 digits");
  });

  it("rejects negative scores", async () => {
    const response = await POST(makePostRequest(validBody({ score: -1 })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("non-negative");
  });

  // --- score-range validation (anti-cheat) ---

  it("rejects a score above the day's exact maximum possible score", async () => {
    const response = await POST(makePostRequest(validBody({ score: TODAY_CAP + 1 })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("exceeds maximum");
    expect(mockSubmitDailyResult).not.toHaveBeenCalled();
  });

  it("accepts a score exactly at the day's maximum possible score", async () => {
    const response = await POST(makePostRequest(validBody({ score: TODAY_CAP })));

    expect(response.status).toBe(201);
  });

  it("rejects an absurdly large score", async () => {
    const response = await POST(makePostRequest(validBody({ score: 999999 })));

    expect(response.status).toBe(400);
    expect(mockSubmitDailyResult).not.toHaveBeenCalled();
  });

  it("floors decimal scores", async () => {
    const response = await POST(makePostRequest(validBody({ score: 42.9 })));

    expect(response.status).toBe(201);
    const submitted = mockSubmitDailyResult.mock.calls[0][1];
    expect(submitted.score).toBe(42);
  });

  it("sanitizes trainerName to allowlisted characters", async () => {
    const response = await POST(makePostRequest(validBody({ trainerName: "<b>Ash</b>" })));

    expect(response.status).toBe(201);
    const submitted = mockSubmitDailyResult.mock.calls[0][1];
    expect(submitted.trainerName).toBe("bAshb");
  });

  it("rejects empty trainerName after sanitization", async () => {
    const response = await POST(makePostRequest(validBody({ trainerName: "!@#$%" })));

    expect(response.status).toBe(400);
  });

  it("rejects trainerName exceeding max length", async () => {
    const response = await POST(makePostRequest(validBody({ trainerName: "A".repeat(21) })));

    expect(response.status).toBe(400);
  });

  // --- deviceKey / ownership binding ---

  it("rejects a request missing deviceKey with 400", async () => {
    const body = validBody();
    delete (body as Record<string, unknown>).deviceKey;

    const response = await POST(makePostRequest(body));

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toContain("device key");
    expect(mockSubmitDailyResult).not.toHaveBeenCalled();
  });

  it("rejects a deviceKey that is too short", async () => {
    const response = await POST(makePostRequest(validBody({ deviceKey: "short" })));

    expect(response.status).toBe(400);
  });

  it("passes the date and deviceKey through to submitDailyResult", async () => {
    await POST(makePostRequest(validBody()));

    expect(mockSubmitDailyResult).toHaveBeenCalledWith(
      TODAY,
      expect.objectContaining({ trainerId: "12345", trainerName: "Ash" }),
      DEVICE_KEY
    );
  });

  it("returns 403 when submitDailyResult rejects an ownership mismatch", async () => {
    mockSubmitDailyResult.mockRejectedValue(new MockDailyOwnershipError());

    const response = await POST(makePostRequest(validBody()));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  // --- rate limiting / availability ---

  it("returns 429 when rate limited", async () => {
    mockCheckDailyRateLimit.mockResolvedValue(false);

    const response = await POST(makePostRequest(validBody()));

    expect(response.status).toBe(429);
  });

  it("returns 503 when KV unavailable (fail closed)", async () => {
    mockCheckDailyRateLimit.mockRejectedValue(new Error("KV unavailable"));

    const response = await POST(makePostRequest(validBody()));

    expect(response.status).toBe(503);
  });

  it("returns 500 when submitDailyResult throws unexpectedly", async () => {
    mockSubmitDailyResult.mockRejectedValue(new Error("KV write failed"));

    const response = await POST(makePostRequest(validBody()));

    expect(response.status).toBe(500);
  });

  it("returns 201 with rank on success", async () => {
    mockSubmitDailyResult.mockResolvedValue({ rank: 5 });

    const response = await POST(makePostRequest(validBody()));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.rank).toBe(5);
  });

  it("ignores a spoofed leftmost x-forwarded-for entry when computing the rate-limit key", async () => {
    await POST(
      makePostRequest(validBody(), {
        "x-forwarded-for": "1.2.3.4, 203.0.113.9",
      })
    );

    expect(mockCheckDailyRateLimit).toHaveBeenCalledWith("203.0.113.9", 10);
    expect(mockCheckDailyRateLimit).not.toHaveBeenCalledWith("1.2.3.4", 10);
  });
});
