import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/data/constants", () => ({
  POKEAPI_RATE_LIMIT_PER_HOUR: 300,
}));

import { GET } from "../pokeapi/[...path]/route";

const mockFetch = vi.fn();

describe("PokeAPI proxy GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockCheckRateLimit.mockResolvedValue(true);
  });

  function makeRequest(
    pathSegments: string[],
    queryParams: Record<string, string> = {},
    headers: Record<string, string> = {}
  ) {
    const url = new URL("http://localhost:3000/api/pokeapi/" + pathSegments.join("/"));
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
    const request = new Request(url.toString(), { headers });
    const params = Promise.resolve({ path: pathSegments });
    return GET(request, { params });
  }

  it.each([
    ["pokemon"],
    ["move"],
    ["ability"],
    ["type"],
    ["pokemon-species"],
    ["evolution-chain"],
    ["pokemon-form"],
  ])("allows valid resource type: %s", async (resource) => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ name: "test" }), { status: 200 })
    );

    const response = await makeRequest([resource, "1"]);

    expect(response.status).toBe(200);
  });

  it("returns 400 for disallowed resource types", async () => {
    const response = await makeRequest(["item", "1"]);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid resource type");
  });

  it("returns 400 for empty path", async () => {
    const request = new Request("http://localhost:3000/api/pokeapi");
    const params = Promise.resolve({ path: [] as string[] });

    const response = await GET(request, { params });

    expect(response.status).toBe(400);
  });

  it("forwards query params to upstream", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    await makeRequest(["pokemon"], { limit: "10", offset: "20" });

    const calledUrl = mockFetch.mock.calls[0][0];
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get("limit")).toBe("10");
    expect(parsed.searchParams.get("offset")).toBe("20");
  });

  it("constructs correct upstream URL with path segments", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 25 }), { status: 200 })
    );

    await makeRequest(["pokemon", "25"]);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("https://pokeapi.co/api/v2/pokemon/25");
  });

  it("returns 502 when upstream fails", async () => {
    mockFetch.mockResolvedValue(
      new Response("Not Found", { status: 404 })
    );

    const response = await makeRequest(["pokemon", "999999"]);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Upstream error");
  });

  it("returns 502 when upstream throws network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const response = await makeRequest(["pokemon", "1"]);

    expect(response.status).toBe(502);
  });

  it("sets correct Cache-Control header on success", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ name: "bulbasaur" }), { status: 200 })
    );

    const response = await makeRequest(["pokemon", "1"]);

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=3600"
    );
  });

  it("returns upstream JSON data on success", async () => {
    const upstreamData = { id: 25, name: "pikachu", types: ["electric"] };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(upstreamData), { status: 200 })
    );

    const response = await makeRequest(["pokemon", "25"]);
    const body = await response.json();

    expect(body).toEqual(upstreamData);
  });

  // --- Rate limiting ---

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await makeRequest(["pokemon", "1"]);

    expect(response.status).toBe(429);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails OPEN (still serves the request) when KV is unavailable", async () => {
    mockCheckRateLimit.mockRejectedValue(new Error("KV unavailable"));
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ name: "bulbasaur" }), { status: 200 })
    );

    const response = await makeRequest(["pokemon", "1"]);

    expect(response.status).toBe(200);
  });

  it("rate-limits by the trusted IP, not a spoofed leftmost x-forwarded-for entry", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await makeRequest(["pokemon", "1"], {}, { "x-forwarded-for": "1.2.3.4, 203.0.113.9" });

    expect(mockCheckRateLimit).toHaveBeenCalledWith("pokeapi:203.0.113.9", 300);
    expect(mockCheckRateLimit).not.toHaveBeenCalledWith("pokeapi:1.2.3.4", 300);
  });
});
