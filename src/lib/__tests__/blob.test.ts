import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPut } = vi.hoisted(() => ({
  mockPut: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: mockPut,
}));

import { uploadShare, uploadShareMeta } from "../blob";
import type { StoredShare } from "@/types/share";

describe("uploadShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPut.mockResolvedValue({ url: "https://blob.example.com/test" });
  });

  it("uses correct path format shares/{type}/{id}", async () => {
    await uploadShare("abc123", "replay", '{"turns":[]}');

    expect(mockPut).toHaveBeenCalledWith(
      "shares/replay/abc123",
      '{"turns":[]}',
      expect.objectContaining({ access: "public", addRandomSuffix: false })
    );
  });

  it("sets image/png content type for trainer-card", async () => {
    await uploadShare("abc123", "trainer-card", "data:image/png;base64,abc");

    expect(mockPut).toHaveBeenCalledWith(
      "shares/trainer-card/abc123",
      expect.any(String),
      expect.objectContaining({ contentType: "image/png" })
    );
  });

  it("sets application/json content type for replay", async () => {
    await uploadShare("abc123", "replay", '{"data":true}');

    expect(mockPut).toHaveBeenCalledWith(
      "shares/replay/abc123",
      expect.any(String),
      expect.objectContaining({ contentType: "application/json" })
    );
  });

  it("sets application/json content type for challenge", async () => {
    await uploadShare("abc123", "challenge", '{"code":"xyz"}');

    expect(mockPut).toHaveBeenCalledWith(
      "shares/challenge/abc123",
      expect.any(String),
      expect.objectContaining({ contentType: "application/json" })
    );
  });

  it("returns the blob URL", async () => {
    mockPut.mockResolvedValue({ url: "https://blob.example.com/shares/replay/abc123" });

    const url = await uploadShare("abc123", "replay", "data");

    expect(url).toBe("https://blob.example.com/shares/replay/abc123");
  });

  it("passes addRandomSuffix: false", async () => {
    await uploadShare("id1", "trainer-card", "data");

    expect(mockPut).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ addRandomSuffix: false })
    );
  });
});

describe("uploadShareMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPut.mockResolvedValue({ url: "https://blob.example.com/meta" });
  });

  it("stores JSON at shares/meta/{id}.json", async () => {
    const meta: StoredShare = {
      type: "replay",
      blobUrl: "https://blob.example.com/shares/replay/abc123",
      metadata: {
        title: "My Replay",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      expiresAt: "2025-02-01T00:00:00.000Z",
    };

    await uploadShareMeta("abc123", meta);

    expect(mockPut).toHaveBeenCalledWith(
      "shares/meta/abc123.json",
      JSON.stringify(meta),
      expect.objectContaining({
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      })
    );
  });

  it("serializes the metadata as JSON", async () => {
    const meta: StoredShare = {
      type: "trainer-card",
      blobUrl: "https://blob.example.com/shares/trainer-card/xyz",
      metadata: {
        title: "Trainer Card",
        createdAt: "2025-06-15T12:00:00.000Z",
        trainerName: "Ash",
        pokemonNames: ["pikachu", "charizard"],
      },
      expiresAt: "2025-07-15T12:00:00.000Z",
    };

    await uploadShareMeta("xyz", meta);

    const putCall = mockPut.mock.calls[0];
    const serialized = putCall[1];
    expect(JSON.parse(serialized)).toEqual(meta);
  });
});
