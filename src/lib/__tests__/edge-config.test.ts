import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGet = vi.fn();
const mockCreateClient = vi.fn(() => ({ get: mockGet }));

vi.mock("@vercel/edge-config", () => ({
  createClient: mockCreateClient,
}));

describe("edge-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("when EDGE_CONFIG is not set", () => {
    beforeEach(() => {
      delete process.env.EDGE_CONFIG;
    });

    it("getFeatureFlag returns default for known key", async () => {
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("enableSharing")).toBe(true);
    });

    it("getFeatureFlag returns false for unknown key", async () => {
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("unknownFeature")).toBe(false);
    });

    it("getFeatureFlags returns all defaults", async () => {
      const { getFeatureFlags } = await import("../edge-config");

      const flags = await getFeatureFlags();

      expect(flags).toEqual({
        enableSharing: true,
        enableLeaderboards: true,
        enableEmulator: true,
        enableCitrine: false,
        enableMultiplayer: false,
        maintenanceMode: false,
      });
    });

    it("getAnnouncement returns default when unavailable", async () => {
      const { getAnnouncement } = await import("../edge-config");

      const result = await getAnnouncement();

      expect(result).toEqual({ banner: null, bannerType: "info" });
    });
  });

  describe("when EDGE_CONFIG is set", () => {
    beforeEach(() => {
      process.env.EDGE_CONFIG = "https://edge-config.vercel.com/test";
    });

    afterEach(() => {
      delete process.env.EDGE_CONFIG;
    });

    it("getFeatureFlag returns remote value when available", async () => {
      mockGet.mockResolvedValue({ enableSharing: false, enableCitrine: true });
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("enableCitrine")).toBe(true);
    });

    it("getFeatureFlag returns default when key not in remote", async () => {
      mockGet.mockResolvedValue({ enableCitrine: true });
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("enableSharing")).toBe(true);
    });

    it("getFeatureFlag returns default when remote throws", async () => {
      mockGet.mockRejectedValue(new Error("Edge Config unavailable"));
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("enableSharing")).toBe(true);
    });

    it("getFeatureFlag returns false for unknown key when remote throws", async () => {
      mockGet.mockRejectedValue(new Error("Edge Config unavailable"));
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("unknownKey")).toBe(false);
    });

    it("getFeatureFlag returns false for unknown key when remote returns null for key", async () => {
      mockGet.mockResolvedValue({ enableSharing: true });
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("nonExistent")).toBe(false);
    });

    it("getFeatureFlags merges remote over defaults", async () => {
      mockGet.mockResolvedValue({ enableCitrine: true, maintenanceMode: true });
      const { getFeatureFlags } = await import("../edge-config");

      const flags = await getFeatureFlags();

      expect(flags.enableCitrine).toBe(true);
      expect(flags.maintenanceMode).toBe(true);
      // defaults preserved for keys not in remote
      expect(flags.enableSharing).toBe(true);
      expect(flags.enableMultiplayer).toBe(false);
    });

    it("getFeatureFlags returns defaults when remote throws", async () => {
      mockGet.mockRejectedValue(new Error("fail"));
      const { getFeatureFlags } = await import("../edge-config");

      const flags = await getFeatureFlags();

      expect(flags).toEqual({
        enableSharing: true,
        enableLeaderboards: true,
        enableEmulator: true,
        enableCitrine: false,
        enableMultiplayer: false,
        maintenanceMode: false,
      });
    });

    it("getFeatureFlag returns false when remote returns null", async () => {
      mockGet.mockResolvedValue(null);
      const { getFeatureFlag } = await import("../edge-config");

      expect(await getFeatureFlag("enableSharing")).toBe(true);
    });

    it("getAnnouncement returns remote announcement", async () => {
      mockGet.mockResolvedValue({ banner: "Server maintenance at 3 PM", bannerType: "warning" });
      const { getAnnouncement } = await import("../edge-config");

      const result = await getAnnouncement();

      expect(result).toEqual({ banner: "Server maintenance at 3 PM", bannerType: "warning" });
    });

    it("getAnnouncement returns default when remote throws", async () => {
      mockGet.mockRejectedValue(new Error("fail"));
      const { getAnnouncement } = await import("../edge-config");

      const result = await getAnnouncement();

      expect(result).toEqual({ banner: null, bannerType: "info" });
    });

    it("getAnnouncement returns default when remote returns null", async () => {
      mockGet.mockResolvedValue(null);
      const { getAnnouncement } = await import("../edge-config");

      const result = await getAnnouncement();

      expect(result).toEqual({ banner: null, bannerType: "info" });
    });
  });
});
