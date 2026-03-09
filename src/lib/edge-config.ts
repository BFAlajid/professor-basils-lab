import { createClient } from "@vercel/edge-config";

const config = process.env.EDGE_CONFIG ? createClient(process.env.EDGE_CONFIG) : null;

// Default values if Edge Config is unavailable
const DEFAULT_FEATURES: Record<string, boolean> = {
  enableSharing: true,
  enableLeaderboards: true,
  enableEmulator: true,
  enableCitrine: false,
  enableMultiplayer: false,
  maintenanceMode: false,
};

export async function getFeatureFlag(key: string): Promise<boolean> {
  if (!config) return DEFAULT_FEATURES[key] ?? false;
  try {
    const val = await config.get<Record<string, boolean>>("features");
    return val?.[key] ?? DEFAULT_FEATURES[key] ?? false;
  } catch {
    return DEFAULT_FEATURES[key] ?? false;
  }
}

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  if (!config) return { ...DEFAULT_FEATURES };
  try {
    const val = await config.get<Record<string, boolean>>("features");
    return { ...DEFAULT_FEATURES, ...val };
  } catch {
    return { ...DEFAULT_FEATURES };
  }
}

export async function getAnnouncement(): Promise<{ banner: string | null; bannerType: string }> {
  if (!config) return { banner: null, bannerType: "info" };
  try {
    const val = await config.get<{ banner: string | null; bannerType: string }>("announcements");
    return val ?? { banner: null, bannerType: "info" };
  } catch {
    return { banner: null, bannerType: "info" };
  }
}
