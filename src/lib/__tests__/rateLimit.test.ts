import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIncr, mockExpire } = vi.hoisted(() => ({
  mockIncr: vi.fn(),
  mockExpire: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    incr: mockIncr,
    expire: mockExpire,
  },
}));

import { checkRateLimit, checkDailyRateLimit } from "../rateLimit";

// Regression (Wave 7 review, MAJOR): api/pokeapi/[...path]/route.ts runs on
// the edge runtime and previously imported checkRateLimit from kv.ts, which
// also pulls in node's `crypto` for device-key hashing — unsupported on
// edge. rateLimit.ts must stay crypto-free so it's safe for edge routes.
describe("rateLimit module boundary", () => {
  it("has no static import of node's crypto module", () => {
    const path = join(process.cwd(), "src", "lib", "rateLimit.ts");
    const source = readFileSync(path, "utf-8");
    expect(source).not.toMatch(/from\s+["']crypto["']/);
    expect(source).not.toMatch(/require\(["']crypto["']\)/);
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

  it("returns false when over threshold", async () => {
    mockIncr.mockResolvedValue(6);
    const allowed = await checkRateLimit("1.2.3.4", 5);
    expect(allowed).toBe(false);
  });

  it("uses the leaderboard rate limit key format", async () => {
    mockIncr.mockResolvedValue(1);
    await checkRateLimit("10.0.0.1", 5);
    expect(mockIncr).toHaveBeenCalledWith("rate:10.0.0.1:leaderboard");
    expect(mockExpire).toHaveBeenCalledWith("rate:10.0.0.1:leaderboard", 3600);
  });
});

describe("checkDailyRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when under threshold", async () => {
    mockIncr.mockResolvedValue(3);
    const allowed = await checkDailyRateLimit("1.2.3.4", 5);
    expect(allowed).toBe(true);
  });

  it("returns false when over threshold", async () => {
    mockIncr.mockResolvedValue(6);
    const allowed = await checkDailyRateLimit("1.2.3.4", 5);
    expect(allowed).toBe(false);
  });

  it("uses the daily rate limit key format, distinct from the leaderboard key", async () => {
    mockIncr.mockResolvedValue(1);
    await checkDailyRateLimit("10.0.0.1", 5);
    expect(mockIncr).toHaveBeenCalledWith("rate:10.0.0.1:daily");
    expect(mockExpire).toHaveBeenCalledWith("rate:10.0.0.1:daily", 3600);
  });
});
