import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/edge-config", () => ({
  getFeatureFlags: vi.fn(),
  getAnnouncement: vi.fn(),
}));

import { GET } from "../config/route";
import { getFeatureFlags, getAnnouncement } from "@/lib/edge-config";

const mockGetFeatureFlags = vi.mocked(getFeatureFlags);
const mockGetAnnouncement = vi.mocked(getAnnouncement);

describe("GET /api/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns features and announcement on success", async () => {
    const features = { enableSharing: true, maintenanceMode: false };
    const announcement = { banner: "Planned maintenance tonight", bannerType: "warning" };

    mockGetFeatureFlags.mockResolvedValue(features);
    mockGetAnnouncement.mockResolvedValue(announcement);

    const response = await GET();
    const body = await response.json();

    expect(body.features).toEqual(features);
    expect(body.announcement).toEqual(announcement);
    expect(response.status).toBe(200);
  });

  it("returns defaults when edge-config throws", async () => {
    // Even when the underlying call throws, edge-config module itself
    // catches and returns defaults. Simulate that behavior.
    const defaults = {
      enableSharing: true,
      enableLeaderboards: true,
      enableEmulator: true,
      enableCitrine: false,
      enableMultiplayer: false,
      maintenanceMode: false,
    };
    const defaultAnnouncement = { banner: null, bannerType: "info" };

    mockGetFeatureFlags.mockResolvedValue(defaults);
    mockGetAnnouncement.mockResolvedValue(defaultAnnouncement);

    const response = await GET();
    const body = await response.json();

    expect(body.features).toEqual(defaults);
    expect(body.announcement).toEqual(defaultAnnouncement);
  });

  it("response has correct cache headers", async () => {
    mockGetFeatureFlags.mockResolvedValue({});
    mockGetAnnouncement.mockResolvedValue({ banner: null, bannerType: "info" });

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=30"
    );
  });

  it("returns safe defaults when an unexpected error occurs", async () => {
    mockGetFeatureFlags.mockRejectedValue(new Error("catastrophic"));
    mockGetAnnouncement.mockResolvedValue({ banner: null, bannerType: "info" });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.features).toEqual({});
    expect(body.announcement).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });
});
