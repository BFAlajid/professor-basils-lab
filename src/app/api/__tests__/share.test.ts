import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUploadShare, mockUploadShareMeta, mockCheckRateLimit } = vi.hoisted(() => ({
  mockUploadShare: vi.fn(),
  mockUploadShareMeta: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/blob", () => ({
  uploadShare: mockUploadShare,
  uploadShareMeta: mockUploadShareMeta,
}));

vi.mock("@/lib/kv", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/data/constants", () => ({
  SHARE_MAX_TRAINER_CARD: 200 * 1024,
  SHARE_MAX_REPLAY: 500 * 1024,
  SHARE_MAX_CHALLENGE: 50 * 1024,
  SHARE_EXPIRY_DAYS: 30,
  SHARE_RATE_LIMIT_PER_HOUR: 10,
}));

import { POST } from "../share/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "replay",
    data: '{"turns":[]}',
    metadata: {
      title: "My Replay",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

// PNG magic bytes in base64: iVBORw0KGgo
const VALID_PNG_DATA = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";

describe("POST /api/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(true);
    mockUploadShare.mockResolvedValue("https://blob.example.com/shares/replay/abc123");
    mockUploadShareMeta.mockResolvedValue(undefined);
  });

  it("rejects invalid JSON with 400", async () => {
    const request = new Request("http://localhost:3000/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{{{",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("rejects unknown share type with 400", async () => {
    const response = await POST(makeRequest(validPayload({ type: "unknown" })));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid share payload");
  });

  it("rejects missing data field with 400", async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).data;

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
  });

  it("rejects empty data string with 400", async () => {
    const response = await POST(makeRequest(validPayload({ data: "" })));

    expect(response.status).toBe(400);
  });

  it("rejects oversized trainer-card data with 400", async () => {
    const oversizedData = VALID_PNG_DATA + "x".repeat(200 * 1024);
    const response = await POST(
      makeRequest(validPayload({ type: "trainer-card", data: oversizedData }))
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("size limit");
    expect(body.error).toContain("trainer-card");
  });

  it("rejects non-PNG trainer-card data with 400", async () => {
    const response = await POST(
      makeRequest(validPayload({ type: "trainer-card", data: "not-a-png-image" }))
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid share payload");
  });

  it("rejects oversized replay data with 400", async () => {
    const oversizedData = "x".repeat(500 * 1024 + 1);
    const response = await POST(
      makeRequest(validPayload({ type: "replay", data: oversizedData }))
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("size limit");
  });

  it("rejects metadata title over 100 chars with 400", async () => {
    const response = await POST(
      makeRequest(
        validPayload({
          metadata: {
            title: "A".repeat(101),
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        })
      )
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid share payload");
  });

  it("rejects empty metadata title with 400", async () => {
    const response = await POST(
      makeRequest(
        validPayload({
          metadata: {
            title: "",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        })
      )
    );

    expect(response.status).toBe(400);
  });

  it("rejects missing metadata with 400", async () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).metadata;

    const response = await POST(makeRequest(payload));

    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const response = await POST(makeRequest(validPayload()));

    expect(response.status).toBe(429);
  });

  it("returns 503 when KV unavailable (fail closed)", async () => {
    mockCheckRateLimit.mockRejectedValue(new Error("KV unavailable"));

    const response = await POST(makeRequest(validPayload()));

    expect(response.status).toBe(503);
  });

  it("returns 500 when blob upload throws", async () => {
    mockUploadShare.mockRejectedValue(new Error("Blob unavailable"));

    const response = await POST(makeRequest(validPayload()));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to store share");
  });

  it("returns 500 when meta upload throws", async () => {
    mockUploadShareMeta.mockRejectedValue(new Error("Blob meta failed"));

    const response = await POST(makeRequest(validPayload()));

    expect(response.status).toBe(500);
  });

  it("returns 201 with share response on success", async () => {
    const response = await POST(makeRequest(validPayload()));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBe(12);
    expect(body.url).toBe(`/share/${body.id}`);
    expect(body.expiresAt).toBeDefined();
  });

  it("generates a 12-character hex ID", async () => {
    const response = await POST(makeRequest(validPayload()));
    const body = await response.json();

    expect(body.id).toMatch(/^[0-9a-f]{12}$/);
  });

  it("sets expiresAt to approximately 30 days in the future", async () => {
    const before = Date.now();
    const response = await POST(makeRequest(validPayload()));
    const after = Date.now();

    const body = await response.json();
    const expiresMs = new Date(body.expiresAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs);
    expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs);
  });

  it("calls uploadShare with correct arguments", async () => {
    const response = await POST(makeRequest(validPayload()));
    const body = await response.json();

    expect(mockUploadShare).toHaveBeenCalledWith(
      body.id,
      "replay",
      '{"turns":[]}'
    );
  });

  it("calls uploadShareMeta with stored share object", async () => {
    const response = await POST(makeRequest(validPayload()));
    const body = await response.json();

    expect(mockUploadShareMeta).toHaveBeenCalledWith(
      body.id,
      expect.objectContaining({
        type: "replay",
        blobUrl: "https://blob.example.com/shares/replay/abc123",
        metadata: {
          title: "My Replay",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        expiresAt: body.expiresAt,
      })
    );
  });

  it("accepts valid trainer-card payload with PNG data under size limit", async () => {
    const response = await POST(
      makeRequest(validPayload({ type: "trainer-card", data: VALID_PNG_DATA }))
    );

    expect(response.status).toBe(201);
  });

  it("accepts valid challenge payload", async () => {
    const response = await POST(
      makeRequest(validPayload({ type: "challenge" }))
    );

    expect(response.status).toBe(201);
  });
});
