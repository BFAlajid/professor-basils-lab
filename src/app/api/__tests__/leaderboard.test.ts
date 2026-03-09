import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSubmitScore,
  mockGetLeaderboard,
  mockGetPlayerRank,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockSubmitScore: vi.fn(),
  mockGetLeaderboard: vi.fn(),
  mockGetPlayerRank: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/kv", () => ({
  submitScore: mockSubmitScore,
  getLeaderboard: mockGetLeaderboard,
  getPlayerRank: mockGetPlayerRank,
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/data/constants", () => ({
  LEADERBOARD_MAX_NAME_LENGTH: 20,
  LEADERBOARD_MAX_ELO: 9999,
  LEADERBOARD_MAX_STREAK: 999,
  LEADERBOARD_RATE_LIMIT_PER_HOUR: 5,
}));

import { GET, POST } from "../leaderboard/route";

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
      makePostRequest({ type: "invalid-type", entry: validEntry() })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid leaderboard type");
  });

  it("strips HTML from trainerName", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ trainerName: "<b>Ash</b>" }),
      })
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.trainerName).toBe("Ash");
  });

  it("rejects trainerId not matching 5-digit format", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ trainerId: "1234" }),
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("5 digits");
  });

  it("rejects alphabetic trainerId", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ trainerId: "abcde" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects negative scores", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ score: -1 }),
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("non-negative");
  });

  it("clamps scores above max for battle-tower", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ score: 5000 }),
      })
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.score).toBe(999);
  });

  it("clamps scores above max for elo-rating", async () => {
    const response = await POST(
      makePostRequest({
        type: "elo-rating",
        entry: validEntry({ score: 99999 }),
      })
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.score).toBe(9999);
  });

  it("rejects teamPokemon with more than 6 entries", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({
          teamPokemon: ["a", "b", "c", "d", "e", "f", "g"],
        }),
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("at most 6");
  });

  it("sanitizes teamPokemon entries by stripping HTML", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ teamPokemon: ["<b>pikachu</b>", "charizard"] }),
      })
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.teamPokemon[0]).toBe("pikachu");
  });

  it("rejects non-string teamPokemon entries", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ teamPokemon: [123, "pikachu"] }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry(),
      })
    );

    expect(response.status).toBe(429);
  });

  it("returns 503 when KV unavailable (fail closed)", async () => {
    mockCheckRateLimit.mockRejectedValue(new Error("KV unavailable"));

    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry(),
      })
    );

    expect(response.status).toBe(503);
  });

  it("returns 500 when submitScore throws", async () => {
    mockSubmitScore.mockRejectedValue(new Error("KV write failed"));

    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry(),
      })
    );

    expect(response.status).toBe(500);
  });

  it("returns 201 with rank on success", async () => {
    mockSubmitScore.mockResolvedValue({ rank: 5 });

    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry(),
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.rank).toBe(5);
  });

  it("rejects missing trainerName", async () => {
    const entry = validEntry();
    delete (entry as Record<string, unknown>).trainerName;

    const response = await POST(
      makePostRequest({ type: "battle-tower", entry })
    );

    expect(response.status).toBe(400);
  });

  it("rejects empty trainerName after HTML stripping", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ trainerName: "<script></script>" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects trainerName exceeding max length", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ trainerName: "A".repeat(21) }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("floors decimal scores", async () => {
    const response = await POST(
      makePostRequest({
        type: "battle-tower",
        entry: validEntry({ score: 42.9 }),
      })
    );

    expect(response.status).toBe(201);
    const submittedEntry = mockSubmitScore.mock.calls[0][1];
    expect(submittedEntry.score).toBe(42);
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

  it("sets cache headers on success", async () => {
    mockGetLeaderboard.mockResolvedValue([]);

    const response = await GET(makeGetRequest({ type: "battle-tower" }));

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("s-maxage=60");
    expect(cacheControl).toContain("stale-while-revalidate=30");
  });
});
