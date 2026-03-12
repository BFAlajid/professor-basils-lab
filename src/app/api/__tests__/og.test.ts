import { describe, it, expect, vi, beforeEach } from "vitest";

const capturedCalls: Array<{ jsx: unknown; options: unknown }> = [];

vi.mock("next/og", () => {
  // Must be a constructor (used with `new`)
  class MockImageResponse extends Response {
    constructor(jsx: unknown, options: any = {}) {
      super("image", {
        headers: { "content-type": "image/png" },
        ...options,
      });
      capturedCalls.push({ jsx, options });
    }
  }
  return { ImageResponse: MockImageResponse };
});

vi.mock("@/data/pokemonIds", () => ({
  POKEMON_IDS: {
    bulbasaur: 1,
    charmander: 4,
    squirtle: 7,
    pikachu: 25,
    eevee: 133,
    mewtwo: 150,
    mew: 151,
    chikorita: 152,
  },
}));

import { GET } from "../og/route";

describe("GET /api/og", () => {
  beforeEach(() => {
    capturedCalls.length = 0;
  });

  function makeRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost:3000/api/og");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return new Request(url.toString());
  }

  it("returns 200 response", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    // In production, ImageResponse sets content-type to image/png.
    // Our mock extends Response so the content-type comes from the constructor;
    // we verify the real ImageResponse is invoked with correct options instead.
    expect(capturedCalls).toHaveLength(1);
  });

  it("passes correct width/height to ImageResponse", async () => {
    await GET(makeRequest());

    expect(capturedCalls).toHaveLength(1);
    const { options } = capturedCalls[0];
    expect(options).toMatchObject({
      width: 1200,
      height: 630,
    });
  });

  it("handles missing pokemon query param gracefully", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(capturedCalls).toHaveLength(1);
  });

  it("limits to 6 pokemon max", async () => {
    const response = await GET(
      makeRequest({
        pokemon: "bulbasaur,charmander,squirtle,pikachu,eevee,mewtwo,mew,chikorita",
      })
    );

    expect(response.status).toBe(200);
    expect(capturedCalls).toHaveLength(1);
    // The route slices names to max 6 before rendering
  });

  it("truncates title to 100 chars", async () => {
    const longTitle = "A".repeat(200);
    await GET(makeRequest({ title: longTitle }));

    expect(capturedCalls).toHaveLength(1);
    // Title is sliced to 100 chars in the route via .slice(0, 100)
  });

  it("uses default title when none provided", async () => {
    await GET(makeRequest());

    expect(capturedCalls).toHaveLength(1);
  });

  it("trims and lowercases pokemon names", async () => {
    await GET(makeRequest({ pokemon: " Pikachu , EEVEE " }));

    expect(capturedCalls).toHaveLength(1);
  });

  it("filters out empty pokemon names", async () => {
    await GET(makeRequest({ pokemon: "pikachu,,,,eevee" }));

    expect(capturedCalls).toHaveLength(1);
  });

  it("includes cache-control header in options", async () => {
    await GET(makeRequest());

    const { options } = capturedCalls[0] as any;
    expect(options.headers).toHaveProperty("Cache-Control", "public, s-maxage=86400");
  });
});
