"use client";

import { useState, useEffect } from "react";
import { silentWarn } from "@/utils/silentWarn";

interface FeatureFlagsState {
  features: Record<string, boolean>;
  announcement: { banner: string | null; bannerType: string };
  isLoading: boolean;
}

const DEFAULT_STATE: FeatureFlagsState = {
  features: {
    enableSharing: true,
    enableLeaderboards: true,
    enableEmulator: true,
    enableCitrine: false,
    enableMultiplayer: false,
    maintenanceMode: false,
  },
  announcement: { banner: null, bannerType: "info" },
  isLoading: true,
};

export function useFeatureFlags() {
  const [state, setState] = useState<FeatureFlagsState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setState({ features: data.features, announcement: data.announcement, isLoading: false });
        }
      } catch (e) {
        silentWarn("useFeatureFlags", e);
        if (!cancelled) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
