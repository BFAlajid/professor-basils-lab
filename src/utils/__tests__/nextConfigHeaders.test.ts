// Regression: mGBA pthread pool init hung at 30s because COOP/COEP were only set
// on the document (`source: "/"`), so the worker script re-fetched from
// /mgba/mgba.js carried neither COEP nor CORP. Under COEP require-corp the
// isolated embedder silently blocks the module worker and Promise.all in
// PThread.loadWasmModuleToAllWorkers never resolves.
// The fix: serve COEP + CORP on /mgba/:path* so the worker script itself is
// allowed and can run as a module worker of the isolated document.
//
// These tests assert the /mgba/:path* rule exists with the required headers.
// They fail against the pre-fix config and pass after the fix.

import { describe, it, expect, afterEach, vi } from "vitest";
import nextConfig from "../../../next.config";

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

async function getHeaderRules(): Promise<HeaderRule[]> {
  const cfg = nextConfig as unknown as { headers?: () => Promise<HeaderRule[]> };
  if (typeof cfg.headers !== "function") {
    throw new Error("next.config does not expose a headers() function");
  }
  return cfg.headers();
}

function findRule(rules: HeaderRule[], source: string): HeaderRule | undefined {
  return rules.find((r) => r.source === source);
}

function getHeader(rule: HeaderRule | undefined, key: string): string | undefined {
  return rule?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
}

describe("next.config headers() for /mgba/*", () => {
  it("serves Cross-Origin-Embedder-Policy: require-corp on /mgba/:path*", async () => {
    const rules = await getHeaderRules();
    const mgbaRule = findRule(rules, "/mgba/:path*");
    expect(mgbaRule, "missing /mgba/:path* header rule").toBeDefined();
    expect(getHeader(mgbaRule, "Cross-Origin-Embedder-Policy")).toBe("require-corp");
  });

  it("serves Cross-Origin-Resource-Policy: same-origin on /mgba/:path*", async () => {
    const rules = await getHeaderRules();
    const mgbaRule = findRule(rules, "/mgba/:path*");
    expect(mgbaRule, "missing /mgba/:path* header rule").toBeDefined();
    // CORP is what lets the isolated embedder actually embed the worker script.
    expect(getHeader(mgbaRule, "Cross-Origin-Resource-Policy")).toBe("same-origin");
  });

  it("still serves COOP/COEP on / so the SPA document is crossOriginIsolated", async () => {
    const rules = await getHeaderRules();
    const rootRule = findRule(rules, "/");
    expect(rootRule, "missing / header rule").toBeDefined();
    expect(getHeader(rootRule, "Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(getHeader(rootRule, "Cross-Origin-Embedder-Policy")).toBe("require-corp");
  });
});

// Regression: `next dev` (Turbopack) logs "eval() is not supported" because
// React's dev-mode debugging tools require eval(), but the CSP's script-src
// omitted 'unsafe-eval'. Fix: allow 'unsafe-eval' only when NODE_ENV is
// "development"; production must never carry it (it would weaken the CSP
// against script-injection attacks).
describe("next.config headers() script-src eval policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does NOT include 'unsafe-eval' in production CSP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const rules = await getHeaderRules();
    const allRule = findRule(rules, "/(.*)");
    const cspValue = getHeader(allRule, "Content-Security-Policy");
    expect(cspValue).toBeDefined();
    expect(cspValue).toContain("'wasm-unsafe-eval'");
    expect(cspValue).not.toContain("'unsafe-eval'");
  });

  it("includes 'unsafe-eval' in development CSP for React's dev-mode debugging", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const rules = await getHeaderRules();
    const allRule = findRule(rules, "/(.*)");
    const cspValue = getHeader(allRule, "Content-Security-Policy");
    expect(cspValue).toBeDefined();
    expect(cspValue).toContain("'unsafe-eval'");
  });
});
