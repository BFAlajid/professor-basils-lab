import { describe, it, expect } from "vitest";
import { getTrustedClientIp } from "../ip";

function makeRequest(headers: Record<string, string>) {
  return new Request("http://localhost:3000/api/test", { headers });
}

describe("getTrustedClientIp", () => {
  it("prefers x-real-ip when present", () => {
    const request = makeRequest({ "x-real-ip": "203.0.113.7" });
    expect(getTrustedClientIp(request)).toBe("203.0.113.7");
  });

  it("ignores a spoofed leftmost x-forwarded-for entry when x-real-ip is present", () => {
    const request = makeRequest({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "6.6.6.6, 203.0.113.7",
    });
    expect(getTrustedClientIp(request)).toBe("203.0.113.7");
  });

  it("falls back to the LAST x-forwarded-for entry, not the attacker-controlled first one", () => {
    const request = makeRequest({
      "x-forwarded-for": "6.6.6.6, 203.0.113.7",
    });
    // Vercel appends the real client IP as the last entry — a spoofed
    // leftmost entry (6.6.6.6) must never be trusted.
    expect(getTrustedClientIp(request)).toBe("203.0.113.7");
    expect(getTrustedClientIp(request)).not.toBe("6.6.6.6");
  });

  it("handles a single-entry x-forwarded-for", () => {
    const request = makeRequest({ "x-forwarded-for": "203.0.113.7" });
    expect(getTrustedClientIp(request)).toBe("203.0.113.7");
  });

  it("trims whitespace around entries", () => {
    const request = makeRequest({ "x-forwarded-for": "6.6.6.6 ,  203.0.113.7  " });
    expect(getTrustedClientIp(request)).toBe("203.0.113.7");
  });

  it("returns 'unknown' when neither header is present (dev fallback)", () => {
    const request = makeRequest({});
    expect(getTrustedClientIp(request)).toBe("unknown");
  });

  it("returns 'unknown' when x-forwarded-for is empty/malformed", () => {
    const request = makeRequest({ "x-forwarded-for": " , ," });
    expect(getTrustedClientIp(request)).toBe("unknown");
  });
});
