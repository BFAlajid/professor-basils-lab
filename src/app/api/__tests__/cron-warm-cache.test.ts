import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../cron/warm-cache/route";

describe("GET /api/cron/warm-cache", () => {
  const originalFetch = global.fetch;
  const mockFetch = vi.fn();
  const CRON_SECRET = "test-cron-secret-123";

  function makeRequest(headers: Record<string, string> = {}) {
    return new Request("http://localhost:3000/api/cron/warm-cache", {
      headers,
    });
  }

  function makeOkResponse(body: unknown = {}) {
    const bodyCancel = vi.fn();
    const response = new Response(JSON.stringify(body), { status: 200 });
    // Override body with a mock that has cancel
    Object.defineProperty(response, "body", {
      value: { cancel: bodyCancel },
    });
    return { response, bodyCancel };
  }

  function makeFailResponse(status = 500) {
    const bodyCancel = vi.fn();
    const response = new Response("error", { status });
    Object.defineProperty(response, "body", {
      value: { cancel: bodyCancel },
    });
    return { response, bodyCancel };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("returns 401 without authorization header", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 with wrong bearer token", async () => {
    const response = await GET(
      makeRequest({ authorization: "Bearer wrong-token" })
    );
    expect(response.status).toBe(401);
  });

  it("fetches pokemon list then warms cache in batches", async () => {
    // First call: pokemon list with 2 pokemon
    const listResponse = makeOkResponse({
      results: [
        { name: "bulbasaur", url: "..." },
        { name: "charmander", url: "..." },
      ],
    });

    // Subsequent calls: individual pokemon and species endpoints
    const pokemon1 = makeOkResponse();
    const species1 = makeOkResponse();
    const pokemon2 = makeOkResponse();
    const species2 = makeOkResponse();

    mockFetch
      .mockResolvedValueOnce(listResponse.response)
      .mockResolvedValueOnce(pokemon1.response)
      .mockResolvedValueOnce(species1.response)
      .mockResolvedValueOnce(pokemon2.response)
      .mockResolvedValueOnce(species2.response);

    const response = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.warmed).toBe(4); // 2 pokemon + 2 species
    expect(body.failedCount).toBe(0);
    expect(typeof body.durationMs).toBe("number");

    // Verify the list endpoint was called
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/pokeapi/pokemon?limit=386"
    );
  });

  it("returns summary with warmed count and duration", async () => {
    const listResponse = makeOkResponse({
      results: [{ name: "pikachu", url: "..." }],
    });

    mockFetch
      .mockResolvedValueOnce(listResponse.response)
      .mockResolvedValueOnce(makeOkResponse().response)
      .mockResolvedValueOnce(makeOkResponse().response);

    const response = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
    );
    const body = await response.json();

    expect(body).toHaveProperty("warmed");
    expect(body).toHaveProperty("failedCount");
    expect(body).toHaveProperty("durationMs");
    expect(body.warmed).toBe(2);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("handles upstream failures gracefully (includes in failed array)", async () => {
    const listResponse = makeOkResponse({
      results: [{ name: "missingno", url: "..." }],
    });

    const failedPokemon = makeFailResponse(404);
    const failedSpecies = makeFailResponse(404);

    mockFetch
      .mockResolvedValueOnce(listResponse.response)
      .mockResolvedValueOnce(failedPokemon.response)
      .mockResolvedValueOnce(failedSpecies.response);

    const response = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
    );
    const body = await response.json();

    expect(body.warmed).toBe(0);
    expect(body.failedCount).toBe(2);
  });

  it("drains response bodies by calling body.cancel", async () => {
    const listResponse = makeOkResponse({
      results: [{ name: "eevee", url: "..." }],
    });

    const pokemon = makeOkResponse();
    const species = makeOkResponse();

    mockFetch
      .mockResolvedValueOnce(listResponse.response)
      .mockResolvedValueOnce(pokemon.response)
      .mockResolvedValueOnce(species.response);

    await GET(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));

    expect(pokemon.bodyCancel).toHaveBeenCalled();
    expect(species.bodyCancel).toHaveBeenCalled();
  });

  it("returns 502 when pokemon list fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const response = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
    );

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch pokemon list");
  });

  it("returns 502 when pokemon list returns non-ok status", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const response = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
    );

    expect(response.status).toBe(502);
  });

  it("handles network errors for individual pokemon gracefully", async () => {
    const listResponse = makeOkResponse({
      results: [{ name: "gengar", url: "..." }],
    });

    mockFetch
      .mockResolvedValueOnce(listResponse.response)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"));

    const response = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.warmed).toBe(0);
    expect(body.failedCount).toBeGreaterThan(0);
  });
});
